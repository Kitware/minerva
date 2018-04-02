import _ from 'underscore';

import registry from './registry';
import MapRepresentation from './MapRepresentation';

/**
 * GeoJs WMS2 MapRepresentation definition, with type 'wms2'.
 */
class WMS2Representation extends MapRepresentation {
    /**
     * Async function to define a rendered GeoJs wms layer for the passed in dataset.
     *
     * @param {Object} container - An implementor of the MapContainer interface
     * @param {minerva.models.DatasetModel} dataset - The dataset to be rendered
     * @fires 'm:map_layer_renderable' event upon successful layer render definition
     * @fires 'm:map_layer_error' event upon an error defining the layer rendering
     */
    init(container, dataset) {
        this.geoJsLayer = container.createLayer('osm', {
            attribution: null,
            keepLower: false,
            maxLevel: 21
        });
        var minervaMetadata = dataset.metadata();
        var projection = 'EPSG:3857';
        this.geoJsLayer.url(
            function (x, y, zoom) {
                var bb = this.gcsTileBounds({ x: x, y: y, level: zoom }, projection);
                var bbox_mercator = bb.left + ',' + bb.bottom + ',' + bb.right + ',' + bb.top;

                var params = {
                    'SERVICE': 'WMS',
                    'VERSION': '1.3.0',
                    'REQUEST': 'GetMap',
                    'STYLES': '',
                    'BBOX': bbox_mercator,
                    'WIDTH': 256, //Use 256x256 tiles
                    'HEIGHT': 256,
                    'FORMAT': 'image/png',
                    'TRANSPARENT': true,
                    'SRS': projection,
                    'TILED': true
                };

                return minervaMetadata.wms2_params.url + '&' + $.param(params);
            }
        );

        this.trigger('m:map_layer_renderable', this);
    }
}

registry.register('wms2', WMS2Representation);

export default WMS2Representation;
