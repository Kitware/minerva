import View from '../view';
import GeoJSONStyleWidget from './GeoJSONStyleWidget';
import template from '../../templates/widgets/jsonConfigWidget.pug';
import '../../stylesheets/widgets/jsonConfigWidget.styl';
import '../../stylesheets/widgets/geoJSONStyleWidget.styl';
/**
 * This widget displays options for rendering json datasets.
 */
const JsonConfigWidget = View.extend({
    events: {
        'submit #m-json-geo-render-form': function (e) {
            e.preventDefault();
            this.$('.g-validation-failed-message').text('');
            this.jsonStyleWidget.save();
            this.dataset._initGeoRender('geojson');
            this.$el.modal('hide');
        }
    },

    initialize: function (settings) {
        this.dataset = settings.dataset;
    },

    render: function () {
        var modal = this.$el.html(template()).girderModal(this);
        this._loadDataset();
        modal.trigger($.Event('reader.girder.modal', {relatedTarget: modal}));
    },

    setCurrentDataset: function (dataset) {
        this.dataset = dataset;
        this.render();
    },

    _loadDataset: function () {
        this.dataset
            .once('m:dataset_geo_dataLoaded', this._loadStyleConfig, this)
            .loadGeoData();
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
