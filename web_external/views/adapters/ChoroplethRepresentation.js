import _ from 'underscore';
import * as d3 from 'd3';
import colorbrewer from 'colorbrewer';

import MapRepresentation from './MapRepresentation';
import ClickInfoWidget from '../widgets/ClickInfoWidget';
import ClickInfoModel from '../../models/ClickInfoModel';
import registry from './registry';

/**
 * Generic GeoJs Choropleth MapRepresentation definition, with type 'choropleth'.
 */
class ChoroplethRepresentation extends MapRepresentation {
    /**
     * Async function to define a rendered GeoJs geojson choropleth layer for the passed in dataset.
     *
     * @param {Object} container - An implementor of the MapContainer interface
     * @param {minerva.models.DatasetModel} dataset - The dataset to be rendered
     * @param {Object} visProperties - Properties used to render the dataset as a GeoJson choropleth layer
     * @param {string} visProperties.colorByValue - The key in jsonData whose value should be colored by
     * @param {string} visProperties.colorScheme - Name of a colorbrewer color scheme, to color the chorlopleth
     * @param {string} jsonData - The data to be rendered in the layer, assumed to be json
     */
    init(container, dataset, visProperties, jsonData) {
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
    }
}

registry.register('choropleth', ChoroplethRepresentation);

export default ChoroplethRepresentation;
