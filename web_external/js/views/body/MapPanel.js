minerva.views.MapPanel = minerva.View.extend({

    events: {
        'click .m-save-current-baselayer': function () {
            this.session.sessionJsonContents.center = this.map.center();
            this.session.sessionJsonContents.zoom = this.map.zoom();
            this.session.saveSession();
        }
    },

    transitionToMsa: function (msa) {
        if (_.has(this.boundingBoxes, msa)) {
            var add = function (a, b) {
                return a + b;
            };

            this.map.transition({
                center: {
                    x: _.reduce(this.boundingBoxes[msa][0], add) / 2,
                    y: _.reduce(this.boundingBoxes[msa][1], add) / 2
                },
                zoom: 8,
                duration: 1000
            });
        }
    },

    _specifyWmsDatasetLayer: function (dataset, layer) {
        var minervaMetadata = dataset.getMinervaMetadata();
        var baseUrl = minervaMetadata.base_url;
        if (minervaMetadata.hasOwnProperty('credentials')) {
            baseUrl = '/wms_proxy/' + encodeURIComponent(baseUrl) + '/' +
                minervaMetadata.credentials;
        }
        var layerName = minervaMetadata.type_name;
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
                    LAYERS: layerName,
                    STYLES: '',
                    BBOX: bbox_mercator,
                    WIDTH: 256,
                    HEIGHT: 256,
                    FORMAT: 'image/png',
                    TRANSPARENT: true,
                    SRS: projection,
                    TILED: true
                };
                return baseUrl + '?' + $.param(params);
            }
        );
    },

    esToggleClustering: function (evt) {
        if (this.esClustered) {
            this.esPointFeature.clustering(false);
            this.esClustered = false;
        } else {
            this.esPointFeature.clustering({radius: 0.0});
            this.esClustered = true;
        }

        this.map.draw();
    },

    _esMouseover: function (evt) {
        if (evt.data.__cluster) {
            console.log('Cluster containing ' + evt.data.__data.length + ' points.');
        } else {
            console.log(evt.data.properties);
        }
    },

    _esMouseclick: function (evt) {
        var ads;

        if (evt.data.__cluster) {
            ads = _.pluck(evt.data.__data, 'properties');
        } else {
            ads = [evt.data.properties];
        }

        // Each property of each ad is an array with 1 element.. do some normalizing
        ads = _.map(ads, function (f) {
            return _.object(_.keys(f),
                            _.map(_.values(f), _.first));
        });

        this.imagespacePanel().ads = ads;
        this.imagespacePanel().render();
    },

    imagespacePanel: function () {
        if (!this._imagespacePanel) {
            this._imagespacePanel = new minerva.views.ImagespacePanel({
                el: '.imagespacePanel',
                parentView: this
            });
        }

        return this._imagespacePanel;
    },

    _renderElasticDataset: function (datasetId) {
        this.dataset = this.collection.get(datasetId);
        this.data = JSON.parse(this.dataset.fileData);
        this.msa = this.dataset.get('meta').minerva.elastic_search_params.msa;
        this.esFeatureLayer = this.map.createLayer('feature', {
            renderer: 'vgl'
        });
        this.esPointFeature = this.esFeatureLayer.createFeature('point', {
            selectionAPI: true,
            dynamicDraw: true
        });
        this.esClustered = true;
        this.datasetLayers[datasetId] = this.esFeatureLayer;

        this.esPointFeature
            .clustering({radius: 0.0})
            .style({
                fillColor: 'black',
                fillOpacity: 0.65,
                stroke: false,
                radius: function (d) {
                    var baseRadius = 2;

                    if (d.__cluster) {
                        return baseRadius + Math.log10(d.__data.length);
                    }

                    return baseRadius;
                }
            })
            .position(function (d) {
                return {
                    x: d.geometry.coordinates[0],
                    y: d.geometry.coordinates[1]
                };
            })
            .geoOn(geo.event.feature.mouseover, this._esMouseover)
            .geoOn(geo.event.feature.mouseclick, _.bind(this._esMouseclick, this))
            .data(this.data.features);

        this.map.draw();

        this.transitionToMsa(this.msa);
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
                this.datasetLayers[datasetId] = layer;
                this._specifyWmsDatasetLayer(dataset, layer);

                this.legendWidget[datasetId] = new minerva.views.LegendWidget({
                    el: $('.m-map-legend-container'),
                    parentView: this,
                    id: datasetId,
                    legend: 'data:image/png;base64,' + dataset.getMinervaMetadata().legend
                });
                this.legendWidget[datasetId].render();
                this.legendWidget[datasetId].show();

                // Add the UI slider back
                this.uiLayer = this.map.createLayer('ui');
                this.uiLayer.createWidget('slider');
                this.map.draw();
            } else if (dataset.getDatasetType() === 'elasticsearch') {
                dataset.once('m:dataLoaded', _.bind(this._renderElasticDataset, this));
                dataset.loadData();
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
                        this.uiLayer.createWidget('slider');
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
        if (_.contains(['wms', 'elasticsearch'], dataset.getDatasetType()) && layer) {
            this.map.deleteLayer(layer);
        } else if (layer) {
            layer.clear();
            layer.draw();
        }
        delete this.datasetLayers[datasetId];
    },

    initialize: function (settings) {
        this.once('m:rendermap.after', _.bind(function () {
            var getBoundingBox = _.memoize(function(coordinates) {
                var minX = _.first(coordinates)[0],
                    maxX = minX,
                    minY = _.first(coordinates)[1],
                    maxY = minY;

                _.each(_.rest(coordinates), function(coordPair) {
                    minX = (minX < coordPair[0]) ? minX : coordPair[0];
                    maxX = (maxX > coordPair[0]) ? maxX : coordPair[0];
                    minY = (minY < coordPair[1]) ? minY : coordPair[1];
                    maxY = (maxY > coordPair[1]) ? maxY : coordPair[1];
                });

                return [
                    [minX, maxX],
                    [minY, maxY]
                ];
            });

            // @todo - this will never work on another machine
            girder.restRequest({
                type: 'GET',
                path: 'file/' + '5627fb65d2a733029f8d0ed0' + '/download'
            }).done(_.bind(function (resp) {
                this.boundingBoxes = {};

                _.each(resp, _.bind(function (geojson, msa) {
                    this.boundingBoxes[msa] = getBoundingBox(
                        geojson.features[0].geometry.coordinates[0]);
                }, this));
            }, this));
        }, this));

        this.session = settings.session;
        this.listenTo(this.session, 'm:mapUpdated', function () {
            // TODO for now only dealing with center
            if (this.map) {
                // TODO could better separate geojs needs from session storage
                this.map.center(this.session.sessionJsonContents.center);
            }
        });
        this.datasetLayers = {};
        this.legendWidget = {};

        this.collection = settings.collection;
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

        window.minerva_map = this;
    },

    renderMap: function () {
        if (!this.map) {
            this.map = geo.map({
                node: '.mapPanelMap',
                center: this.session.sessionJsonContents.center,
                zoom: this.session.sessionJsonContents.zoom
            });
            this.map.createLayer(this.session.sessionJsonContents.basemap);
            this.uiLayer = this.map.createLayer('ui');
            this.uiLayer.createWidget('slider');
            this.mapCreated = true;
            _.each(this.collection.models, function (dataset) {
                if (dataset.get('displayed')) {
                    this.addDataset(dataset);
                }
            }, this);
        }
        this.map.draw();

        this.trigger('m:rendermap.after', this);
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
