minerva.views.MapPanel = minerva.View.extend({

    addDataset: function (dataset) {
        var datasetId = dataset.get('id');
        if (!_.contains(this.datasets, datasetId)) {
            var layer,
                reader,
                data;
            layer = this.map.createLayer('feature');
            this.datasets[datasetId] = layer;
            reader = geo.createFileReader('jsonReader', {layer: layer});
            // load a geojson file on top of the map
            $.ajax({
                url: girder.apiRoot + '/file/' + dataset.geojsonFileId + '/download',
                contentType: 'application/json',
                success: function (_data) {
                    data = _data;
                },
                complete: _.bind(function () {
                    layer.clear();
                    reader.read(data, _.bind(function () {
                        this.map.draw();
                    }, this));
                }, this)
            });
        }
    },

    removeDataset: function (dataset) {
        var datasetId = dataset.get('id');
        layer = this.datasets[datasetId];
        layer.clear();
        layer.draw();
        delete this.datasets[datasetId];
    },


    initialize: function () {
        girder.events.on('m:layerDatasetLoaded', _.bind(this.addDataset, this));
        girder.events.on('m:layerDatasetRemoved', _.bind(this.removeDataset, this));
        this.datasets = {};
    },

    renderMap: function (geojsonFile) {
        if (!this.map) {
            this.map = geo.map({
                node: '.mapPanelMap',
                center: { x: -100, y: 36.5},

            });
            this.map.createLayer('osm');
            this.map.draw();
        }
    },

    render: function () {
        this.$el.html(minerva.templates.mapPanel());
        this.renderMap();
        return this;
    }
});
