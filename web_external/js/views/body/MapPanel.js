minerva.views.MapPanel = minerva.views.Panel.extend({

    events: {
        'click .m-save-current-baselayer': function () {
            this.session.sessionJsonContents.center = this.map.center();
            this.session.sessionJsonContents.zoom = this.map.zoom();
            this.session.saveSession();
        }
    },

    changeLayerOpacity: function (dataset) {
        this.datasetLayers[dataset.id].mapOpacity(dataset.get('opacity'));
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

    _specifyWmsDatasetLayer: function (dataset, layer) {
        var minervaMetadata = dataset.metadata();
        layer.layerName = minervaMetadata.type_name;
        layer.baseUrl = minervaMetadata.base_url;
        if (minervaMetadata.hasOwnProperty('credentials')) {
            layer.baseUrl = '/wms_proxy/' + encodeURIComponent(layer.baseUrl) +
                    '/' + minervaMetadata.credentials;
        }
        var projection = 'EPSG:3857';
        layer.gcs(projection);
        layer.tileUrl(
            function (zoom, x, y) {
                var xLowerLeft = geo.mercator.tilex2long(x, zoom);
                var yLowerLeft = geo.mercator.tiley2lat(y + 1, zoom);
                var xUpperRight = geo.mercator.tilex2long(x + 1, zoom);
                var yUpperRight = geo.mercator.tiley2lat(y, zoom);

                var sw = geo.mercator.ll2m(xLowerLeft, yLowerLeft, true);
                var ne = geo.mercator.ll2m(xUpperRight, yUpperRight, true);
                var bbox_mercator = sw.x + ',' + sw.y + ',' + ne.x + ',' + ne.y;
                var params = {
                    SERVICE: 'WMS',
                    VERSION: '1.1.1',
                    REQUEST: 'GetMap',
                    LAYERS: layer.layerName,
                    STYLES: '',
                    BBOX: bbox_mercator,
                    WIDTH: 256,
                    HEIGHT: 256,
                    FORMAT: 'image/png',
                    TRANSPARENT: true,
                    SRS: projection,
                    TILED: true
                };
                return layer.baseUrl + '?' + $.param(params);
            }
        );
    },

    addDataset: function (dataset) {
        // TODO HACK
        // deleting and re-adding ui layer to keep it on top
        //this.map.deleteLayer(this.uiLayer);
        // this causes a problem when there are at least two feature layers,
        // so for now it is commented out
        // this means we keep re-adding the ui layer each time a dataset is
        // added as a feature layer, which is even more of a HACK
        if (!_.contains(this.datasetLayers, dataset.id)) {
            if (dataset.getDatasetType() === 'wms') {
                var datasetId = dataset.id;
                var layer = this.map.createLayer('osm', {attribution: null});
                // Set the layer opacity
                layer.mapOpacity(dataset.get('opacity'));

                this.datasetLayers[datasetId] = layer;
                this._specifyWmsDatasetLayer(dataset, layer);

                this.legendWidget[datasetId] = new minerva.views.LegendWidget({
                    el: $('.m-map-legend-container'),
                    parentView: this,
                    id: datasetId,
                    legend: 'data:image/png;base64,' + dataset.metadata().legend
                });
                this.legendWidget[datasetId].render();
                this.legendWidget[datasetId].show();

                if (this.map.featureInfoWidget) {
                    this.map.featureInfoWidget.layers.push(layer);
                } else {
                    this.map.featureInfoWidget =
                        new minerva.views.WmsFeatureInfoWidget({
                            map: this.map,
                            version: '1.1.1',
                            layers: [layer],
                            callback: 'getLayerFeatures',
                            session: this.model,
                            parentView: this
                        });
                    this.map.featureInfoWidget.setElement($('#m-map-panel')).render();
                    this.map.geoOn(geo.event.mouseclick, function (evt) {
                        this.featureInfoWidget.content = '';
                        this.featureInfoWidget.callInfo(0, evt.geo);
                    });
                }
                this.uiLayer = this.map.createLayer('ui');
                this.map.draw();
            } else {
                // Assume the dataset provides a reader, so load the data
                // and adapt the dataset to the map with the reader.
                dataset.once('m:dataLoaded', function (datasetId) {
                    // TODO: allow these datasets to specify a legend.
                    var dataset = this.collection.get(datasetId);
                    var layer = this.map.createLayer('feature');

                    var reader = geo.createFileReader(dataset.geoFileReader, {layer: layer});
                    this.datasetLayers[datasetId] = layer;

                    layer.clear();

                    reader.read(dataset.fileData, _.bind(function () {
                        // Add the UI slider back
                        this.uiLayer = this.map.createLayer('ui');
                        this.map.draw();
                    }, this));
                }, this);

                dataset.loadData();
            }
        }
    },

    removeDataset: function (dataset) {
        var datasetId = dataset.id;
        var layer = this.datasetLayers[datasetId];
        if (_.has(this.legendWidget, datasetId)) {
            this.legendWidget[datasetId].remove(datasetId);
            delete this.legendWidget[datasetId];
        }
        if (dataset.getDatasetType() === 'wms' && layer) {
            this.map.deleteLayer(layer);
            if (this.map.featureInfoWidget) {
                var layerIndex = $.inArray(layer,
                    this.map.featureInfoWidget.layers);
                if (layerIndex > -1) {
                    this.map.featureInfoWidget.layers.splice(layerIndex, 1);
                }
            }
        } else if (layer) {
            layer.clear();
            layer.draw();
        }
        delete this.datasetLayers[datasetId];
    },

    initialize: function (settings) {
        _.extend(this.events, minerva.views.Panel.prototype.events);
        this.session = settings.session.model;
        this.listenTo(this.session, 'm:mapUpdated', function () {
            // TODO for now only dealing with center
            if (this.map) {
                // TODO could better separate geojs needs from session storage
                this.map.center(this.session.sessionJsonContents.center);
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
    },

    renderMap: function () {
        if (!this.map) {
            this.map = geo.map({
                node: '.m-map-panel-map',
                center: this.session.sessionJsonContents.center,
                zoom: this.session.sessionJsonContents.zoom,
                interactor: geo.mapInteractor({
                    map: this.map,
                    click: {
                        enabled: true,
                        cancelOnMove: true
                    }
                })
            });
            this.map.createLayer(this.session.sessionJsonContents.basemap,
                                 _.has(this.session.sessionJsonContents, 'basemap_args') ?
                                 this.session.sessionJsonContents.basemap_args : {});
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
