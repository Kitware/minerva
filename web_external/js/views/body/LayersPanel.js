minerva.views.LayersPanel = minerva.View.extend({

    events: {
        'click .remove-dataset-from-layer': 'removeDatasetEvent'
    },

    removeDatasetEvent: function (event) {
        var datasetId = $(event.currentTarget).attr('m-dataset-id');
        var dataset = this.collection.get(datasetId);
        dataset.set('displayed', false);
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

        // TODO technical debt centralize color schemes
        // YlGnBu
        var colorRange = ['#a1dab4', '#41b6c4', '#2c7fb8', '#253494'];
        // YlGn
        var colorRange2 = ['#c2e699', '#78c679', '#31a354', '#006837'];
        // YlOrBr
        var colorRange3 = ['#fed98e', '#fe9929', '#d95f0e', '#993404'];
        var colorRanges = {
            'YlGnBu': colorRange,
            'YlGn': colorRange2,
            'YlOrBr': colorRange3
        };

        this.$el.html(minerva.templates.layersPanel({
            datasets: displayedDatasets,
            colorRanges: colorRanges
        }));

        return this;
    }
});
