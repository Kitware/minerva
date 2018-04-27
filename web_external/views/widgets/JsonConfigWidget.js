import { getCurrentUser } from 'girder/auth';

import View from '../view';
import GeoJSONStyleWidget from './GeoJSONStyleWidget';
import template from '../../templates/widgets/jsonConfigWidget.pug';
import '../../stylesheets/widgets/jsonConfigWidget.styl';
/**
 * This widget displays options for rendering json datasets.
 */
const JsonConfigWidget = View.extend({
    events: {
        'submit #m-json-geo-render-form': function (e) {
            e.preventDefault();
            this.$('.g-validation-failed-message').text('');
            this.jsonStyleWidget.updateDataset(this.saveToDataset);
            this.dataset.trigger('m:dataset_config_change', this);
            this.$el.modal('hide');
        },
        'change .save-to-dataset': function (e) {
            this.saveToDataset = e.currentTarget.checked;
            this.render();
        }
    },

    initialize: function (settings) {
        this.dataset = settings.dataset;
        this.currentUser = getCurrentUser();
        this.saveToDataset = false;
        this.modalOpened = false;
    },

    render: function () {
        if (this.modalOpened) {
            this.update(template(this));
        } else {
            this.modalOpened = true;
            var modal = this.$el.html(template(this)).girderModal(this);
            this._loadDataset();
            modal.trigger($.Event('reader.girder.modal', { relatedTarget: modal }));
        }
        return this;
    },

    _loadDataset: function () {
        this.dataset
            .loadGeoData()
            .then(() => {
                this._loadStyleConfig();
            });
    },

    _loadStyleConfig: function () {
        this.jsonStyleWidget = new GeoJSONStyleWidget({
            parentView: this,
            dataset: this.dataset,
            el: this.$('.m-geojson-style').removeClass('hidden')
        }).render();
    }
});
export default JsonConfigWidget;
