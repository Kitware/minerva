minerva.views.LayersPanel = minerva.View.extend({

    events: {
        'click .remove-dataset-from-layer': 'removeDataset'
    },

    removeDataset: function (event) {
        var datasetId = $(event.currentTarget).attr('m-dataset-id');
        var dataset = this.layersDatasets[datasetId];
        delete this.layersDatasets[datasetId];
        girder.events.trigger('m:layerDatasetRemoved', dataset);
        this.render();
    },

    addDataset: function (dataset) {
        this.layersDatasets[dataset.get('id')] = dataset;
        dataset.off('m:geojsonLoaded').on('m:geojsonLoaded', function () {
            girder.events.trigger('m:layerDatasetLoaded', this);
        }).getGeoJson();
        this.render();
    },

    initialize: function (settings) {
        this.layersDatasets = {};
        girder.events.on('m:addDatasetToLayer', _.bind(this.addDataset, this));
    },

    render: function () {
        this.$el.html(minerva.templates.layersPanel({datasets: this.layersDatasets}));

        return this;
    }
});



