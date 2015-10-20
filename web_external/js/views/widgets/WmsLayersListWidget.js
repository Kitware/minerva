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
        },

        'keyup #filter-layers': function (e) {
            var text = $(e.target).val();
            this.filterLayers(text);
        }
    },

    filterLayers: function (text) {
        var data = this.layers;
        var pattern = new RegExp(text, 'gi');
        var filteredData = _.filter(data, function (layer) {
            return pattern.test(layer.layer_title);
        });
        $('.item-list').html('');
        filteredData.forEach(_.bind(function (layer) {
            var layerView = minerva.templates.layersListWidget({
                layer: layer
            });
            $('.item-list').append(layerView);
        }, this));
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

        this.layers.forEach(_.bind(function (layer) {
          var layerView = minerva.templates.layersListWidget({
              layer: layer
          });
          $('.item-list').append(layerView);
        }, this));

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
