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

    rearrange: function (displayedDatasets, dataset) {

        var currentDatasetIndex = _.indexOf(displayedDatasets, dataset);
        var displayedDatasetsCopy = displayedDatasets.slice();

        var firstItem = _.first(displayedDatasetsCopy);
        var lastItem = _.last(displayedDatasetsCopy);
        var temp;

        if (dataset.get('order') === 'moveToTop') {
          // displayedDatasetsCopy.splice(currentDatasetIndex, 0, dataset);
          temp = displayedDatasetsCopy[0];
          displayedDatasetsCopy[0] = displayedDatasetsCopy[currentDatasetIndex];
          displayedDatasetsCopy[currentDatasetIndex] = temp;
        } else if (dataset.get('order') === 'moveToBottom') {
          temp = displayedDatasetsCopy[displayedDatasetsCopy.length - 1];
          displayedDatasetsCopy[displayedDatasetsCopy.length - 1] = displayedDatasetsCopy[currentDatasetIndex];
          displayedDatasetsCopy[currentDatasetIndex] = temp;
        } else if (dataset.get('order') === 'moveDown') {
          if (displayedDatasetsCopy[currentDatasetIndex + 1]) {
            temp = displayedDatasetsCopy[currentDatasetIndex + 1];
            displayedDatasetsCopy[currentDatasetIndex + 1] = displayedDatasetsCopy[currentDatasetIndex];
            displayedDatasetsCopy[currentDatasetIndex] = temp;
          }
        } else {
          if (displayedDatasetsCopy[currentDatasetIndex - 1]) {
            temp = displayedDatasetsCopy[currentDatasetIndex - 1];
            displayedDatasetsCopy[currentDatasetIndex - 1] = displayedDatasetsCopy[currentDatasetIndex];
            displayedDatasetsCopy[currentDatasetIndex] = temp;
          }
        }

        return displayedDatasetsCopy;
    },

    initialize: function (settings) {
        settings = settings || {};
        this.collection = settings.collection;
        this.layersOrderOptions = [{'method': 'moveUp', 'class': 'up'}, {'method': 'moveDown', 'class': 'down'}, {'method': 'moveToTop', 'class': 'double-up'}, {'method': 'moveToBottom', 'class': 'double-down'}];
        this.listenTo(this.collection, 'change:displayed change:order', function (dataset) {
            this.render(dataset);
        }, this);
    },

    render: function (dataset) {

        var displayedDatasets = _.filter(this.collection.models, function (dataset) {
            return dataset.get('displayed');
        });

        var sortedDisplayedDatasets = _.sortBy(displayedDatasets, function (dataset) {
            return dataset.get('stack');
        });

        console.log(sortedDisplayedDatasets);

        this.$el.html(minerva.templates.layersPanel({
            datasets: sortedDisplayedDatasets,
            layersOrderOptions: this.layersOrderOptions
        }));

        return this;
    }
});
