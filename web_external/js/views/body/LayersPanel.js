minerva.views.LayersPanel = minerva.View.extend({

    events: {
        'click .m-remove-dataset-from-layer': 'removeDatasetEvent',
        'change .m-opacity-range': 'changeLayerOpacity',
        'click .m-order-layer': 'reorderLayer'
    },

    removeDatasetEvent: function (event) {
        var datasetId = $(event.currentTarget).attr('m-dataset-id');
        var dataset = this.collection.get(datasetId);
        dataset.set('displayed', false);
    },

    changeLayerOpacity: function (event) {
        var datasetId = $(event.currentTarget).attr('m-dataset-id');
        var dataset = this.collection.get(datasetId);
        var opacity = event.target.value;
        dataset.set('opacity', parseFloat(opacity));
    },

    reorderLayer: function (event) {
        var datasetId = $(event.currentTarget).attr('m-dataset-id');
        var option = $(event.currentTarget).attr('m-order-option');
        var dataset = this.collection.get(datasetId);
        dataset.set('order', option);
    },

    initialize: function (settings) {
        settings = settings || {};
        this.collection = settings.collection;
        this.layersOrderOptions = [{'method': 'moveUp', 'class': 'up'}, {'method': 'moveDown', 'class': 'down'}, {'method': 'moveToTop', 'class': 'double-up'}, {'method': 'moveToBottom', 'class': 'double-down'}];
        this.listenTo(this.collection, 'change:displayed', function () {
            this.render();
        }, this);
    },

    render: function () {
        var displayedDatasets = _.filter(this.collection.models, function (dataset) {
            return dataset.get('displayed');
        });
        this.$el.html(minerva.templates.layersPanel({
            datasets: displayedDatasets,
            layersOrderOptions: this.layersOrderOptions
        }));

        return this;
    }
});
