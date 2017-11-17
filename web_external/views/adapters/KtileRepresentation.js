import _ from 'underscore';
import { getApiRoot } from 'girder/rest';

import palettableColorbrewerMapper from '../util/palettableColorbrewerMapper';
import MapRepresentation from './MapRepresentation';

/**
 * Generic GeoJs tile MapRepresentation definition, with type 'ktile'.
 */
class KtileRepresentation extends MapRepresentation {
    init(container, dataset, visProperties) {
        var layer = container.createLayer('osm', {
            attribution: null,
            keepLower: false
        });
        var fileId = dataset.get('meta').minerva.original_files[0]._id;
        var url = getApiRoot() + '/ktile/' + fileId;
        if (_.isEmpty(visProperties)) {
            layer.url((x, y, z) => `${url}/${z}/${x}/${y}`);
        } else {
            layer.url((x, y, z) => `${url}/${z}/${x}/${y}?` +
                `palette=${visProperties.palettable}&band=${visProperties.band}&` +
                `minimum=${visProperties.min}&maximum=${visProperties.max}`);
            var colorLegendCategory = {
                type: 'discrete',
                scale: 'linear',
                colors: palettableColorbrewerMapper.toRampColors(visProperties.palettable),
                domain: [visProperties.min, visProperties.max]
            };
            this.colorLegendCategory = colorLegendCategory;
            container.addColorLegendCategories([colorLegendCategory]);
        }
        this.geoJsLayer = layer;

        this.trigger('m:map_layer_renderable', this);
    }

    delete(container) {
        super.delete(container);
        container.removeColorLegendCategories([this.colorLegendCategory]);
    }
}
export default KtileRepresentation;
