/**
* This widget displays the list of WMS layers
*/
minerva.views.WmsLayersListWidget = minerva.View.extend({

    events: {
        'submit #m-add-layers-form': function (e) {
            e.preventDefault();
            var wmsSource = this.dataset;
            var that = this;
            $('#m-add-layers-form input:checked').each(function () {

                var layerName = $(this).attr('name');

                var wmsParams = {};
                wmsParams.layerName = layerName;

                var params = {
                    'name': layerName,
                    'wmsSourceId': wmsSource['id'],
                    'wmsParams': JSON.stringify(wmsParams)
                };

                var wmsDataset = new minerva.models.WmsDatasetModel({});

                wmsDataset.on('m:layerSentToMap', function () {
                    that.$el.modal('hide');
                    that.collection.add(wmsDataset);
                }, that).createWmsDataset(params);
            });
        }
    },

    initialize: function (settings) {
        this.dataset = settings.dataset;
        this.collection = settings.collection;
        this.layers = this.dataset.get('meta').minerva.layers;
    },

    render: function () {
        var modal = this.$el.html(minerva.templates.wmsLayersListWidget({ layers: this.layers }));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
        this.$el.modal('show');
        return this;
    }

});
