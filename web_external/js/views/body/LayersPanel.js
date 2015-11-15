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
        var prevDataset, nextDataset;
        var datasetId = $(event.currentTarget).attr('m-dataset-id');
        var option = $(event.currentTarget).attr('m-order-option');
        var dataset = this.collection.get(datasetId);
        var currentDatasetIndex = _.indexOf(this.collection.models, dataset);
        var displayedDatasets = _.filter(this.collection.models, function (set) {
            return set.get('displayed');
        });

        if (displayedDatasets[currentDatasetIndex - 1]) {
          prevDataset = displayedDatasets[currentDatasetIndex - 1];
        }

        if (displayedDatasets[currentDatasetIndex + 1]) {
          nextDataset = displayedDatasets[currentDatasetIndex + 1];
        }

        var stackValues = _.map(this.collection.models, function (dataset) {
            return dataset.get('stack');
        });

        var currentStack = dataset.get('stack');
        // Retrieve the last stack value in the collection
        var lastValueInStack = _.last((stackValues).sort());
        var firstValueInStack = _.first((stackValues).sort());

        // Set the layer order on the map
        dataset.set('order', option);

        if (option === 'moveToTop' && currentStack !== lastValueInStack) {
            dataset.set('stack', lastValueInStack + 1);
        } else if (option === 'moveToBottom' && currentStack !== firstValueInStack) {
            dataset.set('stack', firstValueInStack - 1);
        } else if (option === 'moveUp' && currentStack !== lastValueInStack) {
            dataset.set('stack', currentStack + 1);
            nextDataset.set('stack', currentStack);
        } else if (option === 'moveDown' && currentStack !== firstValueInStack) {
            dataset.set('stack', currentStack - 1);
            prevDataset.set('stack', currentStack);
        }
    },

    initialize: function (settings) {
        settings = settings || {};
        this.collection = settings.collection;
        this.layersOrderOptions = [{'method': 'moveUp', 'class': 'up'}, {'method': 'moveDown', 'class': 'down'}, {'method': 'moveToTop', 'class': 'double-up'}, {'method': 'moveToBottom', 'class': 'double-down'}];
        this.listenTo(this.collection, 'change:displayed change:order change:stack', function (dataset) {
            this.render(dataset);
        }, this);
    },

    render: function (dataset) {

        var displayedDatasets = _.filter(this.collection.models, function (set) {
            return set.get('displayed');
        });

        var sortedDisplayedDatasets = _.sortBy(displayedDatasets, function (set) {
            return set.get('stack');
        }).reverse();

        this.$el.html(minerva.templates.layersPanel({
            datasets: sortedDisplayedDatasets,
            layersOrderOptions: this.layersOrderOptions
        }));

        return this;
    }
});
