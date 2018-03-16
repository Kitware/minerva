import { restRequest } from 'girder/rest';

import View from '../view';
import template from '../../templates/widgets/datasetInfoWidget.pug';
import '../../stylesheets/widgets/datasetInfoWidget.styl';
/**
* This widget is used to diplay minerva metadata for a dataset.
*/
const DatasetInfoWidget = View.extend({
    events: {
        'click button.edit-name': function (e) {
            this.editing = true;
            this.render();
        },
        'click button.commit-name': function (e) {
            this.editing = false;
            if (!this.dataset.isInMemoryDataset()) {
                restRequest({
                    type: 'PUT',
                    url: `item/${this.dataset.get('_id')}`,
                    data: { name: this.datasetName }
                }).then((item) => {
                    this.dataset.set('name', this.datasetName);
                });
            } else {
                this.dataset.set('name', this.datasetName);
            }
            this.render();
        },
        'change input.name': function (e) {
            this.datasetName = e.target.value;
        },
        'keydown input.name': function (e) {
            if (e.keyCode === 27) {
                e.stopPropagation();
                this.datasetName = this.dataset.get('name');
                this.editing = false;
                this.render();
            }
        }
    },

    initialize(settings) {
        this.dataset = settings.dataset;
        this.editing = false;
        this.datasetName = this.dataset.get('name');
        this.normalizeMetaInfo = this.normalizeMetaInfo.bind(this);
    },

    render() {
        if (!this.modalOpenned) {
            this.modalOpenned = true;
            var modal = this.$el.html(template(this))
                .girderModal(this);

            modal.trigger($.Event('ready.girder.modal', { relatedTarget: modal }));
        } else {
            this.$el.html(template(this));
        }
        return this;
    },
    normalizeMetaInfo() {
        var meta = this.dataset.get('meta').minerva;
        var output = {
            Source: 'File'
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
