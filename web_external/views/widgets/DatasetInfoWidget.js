import View from '../view';
import template from '../../templates/widgets/datasetInfoWidget.pug';
import '../../stylesheets/widgets/datasetInfoWidget.styl';
/**
* This widget is used to diplay minerva metadata for a dataset.
*/
const DatasetInfoWidget = View.extend({
    initialize: function (settings) {
        this.dataset = settings.dataset;
        this.normalizeMetaInfo = this.normalizeMetaInfo.bind(this);
    },

    render: function () {
        var modal = this.$el.html(template(this))
            .girderModal(this);

        modal.trigger($.Event('ready.girder.modal', { relatedTarget: modal }));

        return this;
    },
    normalizeMetaInfo() {
        var meta = this.dataset.get('meta').minerva;
        var output = {
            Name: meta.geojson_file.name,
            Source: 'file'
        };
        switch (meta.dataset_type) {
            case 'geojson':
                output.Type = 'GeoJSON';
                if (meta.postgresGeojson) {
                    output.Source = 'PostgreSQL';
                }
                break;
            case 'geotiff':
                output.Type = 'GeoTiff';
                break;
        }
        return output;
    }
});
export default DatasetInfoWidget;
