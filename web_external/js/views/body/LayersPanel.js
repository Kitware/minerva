minerva.views.LayersPanel = minerva.View.extend({

    events: {
        'click .remove-dataset-from-layer': 'removeDatasetEvent',
        'change .opacity-range': 'changeLayerOpacity'
    },

    removeDatasetEvent: function (event) {
        var datasetId = $(event.currentTarget).attr('m-dataset-id');
        var dataset = this.collection.get(datasetId);
        dataset.set('displayed', false);
    },

    changeLayerOpacity: function (event) {
      console.log('called', event.target.value);
    },

    initialize: function (settings) {
        settings = settings || {};
        this.collection = settings.collection;
        this.listenTo(this.collection, 'change:displayed', function () {
            this.render();
        }, this);
    },

    render: function () {
        var displayedDatasets = _.filter(this.collection.models, function (dataset) {
            return dataset.get('displayed');
        });
        this.$el.html(minerva.templates.layersPanel({
            datasets: displayedDatasets
        }));

        return this;
    }
});
