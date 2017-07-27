import _ from 'underscore';

import View from '../view';
import template from '../../templates/widgets/datasetInfoWidget.pug';
/**
* This widget is used to diplay minerva metadata for a dataset.
*/
const DatasetInfoWidget = View.extend({
    initialize: function (settings) {
        this.dataset = settings.dataset;
    },

    render: function () {
        var modal = this.$el.html(template({}))
            .girderModal(this)
            .on('ready.girder.modal',
            _.bind(function () {
                this.$('#datasetInfo')
                    .text(JSON.stringify(
                        this.dataset.get('meta').minerva,
                        null, 4));
            }, this));

        modal.trigger($.Event('ready.girder.modal', { relatedTarget: modal }));

        return this;
    }
});
export default DatasetInfoWidget;
