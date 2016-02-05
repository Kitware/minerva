minerva.views.MapPanel = minerva.views.Panel.extend({

    events: {
        'click .m-save-current-baselayer': function () {
            this.session.sessionJsonContents.center = this.map.center();
            this.session.sessionJsonContents.zoom = this.map.zoom();
            this.session.saveSession();
        }
    },

    /**
     * List of supported GeoJs rendering types.
     * @type {Array.<string>}
     * @readonly
     */
    GEOJS_RENDER_TYPES: ['choropleth', 'geojson', 'contour', 'wms'],

    /**
     * Mapping of supported GeoJs rendering types to file reader types,
     * for those rendering types with file readers.
     * @type {Object.<string, string>}
     * @readonly
     */
    GEOJS_RENDER_TYPES_FILEREADER: {
        'geojson': 'jsonReader',
        'contour': 'contourJsonReader'
    },

    changeLayerOpacity: function (dataset) {
        var layer = this.datasetLayers[dataset.get('_id')];
        layer.opacity(dataset.get('opacity'));
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
        layer.baseUrl = '/wms_proxy/' + encodeURIComponent(minervaMetadata.base_url);
        var projection = 'EPSG:3857';
        layer.url(
            function (x, y, zoom) {
                var bb = layer.gcsTileBounds({x: x, y: y, level: zoom}, projection);
                var bbox_mercator = bb.left + ',' + bb.bottom + ',' + bb.right + ',' + bb.top;
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
                if (minervaMetadata.hasOwnProperty('credentials')) {
                    params.minerva_credentials = minervaMetadata.credentials;
                }
                return layer.baseUrl + '?' + $.param(params);
            }
        );
    },

    // hacktastic choropleth rendering method
    _renderChoropleth: function (dataset, layer) {
        var data = [];
        var colorByValue = dataset.getMinervaMetadata().colorByValue;
        var colorScheme = dataset.getMinervaMetadata().colorScheme;
        var polygon = layer.createFeature('polygon', {selectionAPI: true});

        this.datasetLayers[dataset.id] = layer;

        // Loop through the data and transform multipolygons into
        // arrays of polygons.  Note: it would also be possible
        // to generate a polygon feature for each polygon/multipolygon
        // geometry in the geojson, but this would (1) inefficient, and
        // (2) make handling mouse events much more difficult.
        JSON.parse(dataset.get('geoData')).features.forEach(function (f) {
            if (f.geometry.type === 'Polygon') {
                data.push({
                    outer: f.geometry.coordinates[0],
                    inner: f.geometry.coordinates.slice(1),
                    properties: f.properties
                });
            } else if (f.geometry.type === 'MultiPolygon') {
                f.geometry.coordinates.forEach(function (p) {
                    // all of the split polygons share the same property object
                    data.push({
                        outer: p[0],
                        inner: p.slice(1),
                        properties: f.properties
                    });
                });
            }
        });

        // this is the value accessor for the choropleth
        var value = function (_a, _b, d) {
            return (d || {}).properties[colorByValue] || 0;
        };

        // the data extent
        var extent = d3.extent(data, function (d) {
            return d.properties[colorByValue];
        });

        // generate the color scale
        var domain = [extent[0], 0.5 * (extent[0] + extent[1]), extent[1]];
        var scale = d3.scale.linear()
            .domain(domain)
            .range(colorbrewer[colorScheme][3]);

        polygon.position(function (d) {
            return {
                x: d[0],
                y: d[1],
                z: d[2] || 0
            };
        }).style({
            fillColor: function () {
                var v = value.apply(value, arguments);
                var c = scale(v);
                c = geo.util.convertColor(c);
                return c;
            },
            // this is temporary... in GeoJS 0.6 we can set opacity per layer
            fillOpacity: 0.75
        }).data(data);

        var clickInfo = new minerva.models.ClickInfoModel();

        polygon.geoOn(geo.event.feature.mouseclick, _.bind(function (d) {
            clickInfo.set({
                layer: layer,
                dataset: dataset,
                mouse: d.mouse,
                datum: d.data.properties
            });

            if (!this.clickInfoWidget) {
                this.clickInfoWidget = new minerva.views.ClickInfoWidget({
                    model: clickInfo,
                    parentView: this
                });
            }
        }, this));

        this.map.draw();
    },

    /**
     * Add the passed in dataset to the current map as a rendered layer.
     *
     * @param {Object} DatasetModel or descendent.
     */
    addDataset: function (dataset) {
        if (!_.contains(this.datasetLayers, dataset.id)) {
            var renderType = dataset.getGeoRenderType();
            if (renderType === null || !_.contains(this.GEOJS_RENDER_TYPES, renderType)) {
                console.error('This dataset of render type [' + renderType + '] cannot be rendered to the map');
                dataset.set('geoError', true);
                return;
            } else if (renderType === 'wms') {
                var datasetId = dataset.id;
                var layer = this.map.createLayer('osm', {
                    attribution: null,
                    keepLower: false
                });
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
                this.map.draw();
            } else if (renderType === 'choropleth') {
                // hacktastic special handling of MMWR data
                dataset.once('minerva.dataset.geo.dataLoaded', _.bind(function () {
                    this._renderChoropleth(dataset, this.map.createLayer('feature'));
                }, this));
                dataset.loadGeoData();
            } else if (_.has(this.GEOJS_RENDER_TYPES_FILEREADER, renderType)) {
                // Load the data and adapt the dataset to the map with the reader.
                dataset.once('minerva.dataset.geo.dataLoaded', function () {
                    // TODO: allow these datasets to specify a legend.
                    var datasetId = dataset.get('_id');
                    var layer = this.map.createLayer('feature');
                    this.datasetLayers[datasetId] = layer;
                    try {
                        var reader = geo.createFileReader(this.GEOJS_RENDER_TYPES_FILEREADER[renderType], {layer: layer});
                        reader.read(dataset.get('geoData'), _.bind(function () {
                            this.map.draw();
                        }, this));
                    } catch (err) {
                        console.error('This dataset cannot be rendered to the map');
                        console.error(err);
                        dataset.set('geoError', true);
                        if (layer) {
                            layer.clear();
                        }
                        this.map.draw();
                    }
                }, this);
                dataset.loadGeoData();
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

        minerva.views.Panel.prototype.initialize.apply(this);
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
