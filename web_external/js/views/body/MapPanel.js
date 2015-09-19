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
        if (!_.contains(this.datasets, dataset.id)) {
            if (dataset.getDatasetType() === 'wms') {
                // Allow the dataset to specify the tile layer.
                // TODO: Showing a WMS layer hides the slider.
                var datasetId = dataset.id;
                this.datasets[datasetId] = this.map.createLayer('osm');
                dataset.specifyTileLayer(this.datasets[datasetId]);
                this.legendWidget[datasetId] = new minerva.views.LegendWidget({
                    el: $('.legend-container'),
                    parentView: this,
                    id: datasetId,
                    legend: dataset.getLegend()
                });
                this.legendWidget[datasetId].render();
                this.legendWidget[datasetId].show();
                // Add the UI slider back
                this.uiLayer = this.map.createLayer('ui');
                this.uiLayer.createWidget('slider');
                this.map.draw();
            } else {
                // Assume the dataset provides a reader, so load the data
                // and adapt the dataset to the map with the reader.
                dataset.once('m:dataLoaded', function (datasetId) {
                    // TODO: allow these datasets to specify a legend.
                    var dataset = this.collection.get(datasetId);
                    var layer = this.map.createLayer('feature');

                    var reader = geo.createFileReader(dataset.geoFileReader, {layer: layer});
                    this.datasets[datasetId] = layer;

                    layer.clear();

                    reader.read(dataset.fileData, _.bind(function () {
                        // Add the UI slider back
                        this.uiLayer = this.map.createLayer('ui');
                        this.uiLayer.createWidget('slider');
                        this.map.draw();
                    }, this));
                }, this);

                dataset.loadData();
            }
        }
    },

    removeDataset: function (dataset) {
        var datasetId = dataset.id;
        var layer = this.datasets[datasetId];
        if (_.has(this.legendWidget, datasetId)) {
            this.legendWidget[datasetId].remove(datasetId);//hide();
            delete this.legendWidget[datasetId];
        }
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
        this.legendWidget = {};
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
        }
        this.map.draw();
    },

    render: function () {
        this.$el.html(minerva.templates.mapPanel({}));
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
