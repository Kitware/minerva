import _ from 'underscore';
import { restRequest } from 'girder/rest';

import View from '../view';
import ColorbrewerPicker from './ColorbrewerPicker';
import palettableColorbrewerMapper from '../util/palettableColorbrewerMapper';
import template from '../../templates/widgets/kTileConfigWidget.pug';
import '../../stylesheets/widgets/kTileConfigWidget.styl';
/**
 * This widget displays options for rendering json datasets.
 */
const KTileConfigWidget = View.extend({
    events: {
        'submit #m-json-geo-render-form': function (e) {
            e.preventDefault();
            var mm = this.dataset.getMinervaMetadata();
            if (this.custom && this.selectedBand && this.selectedPalettable) {
                mm.visProperties = {
                    band: this.selectedBand,
                    palettable: this.selectedPalettable,
                    min: this.min,
                    max: this.max
                };
            } else {
                mm.visProperties = null;
            }
            if (this.saveToDataset) {
                this.dataset.saveMinervaMetadata(mm);
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
            this.colorbrewerPicker.setProperties({ disabled: !this.custom });
            this.render();
        },
        'change select.m-band': function (e) {
            this.selectedBand = e.currentTarget.value;
            this.max = this.bands[this.selectedBand].max;
            this.min = this.bands[this.selectedBand].min;
            this.render();
        },
        'change input.min': function (e) {
            this.min = e.target.value;
            this.render();
        },
        'change input.max': function (e) {
            this.max = e.target.value;
            this.render();
        }
    },

    initialize(settings) {
        this.dataset = settings.dataset;
        this.saveToDataset = false;
        this.modalOpened = false;
        this.bands = [];
        this.selectedBand = null;
        this.selectedPalettable = null;
        this.max = 255;
        this.min = 0;
        this.custom = false;
        var minervaMeta = this.dataset.getMinervaMetadata();
        if (minervaMeta && minervaMeta.visProperties && minervaMeta.visProperties.band && minervaMeta.visProperties.palettable) {
            this.custom = true;
            this.selectedBand = minervaMeta.visProperties.band;
            this.selectedPalettable = minervaMeta.visProperties.palettable;
            this.min = minervaMeta.visProperties.min;
            this.max = minervaMeta.visProperties.max;
        }
    },

    render() {
        if (this.modalOpened) {
            this.update(template(this));
        } else {
            this.modalOpened = true;
            var modal = this.$el.html(template(this)).girderModal(this);
            this.colorbrewerPicker = new ColorbrewerPicker({
                parentView: this,
                el: this.$('.colorbrewer-picker-container'),
                disabled: !this.custom,
                ramp: palettableColorbrewerMapper.toRamp(this.selectedPalettable),
                onChange: (ramp) => {
                    this.selectedPalettable = palettableColorbrewerMapper.toPalettable(ramp);
                }
            }).render();
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
            this.bands = resp.bands;
            if (!this.selectedBand) {
                this.selectedBand = _.keys(this.bands)[0];
                this.max = this.bands[this.selectedBand].max;
                this.min = this.bands[this.selectedBand].min;
            }
            this.render();
        });
    }
});
export default KTileConfigWidget;
