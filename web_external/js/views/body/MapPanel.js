minerva.views.MapPanel = minerva.View.extend({

    addDataset: function (dataset) {
        var datasetId = dataset.id;
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
        var datasetId = dataset.id;
        var layer = this.datasets[datasetId];
        if (layer) {
            layer.clear();
            layer.draw();
            delete this.datasets[datasetId];
        }
    },

    initialize: function (settings) {
        girder.events.on('m:layerDatasetLoaded', this.addDataset, this);
        girder.events.on('m:layerDatasetRemoved', this.removeDataset, this);
        // specifying the properties needed to initialize the geojs map
        // in an effort to separate what geojs needs from the structure of the
        // saved session.
        this.mapSettings = settings.mapSettings;
        this.datasets = {};
    },

    renderMap: function () {
        if (!this.map) {
            this.map = geo.map({
                node: '.mapPanelMap',
                center: this.mapSettings.center
            });
            this.map.createLayer(this.mapSettings.basemap);
            this.map.draw();
        }
    },

    render: function () {
        this.$el.html(minerva.templates.mapPanel());
        this.renderMap();
        return this;
    }
});
