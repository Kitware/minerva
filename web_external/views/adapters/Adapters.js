import _ from 'underscore';
import geo from 'geojs';
import * as d3 from 'd3';
import Backbone from 'backbone';
import colorbrewer from 'colorbrewer';

import ClickInfoWidget from '../widgets/ClickInfoWidget';
import ClickInfoModel from '../../models/ClickInfoModel';

import geojsonUtil from '../../geojsonUtil';

window.geo = geo;

var multibandTemplate = _.template('<?xml version="1.0" encoding="UTF-8"?><StyledLayerDescriptor version="1.0.0" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><NamedLayer><Name><%= typeName %></Name><UserStyle><Title>Style</Title><IsDefault>1</IsDefault><FeatureTypeStyle><Rule><RasterSymbolizer><Opacity>1.0</Opacity><ChannelSelection><RedChannel><SourceChannelName><%= redChannel %></SourceChannelName></RedChannel><GreenChannel><SourceChannelName><%= greenChannel %></SourceChannelName></GreenChannel><BlueChannel><SourceChannelName><%= blueChannel %></SourceChannelName></BlueChannel></ChannelSelection></RasterSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>');

var singlebandTemplate = _.template('<?xml version="1.0" encoding="UTF-8"?><StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.0.0" xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd"><NamedLayer><Name><%= typeName %></Name><UserStyle><Title>SLD Single Band</Title><IsDefault>1</IsDefault><FeatureTypeStyle><Rule><RasterSymbolizer><Opacity>1.0</Opacity><ChannelSelection><GrayChannel><SourceChannelName>1</SourceChannelName></GrayChannel></ChannelSelection><ColorMap extended="true"><ColorMapEntry color="#000000" opacity="0" quantity="<%= nodataMin %>" label="0"/><%= colorMapEntry %><ColorMapEntry color="#000000" opacity="0" quantity="<%= nodataMax %>" label="0"/></ColorMap></RasterSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>');

var polygonTemplate = _.template('<?xml version="1.0" encoding="UTF-8"?><StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.0.0" xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd"><NamedLayer><Name><%= typeName %></Name><UserStyle><Title>Polygon</Title><IsDefault>1</IsDefault><FeatureTypeStyle><Rule><PolygonSymbolizer><Fill><CssParameter name="fill"><ogc:Function name="Interpolate"><ogc:PropertyName><%= attribute %></ogc:PropertyName><%= colorValueMapping %><ogc:Literal>color</ogc:Literal></ogc:Function></CssParameter></Fill></PolygonSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>');

var pointTemplate = _.template('<?xml version="1.0" encoding="UTF-8"?><StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.0.0" xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd"><NamedLayer><Name><%= typeName %></Name><UserStyle><Title>Point</Title><IsDefault>1</IsDefault><FeatureTypeStyle><Rule><PointSymbolizer><Graphic><Mark><WellKnownName><%= marker %></WellKnownName><Fill><CssParameter name="fill"><ogc:Function name="Interpolate"><ogc:PropertyName><%= attribute %></ogc:PropertyName><%= colorValueMapping %><ogc:Literal>color</ogc:Literal></ogc:Function></CssParameter></Fill></Mark></Graphic></PointSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>');

var lineTemplate = _.template('<?xml version="1.0" encoding="UTF-8"?><StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.0.0" xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd"><NamedLayer><Name><%= typeName %></Name><UserStyle><Title>Line</Title><IsDefault>1</IsDefault><FeatureTypeStyle><Rule><LineSymbolizer><Stroke><CssParameter name="stroke"><ogc:Function name="Interpolate"><ogc:PropertyName><%= attribute %></ogc:PropertyName><%= colorValueMapping %><ogc:Literal>color</ogc:Literal></ogc:Function></CssParameter></Stroke></LineSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>');

function generateSequence(start, stop, count) {
    // Generates a sequence of numbers with the given
    // start, stop and count variables

    var sequence = [];
    var step = (stop - start) / (count - 1.0);
    for (var i = 0; i < count; i++) {
        sequence.push(parseFloat(start + i * step));
    }
    return sequence;
}

/**
 * Definition of the AdapterRegistry, which maps adapters types
 * to adapter defintions.
 */
function AdapterRegistry() {
    this.registry = {};

    /**
     * Register an adapter definition to a type name, overriding any existing
     * definition for that type name.
     *
     * @param {string} type - The type name of the adapter
     * @param {rendering.geo.MapRepresentation} definition - The definition of a GeoJs layer representation
     */
    this.register = function (type, definition) {
        this.registry[type] = definition;
    };

    /**
     * Async function to create a representation for the passed in dataset
     * of the desired layerType, to be rendered in the passed in MapContainer.
     *
     * @param {Object} container - An implementor of the MapContainer interface
     * @param {minerva.models.DatasetModel} dataset - The dataset to be rendered
     * @param {string} layerType - The type of map visualization used to render the dataset
     * @param {Object} visProperties - Properties used to render the dataset as a layerType
     * @fires 'm:map_adapter_layerCreated' event upon successful layer creation
     * @fires 'm:map_adapter_layerError' event upon an error creating the layer
     */
    this._createRepresentation = function (container, dataset, layerType, visProperties) {
        if (layerType === null || !_.has(this.registry, layerType)) {
            console.error('This dataset cannot be adapted to a map layer of type [' + layerType + '].');
            dataset.trigger('m:map_adapter_error', dataset, layerType);
        } else {
            var Adapter = this.registry[layerType];
            var layerRepr = _.extend(new Adapter(), Backbone.Events);
            dataset.once('m:dataset_geo_dataLoaded', function () {
                layerRepr.once('m:map_layer_renderable', function (layer) {
                    dataset.trigger('m:map_adapter_layerCreated', layer);
                }, this).once('m:map_layer_error', function (layer) {
                    dataset.trigger('m:map_adapter_layerError', layer);
                }, this).init(container, dataset, visProperties, dataset.get('geoData'));
            }, this).loadGeoData();
            //
            // Instead of dataset.loadGeoData, ideally this would allow a call
            // to the server to load the geo data rendered.
            //
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

const adapterRegistry = _.extend(new AdapterRegistry(), Backbone.Events);

export default adapterRegistry;

const rendering = { geo: {} };

/**
 * Utility function to define a map representation and add it to the Adapter Registry.
 * @param {string} layerType - The type of map visualization used to render the dataset
 * @param {rendering.geo.MapRepresentation} layerDefinition - The definition of a GeoJs layer representation
 * @param {rendering.geo.MapRepresentation} [ParentDefinition] - The definition of a GeoJs layer representation,
 * to be used as the constructor set as the prototype of layerDefinition
 */
rendering.geo.defineMapLayer = function (layerType, layerDefinition, ParentDefinition) {
    if (ParentDefinition) {
        layerDefinition.prototype = new ParentDefinition();
    }
    adapterRegistry.register(layerType, layerDefinition);
    return layerDefinition;
};

/**
 * Base MapRepresentation definition, with type 'map'.
 */
rendering.geo.MapRepresentation = rendering.geo.defineMapLayer('map', function () {
    /**
     * Delete this instance of a MapRepresentation from the MapContainer
     *
     * @param {Object} container - An implementor of the MapContainer interface
     */
    this.delete = function (container) {
        container.deleteLayer(this.geoJsLayer);
    };

    /**
     * Set the opacity on the rendered instance of a MapRepresentation
     *
     * @param {number} opacity - Opacity value between 0 and 1
     */
    this.setOpacity = function (opacity) {
        this.geoJsLayer.opacity(opacity);
    };

    /**
     * Render this instance of a MapRepresentation into the MapContainer
     *
     * @param {Object} container - An implementor of the MapContainer interface
     */
    this.render = function (container) {
        container.renderMap();
    };
});

/**
 * Generic GeoJson MapRepresentation definition, with type 'geojson'.
 */
rendering.geo.GeometryRepresentation = rendering.geo.defineMapLayer('geojson', function () {
    this.readerType = 'jsonReader';

    /**
     * Async function to define a rendered GeoJs geojson layer for the passed
     * in dataset.
     *
     * @param {Object} container - An implementor of the MapContainer interface
     * @param {minerva.models.DatasetModel} dataset - The dataset to be rendered
     * @param {Object} visProperties - Properties used to render the dataset as a GeoJson layer
     * @param {string} data - The data to be rendered in the layer, assumed to be json
     * @fires 'm:map_layer_renderable' event upon successful layer render definition
     * @fires 'm:map_layer_error' event upon an error defining the layer rendering
     */
    this.init = function (container, dataset, visProperties, data) {
        this.geoJsLayer = container.createLayer('feature');
        dataset.geoJsLayer = this.geoJsLayer;

        // force selection api on all features for this layer
        var _createFeature = this.geoJsLayer.createFeature;
        this.geoJsLayer.createFeature = function (name, arg) {
            if (!arg) {
                arg = {};
            }
            arg.selectionAPI = true;
            return _createFeature.call(this, name, arg);
        };

        try {
            var reader = geo.createFileReader(this.readerType, { layer: this.geoJsLayer });
            this._prepareColorLegendMeta(dataset, container, data, visProperties, data.summary);
            if (!data.series) {  // not a timeseries
                this._injectStyle(data, visProperties, data.summary || {});
                reader.read(data, _.bind(function (features) {
                    this._processFeatures(visProperties, features);
                }, this));
            } else {    // a timeseries
                var lastFeature = 0;
                var curframe = 0;
                _.each(data.series, function (entry, index) {
                    this._injectStyle(entry.geojson, visProperties, data.summary || {});
                    reader.read(entry.geojson, _.bind(function (features) {
                        this._processFeatures(visProperties, features);
                    }, this));
                    entry.features = this.geoJsLayer.features().slice(lastFeature);
                    lastFeature = this.geoJsLayer.features().length;
                    _.each(entry.features, function (feature) {
                        feature.visible(index === curframe);
                    });
                }, this);
            }
            this.trigger('m:map_layer_renderable', this);
        } catch (err) {
            console.error('This layer cannot be rendered to the map');
            console.error(err);
            this.trigger('m:map_layer_error', this);
        }
    };

    this._processFeatures = function (visProperties, features) {
        if (visProperties.point && visProperties.point.cluster) {
            var points = features[0];
            var allData = points.data();
            this._injectClusterStyle(points, 'radius', visProperties.point.clusterRadius);
            this._injectClusterStyle(points, 'stroke', true);
            this._injectClusterStyle(points, 'fill', true);
            this._injectClusterStyle(points, 'strokeColor', visProperties.point.clusterStrokeColor);
            this._injectClusterStyle(points, 'fillColor', visProperties.point.clusterFillColor);
            this._injectClusterStyle(points, 'strokeOpacity', 1);
            this._injectClusterStyle(points, 'strokeWidth', 1);
            this._injectClusterStyle(points, 'fillOpacity', 1);
            points.clustering({
                radius: visProperties.point.clusterDistance // need to fix geojs for this to work
            }).data(allData);
        }
    };

    /**
     * Inject cluster styling into the style object.
     */
    this._injectClusterStyle = function (feature, property, clusterStyle) {
        var styleFunc = feature.style(property);
        feature.style(property, function (d) {
            if (d.__cluster) {
                return clusterStyle;
            }
            return styleFunc.apply(this, arguments);
        });
    };

    /**
     * Inject style objects into geojson feature properties.
     */
    this._injectStyle = function (data, visProperties, summary) {
        var props = {
            point: this._configureProperties(data, visProperties.point, summary),
            line: this._configureProperties(data, visProperties.line, summary),
            polygon: this._configureProperties(data, visProperties.polygon, summary)
        };
        geojsonUtil.style(data, props);
    };

    /**
     * Generate a normalized representation of vis properties suitable to be
     * passed into geojs's json reader.  For now, this handles generating
     * color scale functions for fill and stroke styles.
     */
    this._configureProperties = function (data, style, summary) {
        var vis = _.extend({}, style), d, key;
        if (vis.strokeColorKey) {
            vis.strokeColor = _.compose(
                geojsonUtil.colorScale(vis.strokeRamp, summary[vis.strokeColorKey]),
                function (props) { return props[vis.strokeColorKey]; }
            );
        }

        if (vis.fillColorKey) {
            d = [];
            key = vis.fillColorKey;
            data.features.forEach(function (item, index, array) {
                d.push(item.properties[key]);
            });
            vis.fillColor = _.compose(
                geojsonUtil.colorScale(vis.fillRamp, summary[vis.fillColorKey],
                    vis.logFlag, vis.quantileFlag,
                    vis.clampingFlag, vis.minClamp, vis.maxClamp, d),
                function (props) { return props[vis.fillColorKey]; }
            );
        }
        return vis;
    };

    this._prepareColorLegendMeta = function (dataset, container, data, visProperties, summary) {
        var categories = [];

        processOneCategory('polygon', 'fillColorKey', 'fillRamp');
        processOneCategory('polygon', 'strokeColorKey', 'strokeRamp');
        processOneCategory('line', 'strokeColorKey', 'strokeRamp');
        processOneCategory('point', 'strokeColorKey', 'strokeRamp');

        function processOneCategory(type, colorKey, rampKey) {
            var vis = visProperties[type];
            if (!vis[colorKey]) {
                return;
            }
            var colorRamps = colorbrewer[vis[rampKey]];
            var colors = colorRamps[_.keys(colorRamps).reverse()[0] - 1];
            // Default category configuration
            var category = {
                name: dataset.get('name') + ' - ' + visProperties.polygon[colorKey],
                type: 'discrete',
                scale: 'linear',
                colors: colors,
                domain: [summary[vis[colorKey]].min, summary[vis[colorKey]].max]
            };
            // categorical
            if (summary[vis[colorKey]].values) {
                var domain = Object.keys(summary[vis[colorKey]].values);
                // To many to fit the size
                if (domain.length > 7) {
                    return;
                }
                else {
                    category.scale = 'ordinal';
                    category.domain = domain;
                }
            }
            if (vis.logFlag) {
                category.scale = 'log';
            }
            if (vis.quantileFlag) {
                category.scale = 'quantile';
                category.domain = data.features.map(function (item, index, array) {
                    return item.properties[vis[colorKey]];
                });
            }
            if (vis.clampingFlag) {
                category.scale = 'linear';
                category.clamp = [vis.minClamp, vis.maxClamp];
            }
            categories.push(category);
        }
        container.addColorLegendCategories(categories);
        this.colorLegendCategories = categories;
    };

    this.delete = function (container) {
        this.__proto__.delete.call(this, container);
        container.removeColorLegendCategories(this.colorLegendCategories);
    }
}, rendering.geo.MapRepresentation);

/**
 * Generic GeoJs Contour MapRepresentation definition, with type 'contour'.
 */
rendering.geo.ContourRepresentation = rendering.geo.defineMapLayer('contour', function () {
    this.readerType = 'contourJsonReader';
}, rendering.GeometryRepresentation);

/**
 * Generic GeoJs Choropleth MapRepresentation definition, with type 'choropleth'.
 */
rendering.geo.ChoroplethRepresentation = rendering.geo.defineMapLayer('choropleth', function () {
    /**
     * Async function to define a rendered GeoJs geojson choropleth layer for the passed
     * in dataset.
     *
     * @param {Object} container - An implementor of the MapContainer interface
     * @param {minerva.models.DatasetModel} dataset - The dataset to be rendered
     * @param {Object} visProperties - Properties used to render the dataset as a GeoJson choropleth layer
     * @param {string} visProperties.colorByValue - The key in jsonData whose value should be colored by
     * @param {string} visProperties.colorScheme - Name of a colorbrewer color scheme, to color the chorlopleth
     * @param {string} jsonData - The data to be rendered in the layer, assumed to be json
     * @fires 'm:map_layer_renderable' event upon successful layer render definition
     * @fires 'm:map_layer_error' event upon an error defining the layer rendering
     */
    this.init = function (container, dataset, visProperties, jsonData) {
        // Set the visProperties from the dataset as a HACK,
        // though they should come from visProperties.
        visProperties.colorByValue = dataset.getMinervaMetadata().colorByValue;
        visProperties.colorScheme = dataset.getMinervaMetadata().colorScheme;

        this.geoJsLayer = container.createLayer('feature');
        var data = [];

        var polygon = this.geoJsLayer.createFeature('polygon', { selectionAPI: true });
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
            }
        }).data(data);

        var clickInfo = new ClickInfoModel();

        polygon.geoOn(geo.event.feature.mouseclick, _.bind(function (d) {
            clickInfo.set({
                layer: this.geoJsLayer,
                dataset: dataset,
                mouse: d.mouse,
                datum: d.data.properties
            });

            if (!this.clickInfoWidget) {
                this.clickInfoWidget = new ClickInfoWidget({
                    model: clickInfo,
                    parentView: container.getMapView()
                });
            }
        }, this));
        this.trigger('m:map_layer_renderable', this);
    };
}, rendering.geo.MapRepresentation);

/**
 * GeoJs WMS MapRepresentation definition, with type 'wms'.
 */
rendering.geo.WmsRepresentation = rendering.geo.defineMapLayer('wms', function () {
    /**
     * Async function to define a rendered GeoJs wms layer for the passed in dataset.
     *
     * @param {Object} container - An implementor of the MapContainer interface
     * @param {minerva.models.DatasetModel} dataset - The dataset to be rendered
     * @fires 'm:map_layer_renderable' event upon successful layer render definition
     * @fires 'm:map_layer_error' event upon an error defining the layer rendering
     */
    this.init = function (container, dataset) {
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
                var bb = this.geoJsLayer.gcsTileBounds({ x: x, y: y, level: zoom }, projection);
                var bboxMercator = bb.left + ',' + bb.bottom + ',' + bb.right + ',' + bb.top;
                var params = {
                    SERVICE: 'WMS',
                    VERSION: '1.1.1',
                    REQUEST: 'GetMap',
                    LAYERS: minervaMetadata.type_name,
                    STYLES: '',
                    BBOX: bboxMercator,
                    WIDTH: 256,
                    HEIGHT: 256,
                    FORMAT: 'image/png',
                    TRANSPARENT: true,
                    SRS: projection
                };
                // There is a lot of repeated code here. It can be easily refactored
                // but expecting much more complex vis options so for now keep them
                // separate

                var sldBody = null;
                var min = null;
                var max = null;
                var nodata = null;
                var ramp = null;
                var count = null;
                var seq = null;
                var colorMapTemplate = null;
                var colorValuePairs = null;
                var attribute = null;
                if (minervaMetadata.sld_params) {
                    if (minervaMetadata.sld_params.subType === 'multiband') {
                        sldBody = multibandTemplate({
                            typeName: minervaMetadata.sld_params.typeName,
                            redChannel: minervaMetadata.sld_params.redChannel.split(':')[0].toString(),
                            greenChannel: minervaMetadata.sld_params.greenChannel.split(':')[0].toString(),
                            blueChannel: minervaMetadata.sld_params.blueChannel.split(':')[0].toString()
                        });
                    } else if (minervaMetadata.sld_params.subType === 'singleband') {
                        min = parseFloat(minervaMetadata.sld_params.min);
                        max = parseFloat(minervaMetadata.sld_params.max);
                        nodata = parseFloat(minervaMetadata.sld_params.nodata);
                        // If nodata is greater than max it has to be added
                        // to the end, otherwise it has to be added to the
                        // begining
                        var nodataMin = min - 1;
                        var nodataMax = max + 1;
                        if (nodata > max) {
                            nodataMax = nodata;
                        } else if (nodata < min) {
                            nodataMin = nodata;
                        }
                        ramp = minervaMetadata.sld_params['ramp[]'];
                        count = ramp.length;
                        seq = generateSequence(min, max, count);
                        colorValuePairs = seq.map(function (num, i) {
                            return [num, ramp[i]];
                        });
                        colorMapTemplate = _.template('<ColorMapEntry color="<%= color %>" quantity="<%= value %>" />');
                        var colorMapEntry = _.map(colorValuePairs, function (pair) {
                            return colorMapTemplate({
                                color: pair[1],
                                value: pair[0]
                            });
                        }).join('');
                        sldBody = singlebandTemplate({
                            typeName: minervaMetadata.sld_params.typeName,
                            colorMapEntry: colorMapEntry,
                            nodataMin: nodataMin,
                            nodataMax: nodataMax
                        });
                    } else {
                        min = parseFloat(minervaMetadata.sld_params.min);
                        max = parseFloat(minervaMetadata.sld_params.max);
                        ramp = minervaMetadata.sld_params['ramp[]'];
                        count = ramp.length;
                        attribute = minervaMetadata.sld_params.attribute;
                        seq = generateSequence(min, max, count);
                        colorValuePairs = seq.map(function (num, i) {
                            return [num, ramp[i]];
                        });
                        colorMapTemplate = _.template('<ogc:Literal><%= value %></ogc:Literal><ogc:Literal><%= color %></ogc:Literal>');
                        var colorValueMapping = _.map(colorValuePairs, function (pair) {
                            return colorMapTemplate({
                                color: pair[1],
                                value: pair[0]
                            });
                        }).join('');

                        if (minervaMetadata.sld_params.subType === 'point') {
                            var marker = minervaMetadata.sld_params.marker;
                            sldBody = pointTemplate({
                                typeName: minervaMetadata.sld_params.typeName,
                                colorValueMapping: colorValueMapping,
                                attribute: attribute,
                                marker: marker
                            });
                        } else if (minervaMetadata.sld_params.subType === 'line') {
                            sldBody = lineTemplate({
                                typeName: minervaMetadata.sld_params.typeName,
                                colorValueMapping: colorValueMapping,
                                attribute: attribute
                            });
                        } else {
                            sldBody = polygonTemplate({
                                typeName: minervaMetadata.sld_params.typeName,
                                colorValueMapping: colorValueMapping,
                                attribute: attribute
                            });
                        }
                    }
                    params.SLDBODY = sldBody;
                }
                if (minervaMetadata.hasOwnProperty('credentials')) {
                    params.minerva_credentials = minervaMetadata.credentials;
                }
                return this.geoJsLayer.baseUrl + '?' + $.param(params);
            }, this)
        );
        this.trigger('m:map_layer_renderable', this);
    };
}, rendering.geo.MapRepresentation);
