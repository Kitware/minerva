/**
* This widget displays the list of WMS layers
*/
minerva.views.WmsLayersListWidget = minerva.View.extend({

    events: {
        'submit #m-add-layers-form': function (e) {
            e.preventDefault();
            var wmsSource = this.source;

            $('input[type=checkbox]').each(_.bind(function (index, layer) {
                if (layer.checked) {
                    var typeName = $(layer).attr('typeName');
                    var layerName = $(layer).attr('name');

                    var params = {
                        typeName: typeName,
                        name: layerName,
                        wmsSourceId: wmsSource.get('_id')
                    };

                    var wmsDataset = new minerva.models.WmsDatasetModel({});

                    wmsDataset.on('m:wmsDatasetAdded', function () {
                        this.$el.modal('hide');
                        this.collection.add(wmsDataset);
                    }, this).createWmsDataset(params);
                }
            }, this));
        }
    },

    initialize: function (settings) {
        this.source = settings.source;
        this.collection = settings.collection;
        this.layers = this.source.getMinervaMetadata().layers;
    },

    render: function () {
        var modal = this.$el.html(minerva.templates.wmsLayersListWidget({ layers: this.layers }));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
        this.$el.modal('show');
        return this;
    }

});
