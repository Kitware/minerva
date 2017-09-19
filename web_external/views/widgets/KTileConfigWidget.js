import View from '../view';
import { restRequest } from 'girder/rest';

import colorbrewer from './colorbrewer';
import template from '../../templates/widgets/kTileConfigWidget.pug';
import '../../stylesheets/widgets/KTileConfigWidget.styl';
/**
 * This widget displays options for rendering json datasets.
 */
const KTileConfigWidget = View.extend({
    events: {
        'submit #m-json-geo-render-form': function (e) {
            e.preventDefault();
            // this.jsonStyleWidget.updateDataset(this.saveToDataset);
            var mm = this.dataset.getMinervaMetadata();
            if (this.custom) {
                mm.visProperties = {
                    band: this.selectedBand,
                    colorbrewer: this.selectedColorbrewer
                };
            } else {
                mm.visProperties = null;
            }
            this.dataset.trigger('m:dataset_config_change', this);
            this.$el.modal('hide');
        },
        'change .save-to-dataset': function (e) {
            this.saveToDataset = e.currentTarget.checked;
            this.render();
        },
        'change input[type=radio]': function (e) {
            this.custom = e.target.value === 'custom';
            this.render();
        },
        'change select.m-band': function (e) {
            this.selectedBand = e.currentTarget.value;
        },
        'change select.m-colorbrewer': function (e) {
            this.selectedColorbrewer = e.currentTarget.value;
        }
    },

    initialize(settings) {
        this.colorbrewer = colorbrewer;
        this.dataset = settings.dataset;
        this.saveToDataset = false;
        this.modalOpened = false;
        this.bands = [];
        this.selectedBand = null;
        this.selectedColorbrewer = colorbrewer[0];
        this.custom = false;
        var minervaMeta = this.dataset.getMinervaMetadata();
        if (minervaMeta && minervaMeta.visProperties && minervaMeta.visProperties.band && minervaMeta.visProperties.colorbrewer) {
            this.custom = true;
            this.selectedBand = minervaMeta.visProperties.band;
            this.selectedColorbrewer = minervaMeta.visProperties.colorbrewer;
        }
    },

    render() {
        if (this.modalOpened) {
            this.update(template(this));
        } else {
            this.modalOpened = true;
            var modal = this.$el.html(template(this)).girderModal(this);
            this._loadMeta();
            modal.trigger($.Event('reader.girder.modal', { relatedTarget: modal }));
        }
        return this;
    },

    _loadMeta() {
        restRequest({
            url: `/ktile/${this.dataset.get('meta').minerva.original_files[0]._id}/info`,
            type: 'GET'
        }).done((resp) => {
            this.bands = _.range(1, resp.bands + 1);
            this.selectedBand = this.selectedBand || this.bands[0];
            this.render();
        });
    }
});
export default KTileConfigWidget;
