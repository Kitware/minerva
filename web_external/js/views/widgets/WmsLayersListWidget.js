'use strict';
/**
* This widget displays the list of WMS layers
*/
minerva.views.WmsLayersListWidget = minerva.View.extend({

    events: {
        'submit #m-add-layers-form': function (e) {
            e.preventDefault();
            var wmsSource = this.dataset;
            var that = this;
            $('input[type=checkbox]').each(function () {

                console.log('called');

                if (this.checked) {
                    console.log(this);
                    var layerName = $(this).attr('name');

                    var wmsParams = {};
                    wmsParams.layerName = layerName;

                    var params = {
                        'name': layerName,
                        'wmsSourceId': wmsSource.id,
                        'wmsParams': JSON.stringify(wmsParams)
                    };

                    var wmsDataset = new minerva.models.WmsDatasetModel({});

                    wmsDataset.on('m:wmsDatasetAdded', function () {
                        that.$el.modal('hide');
                        that.collection.add(wmsDataset);
                    }, that).createWmsDataset(params);
                }
            });
        }
    },

    initialize: function (settings) {
        this.dataset = settings.dataset;
        this.collection = settings.collection;
        this.layers = this.dataset.get('meta').minerva.layers;
    },

    render: function () {
        // TODO: [bug] wmultiple msLayersListWidget are being created
        this.$el.children().detach();
        var modal = this.$el.html(minerva.templates.wmsLayersListWidget({ layers: this.layers }));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
        this.$el.modal('show');
        return this;
    }

});
