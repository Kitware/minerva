/**
* This widget displays the list of WMS layers
*/
minerva.views.WmsLayersListWidget = minerva.View.extend({

    events: {
        'submit .add-layers-form': function (e) {
            e.preventDefault();
            var listOfLayers = [];
            $('.add-layers-form input:checked').each(function (input) {
                listOfLayers.push($(this).attr('name'));
            });

            console.log(listOfLayers);
            girder.events.trigger('m:layerDatasetLoaded', listOfLayers);

            var wmsDataset = new minerva.models.WmsDatasetModel({ listOfLayers: listOfLayers });
            // wmsService.on('m:sourceReceived', function () {
            //     this.$el.modal('hide');
            //     this.collection.add(wmsService);
            // }, this);
        }
    },

    initialize: function (settings) {
        console.log('>>>>>>>', settings);
        this.dataset = settings.dataset;
    },

    render: function () {
        var modal = this.$el.html(minerva.templates.wmsLayersListWidget({ dataset: this.dataset }));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
        this.$el.modal('show');
        return this;
    }

});
