import _ from 'underscore';
import { getApiRoot } from 'girder/rest';

import palettableColorbrewerMapper from '../util/palettableColorbrewerMapper';
import MapRepresentation from './MapRepresentation';
import registry from './registry';

/**
 * Generic GeoJs tile MapRepresentation definition, with type 'large_image'.
 */
class LargeImageRepresentation extends MapRepresentation {
    init(container, dataset, visProperties) {
        var layer = container.createLayer('osm', {
            attribution: null,
            keepLower: false,
            maxLevel: 21
        });
        var itemId = dataset.get('_id');
        var apiRoot = getApiRoot();
        var params = encodeURI('encoding=PNG&projection=EPSG:3857');
        var url = `${apiRoot}/item/${itemId}/tiles/zxy`;
        if (_.isEmpty(visProperties)) {
            layer.url((x, y, z) => `${url}/${z}/${x}/${y}?${params}`);
        } else {
            var style = encodeURI(JSON.stringify({
                band: parseInt(visProperties.band),
                min: parseFloat(visProperties.min),
                max: parseFloat(visProperties.max),
                palette: visProperties.palettable
            }));
            layer.url((x, y, z) => `${url}/${z}/${x}/${y}?${params}&style=${style}`);
            var colorLegendCategory = {
                name: `${dataset.get('name')} - band ${visProperties.band}`,
                type: 'discrete',
                scale: 'linear',
                colors: palettableColorbrewerMapper.toRampColors(visProperties.palettable),
                domain: [visProperties.min, visProperties.max]
            };
            this.colorLegendCategory = colorLegendCategory;
            container.addColorLegendCategories([colorLegendCategory]);
        }
        this.geoJsLayer = layer;
    }

    delete(container) {
        super.delete(container);
        container.removeColorLegendCategories([this.colorLegendCategory]);
    }
}

registry.register('large_image', LargeImageRepresentation);

export default LargeImageRepresentation;
