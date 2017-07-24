import _ from 'underscore';

import View from '../view';
import WmsSourceModel from '../../models/WmsSourceModel';
import template from '../../templates/widgets/addWmsSourceWidget.pug';
/**
* This widget displays a form for adding a WMS source.
*/
const AddWmsSourceWidget = View.extend({

    events: {
        'submit #m-add-wms-source-form': function (e) {
            e.preventDefault();
            var params = {
                name: this.$('#m-wms-name').val(),
                baseURL: this.$('#m-wms-uri').val(),
                username: this.$('#m-wms-username').val(),
                password: this.$('#m-wms-password').val()
            };
            var wmsSource = new WmsSourceModel({});
            wmsSource.on('m:sourceReceived', function (datasets) {
                _.each(datasets, _.bind(function (dataset) {
                    // eslint-disable-next-line backbone/no-silent
                    this.collection.add(dataset, {silent: true});
                    this.collection.trigger('add');
                }, this));
                this.$el.modal('hide');
            }, this).createSource(params);
        }
    },

    initialize: function (settings) {
        this.collection = settings.collection;
        this.title = 'Enter WMS Source details';
        return this;
    },

    render: function () {
        var modal = this.$el.html(template({})).girderModal(this);
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
        return this;
    }

});
export default AddWmsSourceWidget;
