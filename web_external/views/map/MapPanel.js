import _ from 'underscore';
import geo from 'geojs';
import colorbrewer from 'colorbrewer';
import bootbox from 'bootbox';

import events from '../../events';
import Panel from '../body/Panel';
import registry from '../adapters/registry';
import FeatureInfoWidget from '../widgets/FeatureInfoWidget';
import template from '../../templates/body/mapPanel.pug';
import '../../stylesheets/body/mapPanel.styl';

const MapPanel = Panel.extend({

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

    changeLayerZIndex: function (dataset, move) {
        var baseMapZIndex = 1;
        this.datasetLayerReprs[dataset.id]['geoJsLayer'][move]();
        // TODO: HACK MoveToBottom method will set the layer's index to 0 and put it under the base map.
        // Calling moveUp(1) to place it on top of base map
        if (move === 'moveToBottom') {
            this.datasetLayerReprs[dataset.id]['geoJsLayer'].moveUp(baseMapZIndex);
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

    addColorLegendCategories: function (categories) {
        this.colorLegend.addCategories(categories);
    },

    removeColorLegendCategories: function (categories) {
        this.colorLegend.removeCategories(categories);
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
            var interactorOpts = this.map.interactor().options();
            interactorOpts.keyboard.focusHighlight = false;
            this.map.interactor().options(interactorOpts);
            this.map.createLayer(mapSettings.basemap,
                _.has(mapSettings, 'basemap_args')
                    ? mapSettings.basemap_args
                    : {});
            this.uiLayer = this.map.createLayer('ui');
            this.uiLayer.createWidget('slider', { position: { right: 20, bottom: 30 } });
            this.colorLegend = this.uiLayer.createWidget('colorLegend', {
                position: {
                    right: 10,
                    top: 45
                }
            });
            this.mapCreated = true;
            _.each(this.collection.models, function (dataset) {
                if (dataset.get('displayed')) {
                    this.addDataset(dataset);
                }
            }, this);
            this.map.featureInfoWidget =
                new FeatureInfoWidget({
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
                this.featureInfoWidget.callInfo(evt);
            });
        }
        this.map.draw();
    },

    // << MapContainer Interface

    /**
     * Async function to add the passed in dataset to the current map as a rendered layer,
     * will set the 'geoError' property to be true if there is a rendering error.
     *
     * @param {DatasetModel} dataset - The dataset to be rendered
     * @param {string} layerType - The type of map visualization used to render the dataset
     * @param {Object} visProperties - Properties used to render the dataset as a layerType
     */
    addDataset: function (dataset, layerType, visProperties) {
        if (!dataset.metadata()) {
            return;
        }

        if (!_.contains(this.datasetLayerReprs, dataset.get('_id'))) {
            // For now, get the layerType directly from the dataset,
            // but we should really allow the user to specify the desired
            // layerType.
            layerType = dataset.getMinervaMetadata().adapter || dataset.getGeoRenderType();

            // If visProperties is not provided, check for properties stored in the metadata.
            if (!visProperties) {
                visProperties = (dataset.getMinervaMetadata() || {}).visProperties || {};
            }

            this._renderDataset(dataset, layerType, visProperties);

            this.listenTo(dataset, 'm:dataset_config_change', () => {
                var currentZIndex = this.datasetLayerReprs[dataset.id]['geoJsLayer'].zIndex();
                this.removeDataset(dataset);
                let visProperties = (dataset.getMinervaMetadata() || {}).visProperties || {};
                this.addDataset(dataset, layerType, visProperties);
                this.datasetLayerReprs[dataset.id]['geoJsLayer'].zIndex(currentZIndex);
            });
        }
    },

    _renderDataset(dataset, layerType, visProperties) {
        dataset.once('m:map_adapter_layerCreated', function (repr) {
            this.datasetLayerReprs[dataset.get('_id')] = repr;
            repr.render(this);
        }, this).once('m:map_adapter_error', function (dataset, layerType) {
            dataset.set('geoError', true);
        }, this).once('m:map_adapter_layerError', function (repr) {
            if (repr) {
                repr.delete(this);
                dataset.set('geoError', true);
            }
        }, this);
        registry._createRepresentation(this, dataset, layerType, visProperties);
    },

    /**
     * Remove a rendered dataset from the current map.
     */
    removeDataset: function (dataset) {
        this.stopListening(dataset);
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
        this.showBoundsDatasetLabel = false;
        this.listenTo(this.session, 'm:mapUpdated', function () {
            // TODO for now only dealing with center
            if (this.map) {
                // TODO could better separate geojs needs from session storage
                this.map.center(this.session.metadata().map.center);
            }
        });
        this.datasetLayerReprs = {};

        this.collection = settings.session.datasetCollection;
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

        this.listenTo(this.collection, 'reorder', function (dataset, move) {
            if (this.mapCreated) {
                this.changeLayerZIndex(dataset, move);
            }
        }, this);

        this.listenTo(events, 'm:request-show-bounds', (datasetAndBounds) => {
            this.removeDatasetBounds();
            this.datasetAndBounds = datasetAndBounds;
            this.drawDatasetBounds();
        });

        this.listenTo(events, 'm:request-remove-bounds', () => {
            this.datasetAndBounds = null;
            this.removeDatasetBounds();
        });

        this.listenTo(events, 'm:toggle-bounds-label', () => {
            this.showBoundsDatasetLabel = !this.showBoundsDatasetLabel;
            this.removeDatasetBounds();
            this.drawDatasetBounds();
        });

        this.listenTo(events, 'm:zoom-to', ({ dataset, bounds }) => {
            var { center, zoom } = this.map.zoomAndCenterFromBounds({
                left: bounds.ulx,
                right: bounds.lrx,
                top: bounds.uly,
                bottom: bounds.lry
            });
            this.map.zoom(zoom);
            this.map.center(center);
        });

        this.listenTo(events, 'm:draw-boundary-dataset', () => {
            if (!this.drawDatasetLayer) {
                var layer = this.map.createLayer('annotation', {
                    annotations: ['rectangle'],
                    showLabels: false
                });
                layer.geoOn(geo.event.annotation.state, (e) => {
                    var prompt = bootbox.prompt({
                        title: 'Boundary dataset name',
                        value: 'Boundary',
                        callback: (name) => {
                            if (name !== null) {
                                events.trigger('m:dataset-drawn', name, layer.geojson().features[0].geometry);
                            }
                            layer.removeAllAnnotations();
                        }
                    });
                    prompt.find('.bootbox-body input').attr('maxlength', '250');
                });
                layer.geoOn(geo.event.annotation.mode, (e) => {
                    events.trigger('m:map-drawing-change', e.mode === 'rectangle');
                });
                this.drawDatasetLayer = layer;
            }
            this.drawDatasetLayer.mode('rectangle');
            // focus the map so user could immediately press esc to exit rectangle creating mode
            this.$('.geojs-map').focus();
        });

        this.listenTo(events, 'm:stop-draw-boundary-dataset', () => {
            if (this.drawDatasetLayer) {
                this.drawDatasetLayer.mode(null);
            }
        });

        Panel.prototype.initialize.apply(this);
    },

    drawDatasetBounds() {
        this.boundariesAnnotationLayer = this.map.createLayer('annotation', {
            annotations: ['rectangle'],
            showLabels: this.showBoundsDatasetLabel
        });
        var i = 0;
        var features = this.datasetAndBounds.map(({ dataset, bounds }) => {
            var color = colorbrewer.Set1[9][i++ % 9];
            return {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [bounds.lrx, bounds.lry],
                        [bounds.ulx, bounds.lry],
                        [bounds.ulx, bounds.uly],
                        [bounds.lrx, bounds.uly],
                        [bounds.lrx, bounds.lry]
                    ]]
                },
                properties: {
                    annotationType: 'rectangle',
                    name: dataset.get('name'),
                    labelFontWeight: 'bold',
                    labelColor: '#444444',
                    labelShadowColor: '#FFFFFF',
                    labelShadowBlur: 9,
                    fill: true,
                    fillColor: color,
                    fillOpacity: 0.3,
                    stroke: true,
                    strokeColor: '#666666',
                    strokeOpacity: 1,
                    strokeWidth: 1
                }
            };
        });
        this.boundariesAnnotationLayer.geojson({
            'type': 'FeatureCollection',
            'features': features
        });
    },

    removeDatasetBounds() {
        if (this.boundariesAnnotationLayer) {
            this.boundariesAnnotationLayer.removeAllAnnotations();
            this.map.deleteLayer(this.boundariesAnnotationLayer);
            this.boundariesAnnotationLayer = null;
        }
    },

    render: function () {
        this.$el.html(template({}));
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
export default MapPanel;
