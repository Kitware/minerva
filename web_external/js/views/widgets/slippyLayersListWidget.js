/**
* This widget displays the list of slippy layers
*/
minerva.views.SlippyLayersListWidget = minerva.View.extend({

    events: {
        'submit #m-add-layers-form': function (e) {
            e.preventDefault();
            var slippySource = this.source;

            this.$('form#m-add-layers-form :input.m-add-layers').each(_.bind(function (index, layer) {
                var typeName = $(layer).attr('typeName');
                var layerName = $(layer).attr('name');

                if (layer.checked && !_.contains(this.currentLayersInDatasets, this.generateUniqueLayerName(layerName, slippySource.get('_id')))) {
                    this.currentLayersInDatasets.push(this.generateUniqueLayerName(layerName, slippySource.get('_id')));

                    var params = {
                        typeName: typeName,
                        name: layerName,
                        slippySourceId: slippySource.get('_id')
                    };

                    var slippyDataset = new minerva.models.SlippyDatasetModel({});

                    slippyDataset.once('m:slippyDatasetAdded', function () {
                        this.$el.modal('hide');
                        this.collection.add(slippyDataset);
                    }, this).createSlippyDataset(params);
                }
            }, this));
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
                checked: _.contains(this.currentLayersInDatasets, this.generateUniqueLayerName(layer.layer_title, this.source.get('_id')))
            });
            $('.m-layer-list').append(layerView);
        }, this));
    },

    generateUniqueLayerName: function (layerName, sourceId) {
        return layerName + '_' + sourceId;
    },

    layersInDatasets: function (collection) {
        var slippyLayers = collection.filter(function (model) {
            return model.getDatasetType() === 'slippy';
        }, this);
        var layers = slippyLayers.map(function (model) {
            var sourceId = model.metadata().source_id;
            return this.generateUniqueLayerName(model.get('name'), sourceId);
        }, this);
        return layers;
    },

    initialize: function (settings) {
        this.collection = settings.collection;
        this.setCurrentSource(settings.source);
    },

    render: function () {
        this.currentLayersInDatasets = this.layersInDatasets(this.collection);
        var modal = this.$el.html(minerva.templates.slippyLayersListWidget({
            layers: this.layers
        })).girderModal(this);
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

        this.layers.forEach(_.bind(function (layer) {
            var layerView = minerva.templates.layersListWidget({
                layer: layer,
                checked: _.contains(this.currentLayersInDatasets, this.generateUniqueLayerName(layer.layer_title, this.source.get('_id')))
            });
            $('.m-layer-list').append(layerView);
        }, this));

        return this;
    },

    /**
     * Change the current slippySource whose layers will be displayed, and render.
     *
     * @param  slippySource  The slippySource to display.
     */
    setCurrentSource: function (slippySource) {
        this.source = slippySource;
        this.sourceName = this.source.get('name');
        this.layers = this.source.metadata().layers;
    }

});
