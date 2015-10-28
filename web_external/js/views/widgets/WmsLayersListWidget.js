/**
* This widget displays the list of WMS layers
*/
minerva.views.WmsLayersListWidget = minerva.View.extend({

    events: {
        'submit #m-add-layers-form': function (e) {
            e.preventDefault();
            var wmsSource = this.source;

            this.$('form#m-add-layers-form :input.m-add-layers').each(_.bind(function (index, layer) {
                var typeName = $(layer).attr('typeName');
                var layerName = $(layer).attr('name');

                if (layer.checked && !_.contains(this.currentLayersInDatasets, this.generateUniqueLayerName(layerName))) {

                    this.currentLayersInDatasets.push(this.generateUniqueLayerName(layerName));

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

        'click .m-add-layers-checkbox label': function (e) {
            var checkbox = $(e.currentTarget).parent().find('input:checkbox').first();
            var checked = checkbox.prop('checked');
            var disabled = checkbox.prop('disabled');
            if (!disabled) {
                checkbox.prop('checked', !checked);
            }
        },

        'keyup #m-filter-layers': function (e) {
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
        $('.m-layer-list').html('');
        filteredData.forEach(_.bind(function (layer) {
            var layerView = minerva.templates.layersListWidget({
                layer: layer,
                checked: _.contains(this.currentLayersInDatasets, this.generateUniqueLayerName(layer.layer_title))
            });
            $('.m-layer-list').append(layerView);
        }, this));
    },

    generateUniqueLayerName: function (layerName) {
        return layerName + '_' + this.sourceName;
    },

    layersInDatasets: function (collection) {
        return collection.map(function (model) {
            return this.generateUniqueLayerName(model.get('name'));
        }, this);
    },

    initialize: function (settings) {
        this.collection = settings.collection;
        this.setCurrentSource(settings.source);
    },

    render: function () {
        this.currentLayersInDatasets = this.layersInDatasets(this.collection);
        var modal = this.$el.html(minerva.templates.wmsLayersListWidget({
            layers: this.layers
        })).girderModal(this);
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

        this.layers.forEach(_.bind(function (layer) {
            var layerView = minerva.templates.layersListWidget({
                layer: layer,
                checked: _.contains(this.currentLayersInDatasets, this.generateUniqueLayerName(layer.layer_title))
            });
            $('.m-layer-list').append(layerView);
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
        this.sourceName = this.source.get('name');
        this.layers = this.source.getMinervaMetadata().layers;
    }

});
