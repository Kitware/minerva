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

        var numberOfPossibleLayers = this.collection.models.length;
        var numberOfLayersInSession = displayedDatasets.length;

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
        // Retrieve the first and last stack value in the collection
        var lastValueInStack = _.last((stackValues).sort(function(a, b) {
           return a - b;
        }));
        var firstValueInStack = _.first((stackValues).sort(function(a, b) {
           return a - b;
        }));

        if (option === 'moveToTop' && currentStack !== lastValueInStack) {
            dataset.set('stack', lastValueInStack + 1);
        } else if (option === 'moveToBottom' && currentStack !== (numberOfPossibleLayers - numberOfLayersInSession)) {
            dataset.set('stack', firstValueInStack - 1);
        } else if (option === 'moveUp' && currentStack !== lastValueInStack) {
            dataset.set('stack', currentStack + 1);
            (nextDataset || prevDataset).set('stack', currentStack);
        } else if (option === 'moveDown' && currentStack !== (numberOfPossibleLayers - numberOfLayersInSession)) {
            dataset.set('stack', currentStack - 1);
            (prevDataset || nextDataset).set('stack', currentStack);
        }

        // Re-set the layer order on the map and then set the new order
        dataset.set('order', null);
        dataset.set('order', option);
    },

    initialize: function (settings) {
        settings = settings || {};
        this.collection = settings.collection;
        this.layersOrderOptions = [
            {'title': 'move up', 'method': 'moveUp', 'class': 'up'},
            {'title': 'move down', 'method': 'moveDown', 'class': 'down'},
            {'title': 'move to top', 'method': 'moveToTop', 'class': 'double-up'},
            {'title': 'move to bottom', 'method': 'moveToBottom', 'class': 'double-down'}
        ];

        this.listenTo(this.collection, 'change:displayed change:order', function (dataset) {
            this.render(dataset);
        }, this);
    },

    render: function (dataset) {

        var displayedDatasets = _.filter(this.collection.models, function (set) {
            return set.get('displayed');
        });

        // Sort datasets by stack
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
