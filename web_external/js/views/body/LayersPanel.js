minerva.views.LayersPanel = minerva.View.extend({

    events: {
        'click .remove-dataset-from-layer': 'removeDatasetEvent'
    },

    removeDatasetEvent: function (event) {
        var datasetId = $(event.currentTarget).attr('m-dataset-id');
        var dataset = this.collection.get(datasetId);
        dataset.set('displayed', false);
    },

    addDatasetToLayers: function (dataset) {
        dataset.once('m:geojsonLoaded', function () {
            girder.events.trigger('m:layerDatasetLoaded', dataset);
        }).getGeoJson();
    },

    initialize: function (settings) {
        settings = settings || {};
        this.collection = settings.collection;
        this.listenTo(this.collection, 'g:changed', function () {
            this.render();
        }, this).listenTo(this.collection, 'change:displayed', function (dataset) {
            if (dataset.get('displayed')) {
                this.addDatasetToLayers(dataset);
            } else {
                girder.events.trigger('m:layerDatasetRemoved', dataset);
            }
            this.render();
        }, this).listenTo(this.collection, 'add', function (dataset) {
            if (dataset.get('displayed')) {
                this.addDatasetToLayers(dataset);
            }
            this.render();
        }, this).listenTo(this.collection, 'remove', function (dataset) {
            // TODO the event trigger shouldn't be necessary because the dataset would already be
            // removed from the layers before it is deleted; keeping this here as a
            // reminder that the panels should possibly be more independent
            // though there is also a symmetry with letting the map know about an added dataset
            // even though that can't currently happen with the display=True state
            girder.events.trigger('m:layerDatasetRemoved', dataset);
            this.render();
        }, this);
    },

    render: function () {
        var displayedDatasets = _.filter(this.collection.models, function (dataset) { return dataset.get('displayed'); });
        this.$el.html(minerva.templates.layersPanel({
            datasets: displayedDatasets
        }));

        return this;
    }
});
