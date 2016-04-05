minerva.core = minerva.core || {};

(function () {
    function AdapterRegistry() {
        this.registry = {};
        this.register = function (type, definition) {
            this.registry[type] = definition;
        };
        this._createRepresentation = function (container, dataset, layerType, mapping) {
            if (layerType === null || !_.has(this.registry, layerType)) {
                console.error('This dataset cannot be adapted to a map layer of type [' + layerType + '].');
                this.trigger('m:map_adapter_error', dataset, layerType);
                return;
            } else {
                var adapter = this.registry[layerType];
                var layerRepr = _.extend(new adapter(), Backbone.Events);
                dataset.once('m:dataset_geo_dataLoaded', function () {
                    layerRepr.once('m:map_layer_renderable', function (layer) {
                        this.trigger('m:map_adapter_layerCreated', layer);
                    }, this).once('m:map_layer_error', function (layer) {
                        this.trigger('m:map_adapter_layerError', layer);
                    }, this).initLayer(container, dataset, dataset.get('geoData'), mapping);
                }, this).loadGeoData();
                //
                // Instead of dataset.loadGeoData, ideally something like
                // girder.RestRequest({
                //     type: "POST"
                //     url: "adapter/" + dataset._id + "/" + layerType.toString()(),
                //     params: userInput,
                // }).success(function (data){
                //     createLayer
                // });
            }
        };
    }
    minerva.core.AdapterRegistry = _.extend(new AdapterRegistry(), Backbone.Events);
})();

minerva.rendering = minerva.rendering || {};
minerva.rendering.geo = minerva.rendering || {};
minerva.rendering.geo.defineMapLayer = function (layerType, layerDefinition, parentDefinition) {
    if (parentDefinition) {
        layerDefinition.prototype = new parentDefinition();
    }
    minerva.core.AdapterRegistry.register(layerType, layerDefinition);
    return layerDefinition;
}

minerva.rendering.geo.MapRepresentation = minerva.rendering.geo.defineMapLayer('map', function () {
    this.deleteLayer = function (container) {
        container.deleteLayer(this.geoJsLayer);
    },

    this.setOpacity = function (opacity) {
        this.geoJsLayer.opacity(opacity);
    },

    this.render = function (container) {
        container.renderMap();
    },

    this.readerType = 'jsonReader',

    this.initLayer = function (mapContainer, dataset, data, visProperties) {
        this.geoJsLayer = mapContainer.createLayer('feature');
        try {
            var reader = geo.createFileReader(this.readerType, {layer: this.geoJsLayer});
            reader.read(data, _.bind(function () {
                this.trigger('m:map_layer_renderable', this);
            }, this));
        } catch (err) {
            console.error('This layer cannot be rendered to the map');
            console.error(err);
            this.trigger('m:map_layer_error', this);
        }
    }
});

minerva.rendering.geo.GeometryRepresentation = minerva.rendering.geo.defineMapLayer('geojson', function () {
    /**
     * Temporary method that mutates a geojson data object to get around geojs limitations.
     * Returns an object containing arrays of `point`, `line`, and `polygon` geometries.
     * @private
     */
    function flattenFeatures(data) {
        if (_.isString(data)) {
            data = JSON.parse(data);
        }
        if (data.type !== 'FeatureCollection') {
            throw new Error('Unsupported GeoJSON type');
        }

        var geoms = _.chain(data.features || [])
            .where({type: 'Feature'})
            .pluck('geometry')
            .map(function (geom) {
                // mutate polygon features into line features to avoid slow triangulation
                geom = geom || {};
                if (geom.type === 'Polygon') {
                    geom.type = 'MultiLineString';
                    geom.coordinates = geom.coordinates;
                } else if (geom.type === 'MultiPolygon') {
                    geom.type = 'MultiLineString';
                    geom.coordinates = _.flatten(geom.coordinates, true);

                // transform Lines into MultiLines
                } else if (geom.type === 'LineString') {
                    geom.type = 'MultiLineString';
                    geom.coordinates = [geom.coordinates];

                // transform points in to multipoints
                } else if (geom.type === 'Point') {
                    geom.type = 'MultiPoint';
                    geom.coordinates = [geom.coordinates];
                }

                return geom;
            })
            .groupBy('type')
            .value();

       function flatten(geom) {
            return _.chain(geom || [])
                .pluck('coordinates')
                .flatten(true)
                .value();
       }
       return {
           points: flatten(geoms.MultiPoint),
           lines: flatten(geoms.MultiLineString),
           polygons: flatten(geoms.MultiPolygon)
       }
    }

    function position(d) {
        return {
            x: d[0],
            y: d[1],
            z: d[2] || 0
        };
    }

    this.initLayer = function (mapContainer, dataset, data, visProperties) {

        this.geoJsLayer = mapContainer.createLayer('feature');
        try {
            data = flattenFeatures(data);

            if (data.points.length) {
                this.geoJsLayer.createFeature('point')
                    .position(position)
                    .style({
                        fillColor: 'red',
                        strokeColor: 'black'
                    })
                    .data(data.points);
            }

            if (data.lines.length) {
                this.geoJsLayer.createFeature('line')
                    .position(position)
                    .style({
                        strokeColor: 'black'
                    })
                    .data(data.lines);
            }

            // TODO:
            // polygon = this.geoJsLayer.createFeature('polygon');


            this.trigger('m:map_layer_renderable', this);
        } catch (err) {
            console.error('This layer cannot be rendered to the map');
            console.error(err);
            this.trigger('m:map_layer_error', this);
        }
    }
}, minerva.rendering.geo.MapRepresentation);

minerva.rendering.geo.ContourRepresentation = minerva.rendering.geo.defineMapLayer('contour', function () {
    this.readerType = 'contourJsonReader'
}, minerva.rendering.geo.MapRepresentation);

minerva.rendering.geo.ChoroplethRepresentation = minerva.rendering.geo.defineMapLayer('choropleth', function () {
    this.initLayer = function (container, dataset, jsonData, visProperties) {
        // Set the visProperties from the dataset, though they should come from visProperties.
        visProperties.colorByValue = dataset.getMinervaMetadata().colorByValue;
        visProperties.colorScheme = dataset.getMinervaMetadata().colorScheme;

        this.geoJsLayer = container.createLayer('feature');
        var data = [];
        var colorByValue = visProperties.colorByValue;
        var colorScheme = visProperties.colorScheme;

        var polygon = this.geoJsLayer.createFeature('polygon', {selectionAPI: true});
        // Loop through the data and transform multipolygons into
        // arrays of polygons.  Note: it would also be possible
        // to generate a polygon feature for each polygon/multipolygon
        // geometry in the geojson, but this would (1) inefficient, and
        // (2) make handling mouse events much more difficult.
        JSON.parse(jsonData).features.forEach(function (f) {
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

        var value = function (_a, _b, d) {
            return (d || {}).properties[visProperties.colorByValue] || 0;
        };

        // the data extent
        var extent = d3.extent(data, function (d) {
            return d.properties[visProperties.colorByValue];
        });

        // generate the color scale
        var domain = [extent[0], 0.5 * (extent[0] + extent[1]), extent[1]];
        var scale = d3.scale.linear()
            .domain(domain)
            .range(colorbrewer[visProperties.colorScheme][3]);

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
        }).data(data);

        var clickInfo = new minerva.models.ClickInfoModel();

        polygon.geoOn(geo.event.feature.mouseclick, _.bind(function (d) {
            clickInfo.set({
                layer: this.geoJsLayer,
                dataset: dataset,
                mouse: d.mouse,
                datum: d.data.properties
            });

            if (!this.clickInfoWidget) {
                this.clickInfoWidget = new minerva.views.ClickInfoWidget({
                    model: clickInfo,
                    parentView: container.getMapView()
                });
            }
        }, this));
        this.trigger('m:map_layer_renderable', this);
    }
}, minerva.rendering.geo.MapRepresentation);


minerva.rendering.geo.WmsRepresentation = minerva.rendering.geo.defineMapLayer('wms', function () {

    this.initLayer = function (container, dataset, jsonData, visProperties) {
        this.geoJsLayer = container.createLayer('osm', {
                              attribution: null,
                              keepLower: false
                          });
        container.addFeatureInfoLayer(this.geoJsLayer);
        var minervaMetadata = dataset.metadata();
        this.geoJsLayer.layerName = minervaMetadata.type_name;
        this.geoJsLayer.baseUrl = '/wms_proxy/' + encodeURIComponent(minervaMetadata.base_url);
        var projection = 'EPSG:3857';
        this.geoJsLayer.url(
            _.bind(function (x, y, zoom) {
                var bb = this.geoJsLayer.gcsTileBounds({x: x, y: y, level: zoom}, projection);
                var bbox_mercator = bb.left + ',' + bb.bottom + ',' + bb.right + ',' + bb.top;
                var params = {
                    SERVICE: 'WMS',
                    VERSION: '1.1.1',
                    REQUEST: 'GetMap',
                    LAYERS: this.geoJsLayer.layerName,
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
                return this.geoJsLayer.baseUrl + '?' + $.param(params);
            }, this)
        );
        this.trigger('m:map_layer_renderable', this);
    }

}, minerva.rendering.geo.MapRepresentation);
