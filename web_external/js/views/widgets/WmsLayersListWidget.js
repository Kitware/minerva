/**
* This widget displays the list of WMS layers
*/
minerva.views.WmsLayersListWidget = minerva.View.extend({

    events: {
        'submit #m-add-layers-form': function (e) {
            e.preventDefault();
            var wmsSource = this.source;

            this.$('form#m-add-layers-form :input.m-add-layers').each(_.bind(function (index, layer) {
                if (layer.checked) {
                    var typeName = $(layer).attr('typeName');
                    var layerName = $(layer).attr('name');

                    var params = {
                        typeName: typeName,
                        name: layerName,
                        wmsSourceId: wmsSource.get('_id')
                    };

                    var wmsDataset = new minerva.models.WmsDatasetModel({});

                    wmsDataset.once('m:wmsDatasetAdded', function () {
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
        var modal = this.$el.html(minerva.templates.wmsLayersListWidget({
            layers: this.layers
        })).girderModal(this);
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
        return this;
    },

    /**
     * Change the current wmsSource whose layers will be displayed, and render.
     *
     * @param  wmsSource  The wmsSource to display.
     */
    setCurrentSource: function (wmsSource) {
        this.source = wmsSource;
        this.layers = this.source.getMinervaMetadata().layers;
        this.render();
    }

});
