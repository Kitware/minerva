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
        var layer = this.datasetLayers[dataset.get('_id')];
        layer.setOpacity(dataset.get('opacity'));
        this.map.draw();
    },

    changeLayerZIndex: function (dataset) {
        var baseMapZIndex = 1;
        if (dataset.get('order')) {
            this.datasetLayers[dataset.id][dataset.get('order')]();
        }
        // TODO: HACK MoveToBottom method will set the layer's index to 0 and put it under the base map.
        // Calling moveUp(1) to place it on top of base map
        if (dataset.get('order') === 'moveToBottom') {
            this.datasetLayers[dataset.id].moveUp(baseMapZIndex);
        }
        this.map.draw();
    },

    /**
     * TODO REDO
     * Add the passed in dataset to the current map as a rendered layer.
     *
     * @param {Object} DatasetModel or descendent.
     */
    addDataset: function (dataset) {
        if (!_.contains(this.datasetLayers, dataset.id)) {
            var renderType = dataset.getGeoRenderType();

            if (renderType === null || !_.has(minerva.views.MapAdapter, renderType)) {
                console.error('This dataset of render type [' + renderType + ']cannot be rendered to the map');
                return;
            } else {
                var mapAdapter = minerva.views.MapAdapter[renderType];
                // TODO addDataset maybe should take an adapter that wraps a dataset
                // or else provide the adapter properties to the mapAdapter
                // adapter properties are a "mapping" from a renderable type to a rendering
                // containing e.g. colorMap
                var adapter = {};
                var layer = mapAdapter.createMapLayer(dataset, adapter, this.map);
                layer.once('m:map_layer_renderable', function () {
                    var datasetId = layer.dataset.get('_id');
                    this.datasetLayers[datasetId] = layer;
                    this.map.draw();
                }, this).once('m:map_layer_renderError', function () {
                    this.map.deleteLayer(layer.geoJsLayer);
                }, this).renderable();

                // => MapLayerView
                // Something like
                //
                // var mapAdapter = minerva.views.MapAdapter[renderType];
                // var adapter = {colorMap: colorMap};
                // var mapLayerModel = mapAdapter.createMapLayerModel(dataset, adapter);
                // var mapLayerView = mapAdapter.createMapLayerView(mapLayerModel, this);
                // this.datasetLayers[dataset.get('_id')] = {
                //     model: mapLayerModel,
                //     view: mapLayerView
                // };
                // mapLayerModel.once('m:map_layer_renderable', function () {
                //    this.map.draw();
                //}, this).once('m:map_layer_renderError', function () {
                //    this.removeLayer(dataset.get('_id'));
                //}, this).renderable();
                //
                // Possibly even better would be to have
                // mapModel = new MapModel(mapLayerModelList)
                // new MapPanel(mapModel)
            }
        }
    },

    /** */
    removeDataset: function (dataset) {
        var datasetId = dataset.id;
        var layer = this.datasetLayers[datasetId];
        if (layer) {
            layer.deleteLayer(this.map);
        }
        delete this.datasetLayers[datasetId];
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
        this.datasetLayers = {};
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

        this.listenTo(this.collection, 'change:opacity', function (dataset) {
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
        }
        this.map.draw();
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
