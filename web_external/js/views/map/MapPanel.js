minerva.views.MapPanel = minerva.views.Panel.extend({

    events: {
        'click .m-save-current-baselayer': function () {
            this.session.metadata().map.center = this.map.center();
            this.session.metadata().map.zoom = this.map.zoom();
            this.session.saveSession();
        }
    },

    changeLayerOpacity: function (dataset) {
        // TODO ideally move opacity from the Dataset to the Layer.

        var layerRepr = this.datasetLayerReprs[dataset.get('_id')];

        if (dataset.get('visible')) {
            layerRepr.setOpacity(dataset.get('opacity'));
        } else {
            layerRepr.setOpacity(0.0);
        }
    },

    changeLayerZIndex: function (dataset) {
        var baseMapZIndex = 1;
        if (dataset.get('order')) {
            this.datasetLayerReprs[dataset.id][dataset.get('order')]();
        }
        // TODO: HACK MoveToBottom method will set the layer's index to 0 and put it under the base map.
        // Calling moveUp(1) to place it on top of base map
        if (dataset.get('order') === 'moveToBottom') {
            this.datasetLayerReprs[dataset.id].moveUp(baseMapZIndex);
        }
        this.map.draw();
    },

    // MapContainer Interface >>
    // These functions are an interface for a MapContainer that may be
    // separable in the future from this MapPanel, and can be called
    // by an Adapter.

    /**
     * Deletes the passed in layer from the map.
     *
     * @param {geo.layer} geoLayer - GeoJs layer assumed to be included
     * in the current GeoJs map owned by this MapContainer.
     */
    deleteLayer: function (geoLayer) {
        this.map.deleteLayer(geoLayer);
    },

    /**
     * Creates a new GeoJs layer from the current GeoJs map owned by this
     * MapContainer, of the requested type, passing in the properties object.
     *
     * @param {string} geoLayerType - type of GeoJs layer to be created
     * @param {Object} [properties] - GeoJs layer properties to be passed upon
     * construction of the GeoJs layer
     * @returns {geo.layer}
     */
    createLayer: function (geoLayerType, properties) {
        return this.map.createLayer(geoLayerType, properties || {});
    },

    /**
     * Accessor for the MapContainer's Backbone view.
     *
     * @returns {Backbone.View}
     */
    getMapView: function () {
        return this;
    },

    /**
     * Adds the passed in GeoJs layer as a layer of interest for the
     * FeatureInfoWidget owned by this MapContainer.
     *
     * @param {geo.layer} layer - The GeoJs layer to have info displayed about
     * it in by the FeatureInfoWidget.
     */
    addFeatureInfoLayer: function (layer) {
        if (this.map && this.map.featureInfoWidget) {
            this.map.featureInfoWidget.layers.push(layer);
        } else {
            console.error('Attempting to addFeatureInfoLayer, but widget uninitialized');
        }
    },

    /**
     * Render the GeoJs map owned by this MapContainer, which will render all of the
     * map's layers.
     */
    renderMap: function () {
        if (!this.map) {
            var mapSettings = this.session.metadata().map;
            this.map = geo.map({
                node: '.m-map-panel-map',
                center: mapSettings.center,
                zoom: mapSettings.zoom,
                interactor: geo.mapInteractor({
                    map: this.map,
                    click: {
                        enabled: true,
                        cancelOnMove: true
                    }
                })
            });
            this.map.createLayer(mapSettings.basemap,
                                 _.has(mapSettings, 'basemap_args')
                                 ? mapSettings.basemap_args : {});
            this.uiLayer = this.map.createLayer('ui');
            this.mapCreated = true;
            _.each(this.collection.models, function (dataset) {
                if (dataset.get('displayed')) {
                    this.addDataset(dataset);
                }
            }, this);
            this.map.featureInfoWidget =
                new minerva.views.WmsFeatureInfoWidget({
                    map: this.map,
                    version: '1.1.1',
                    layers: [],
                    callback: 'getLayerFeatures',
                    session: this.session,
                    parentView: this
                });
            this.map.featureInfoWidget.setElement($('#m-map-panel')).render();
            this.map.geoOn(geo.event.mouseclick, function (evt) {
                this.featureInfoWidget.content = '';
                this.featureInfoWidget.callInfo(0, evt.geo);
            });
        }
        this.map.draw();
    },

    // << MapContainer Interface

    /**
     * Async function to add the passed in dataset to the current map as a rendered layer,
     * will set the 'geoError' property to be true if there is a rendering error.
     *
     * @param {minerva.models.DatasetModel} dataset - The dataset to be rendered
     * @param {string} layerType - The type of map visualization used to render the dataset
     * @param {Object} visProperties - Properties used to render the dataset as a layerType
     */
    addDataset: function (dataset, layerType, visProperties) {
        if (!dataset.metadata()) {
            return;
        }
        var datasetId = dataset.get('_id');

        if (!_.contains(this.datasetLayerReprs, datasetId)) {
            // For now, get the layerType directly from the dataset,
            // but we should really allow the user to specify the desired
            // layerType.
            layerType = dataset.getMinervaMetadata().adapter || dataset.getGeoRenderType();

            // If visProperties is not provided, check for properties stored in the metadata.
            if (!visProperties) {
                visProperties = (dataset.getMinervaMetadata() || {}).visProperties || {};
            }

            minerva.core.AdapterRegistry.once('m:map_adapter_layerCreated', function (repr) {
                this.datasetLayerReprs[datasetId] = repr;
                repr.render(this);
            }, this).once('m:map_adapter_error', function (dataset, layerType) {
                dataset.set('geoError', true);
            }, this).once('m:map_adapter_layerError', function (repr) {
                if (repr) {
                    repr.delete(this);
                    dataset.set('geoError', true);
                }
            }, this)._createRepresentation(this, dataset, layerType, visProperties);
        }
    },

    /**
     * Remove a rendered dataset from the current map.
     */
    removeDataset: function (dataset) {
        var datasetId = dataset.get('_id');
        var layerRepr = this.datasetLayerReprs[datasetId];
        if (layerRepr) {
            if (this.map.featureInfoWidget) {
                var layerIndex = $.inArray(layerRepr.geoJsLayer,
                    this.map.featureInfoWidget.layers);
                if (layerIndex > -1) {
                    this.map.featureInfoWidget.layers.splice(layerIndex, 1);
                }
            }
            layerRepr.delete(this);
            this.map.draw();
        }
        delete this.datasetLayerReprs[datasetId];
    },

    initialize: function (settings) {
        this.session = settings.session.model;
        this.listenTo(this.session, 'm:mapUpdated', function () {
            // TODO for now only dealing with center
            if (this.map) {
                // TODO could better separate geojs needs from session storage
                this.map.center(this.session.metadata().map.center);
            }
        });
        this.datasetLayerReprs = {};
        this.legendWidget = {};

        this.collection = settings.session.datasetsCollection;
        this.listenTo(this.collection, 'change:displayed', function (dataset) {
            // There is a slight danger of a user trying to add a dataset
            // to a session while the map is not yet created.  If the map isn't
            // created, we don't need to add/remove the datasets here because
            // they will be taken care of in the renderMap initialization block.
            if (this.mapCreated) {
                if (dataset.get('displayed')) {
                    this.addDataset(dataset);
                } else {
                    this.removeDataset(dataset);
                }
            }
        }, this);

        /* TODO: add an event handler like this:

            this.listenTo(this.collection, 'change:visProperties', function (dataset) {
                // rerender the layer
            });

          For now, it is unnecessary because the only way to change the visProperties
          for a dataset in the UI is through the configuration menu present when the
          dataset is *not* rendered.
        */

        this.listenTo(this.collection, 'change:opacity', function (dataset) {
            if (this.mapCreated) {
                this.changeLayerOpacity(dataset);
            }
        }, this);

        this.listenTo(this.collection, 'change:visible', function (dataset) {
            if (this.mapCreated) {
                this.changeLayerOpacity(dataset);
            }
        }, this);

        this.listenTo(this.collection, 'change:order', function (dataset) {
            if (this.mapCreated) {
                this.changeLayerZIndex(dataset);
            }
        }, this);

        minerva.views.Panel.prototype.initialize.apply(this);
    },

    render: function () {
        this.$el.html(minerva.templates.mapPanel({}));
        this.renderMap();
        var tooltipProperties = {
            placement: 'left',
            delay: 400,
            container: this.$el,
            trigger: 'hover'
        };
        this.$('.m-save-current-baselayer').tooltip(tooltipProperties);
        return this;
    }
});
