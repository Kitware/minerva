import _ from 'underscore';
import geo from 'geojs';
import colorbrewer from 'colorbrewer';

import MapRepresentation from './MapRepresentation';
import geojsonUtil from '../../geojsonUtil';
import registry from './registry';
/**
 * Generic GeoJson MapRepresentation definition, with type 'geojson'.
 */
class GeometryRepresentation extends MapRepresentation {
    constructor() {
        super();
        this.readerType = 'jsonReader';
    }

    /**
     * Async function to define a rendered GeoJs geojson layer for the passed
     * in dataset.
     *
     * @param {Object} container - An implementor of the MapContainer interface
     * @param {minerva.models.DatasetModel} dataset - The dataset to be rendered
     * @param {Object} visProperties - Properties used to render the dataset as a GeoJson layer
     * @param {string} data - The data to be rendered in the layer, assumed to be json
     */
    init(container, dataset, visProperties, data) {
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
            if (!data.series) { // not a timeseries
                this._injectStyle(data, visProperties, data.summary || {});
                reader.read(data, _.bind(function (features) {
                    this._processFeatures(visProperties, features);
                }, this));
            } else { // a timeseries
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
        } catch (err) {
            console.error('This layer cannot be rendered to the map');
            console.error(err);
            throw err;
        }
    }

    _processFeatures(visProperties, features) {
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
    }

    /**
     * Inject cluster styling into the style object.
     */
    _injectClusterStyle(feature, property, clusterStyle) {
        var styleFunc = feature.style(property);
        feature.style(property, function (d) {
            if (d.__cluster) {
                return clusterStyle;
            }
            return styleFunc.apply(this, arguments);
        });
    }

    /**
     * Inject style objects into geojson feature properties.
     */
    _injectStyle(data, visProperties, summary) {
        var props = {
            point: this._configureProperties(data, visProperties.point, summary),
            line: this._configureProperties(data, visProperties.line, summary),
            polygon: this._configureProperties(data, visProperties.polygon, summary)
        };
        geojsonUtil.style(data, props);
    }

    /**
     * Generate a normalized representation of vis properties suitable to be
     * passed into geojs's json reader.  For now, this handles generating
     * color scale functions for fill and stroke styles.
     */
    _configureProperties(data, style, summary) {
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
    }

    _prepareColorLegendMeta(dataset, container, data, visProperties, summary) {
        var categories = [];

        processOneCategory('polygon', 'fillColorKey', 'fillRamp');
        processOneCategory('polygon', 'strokeColorKey', 'strokeRamp');
        processOneCategory('line', 'strokeColorKey', 'strokeRamp');
        processOneCategory('point', 'strokeColorKey', 'strokeRamp');

        function processOneCategory(type, colorKey, rampKey) {
            var vis = visProperties[type];
            if (!vis || !vis[colorKey]) {
                return;
            }
            var colorRamps = colorbrewer[vis[rampKey]];
            var colors = colorRamps[_.keys(colorRamps).reverse()[0]];
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
                } else {
                    category.scale = 'ordinal';
                    category.domain = domain;
                }
            }
            // current UI styling is designed that the log, quantile, clamping option is only applicable to fill. so, when it's a stroke, skip the following options.
            if (colorKey !== 'strokeColorKey') {
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
            }
            categories.push(category);
        }
        container.addColorLegendCategories(categories);
        this.colorLegendCategories = categories;
    }

    delete(container) {
        super.delete(container);
        container.removeColorLegendCategories(this.colorLegendCategories);
    }
}

registry.register('geojson', GeometryRepresentation);

export default GeometryRepresentation;
