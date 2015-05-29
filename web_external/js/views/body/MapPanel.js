minerva.views.MapPanel = minerva.View.extend({

    events: {
        'click .m-save-current-baselayer': function () {
            this.session.sessionJsonContents.center = this.map.center();
            this.session.sessionJsonContents.zoom = this.map.zoom();
            this.session.saveSession();
        }
    },

    addDataset: function (dataset) {
        // TODO HACK
        // deleting and re-adding ui layer to keep it on top
        //this.map.deleteLayer(this.uiLayer);
        // this causes a problem when there are at least two feature layers,
        // so for now it is commented out
        // this means we keep re-adding the ui layer each time a dataset is
        // added as a feature layer, which is even more of a HACK
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
                        this.uiLayer = this.map.createLayer('ui');
                        this.uiLayer.createWidget('slider');
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
        this.session = settings.session;
        this.listenTo(this.session, 'm:mapUpdated', function () {
            // TODO for now only dealing with center
            if (this.map) {
                // TODO could better separate geojs needs from session storage
                this.map.center(this.session.sessionJsonContents.center);
            }
        });
        this.datasets = {};
    },

    renderMap: function () {
        if (!this.map) {
            this.map = geo.map({
                node: '.mapPanelMap',
                center: this.session.sessionJsonContents.center,
                zoom: this.session.sessionJsonContents.zoom
            });
            this.map.createLayer(this.session.sessionJsonContents.basemap);
            this.uiLayer = this.map.createLayer('ui');
            this.uiLayer.createWidget('slider');
            window.map = this.map;
        }
        this.map.draw();
    },

    render: function () {
        this.$el.html(minerva.templates.mapPanel());
        this.renderMap();
        var tooltipProperties = {
            placement: 'left',
            delay: 400,
            container: this.$el,
            trigger: 'hover'
        };
        this.$('.m-save-current-baselayer').tooltip(tooltipProperties);
        return this;
    }
});
