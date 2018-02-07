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
            Name: this.dataset.get('name'),
            Source: 'file'
        };
        if (meta.original_files && meta.original_files[0] && meta.original_files[0].name) {
            output['Original name'] = meta.original_files[0].name;
        } else if (meta.geojson_file && meta.geojson_file.name) {
            output['Original name'] = meta.geojson_file.name;
        }
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
