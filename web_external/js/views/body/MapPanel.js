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
        if (dataset.get('meta').minerva.original_type === 'wms') {
            var datasetId = dataset.id;
            var baseUrl = dataset.get('meta').minerva.base_url;
            var layer = JSON.parse(dataset.get('meta').minerva.wms_params).layerName.slice(8);
            this.legend = 'data:image/png;base64,' + dataset.get('meta').minerva.legend;
            this.legendWidget[datasetId] = new minerva.views.LegendWidget({
                el: $('.legend-container'),
                parentView: this,
                id: datasetId,
                legend: this.legend
            });
            this.legendWidget[datasetId].render();
            this.legendWidget[datasetId].show();
            this.wmsLayers[datasetId] = this.map.createLayer('osm');
            // TODO: inclued projection in params ??
            var projection = 'EPSG:3857';
            this.wmsLayers[datasetId].gcs(projection);

            this.wmsLayers[datasetId].tileUrl(

                function (zoom, x, y) {
                    var xLowerLeft = geo.mercator.tilex2long(x, zoom);
                    var yLowerLeft = geo.mercator.tiley2lat(y + 1, zoom);
                    var xUpperRight = geo.mercator.tilex2long(x + 1, zoom);
                    var yUpperRight = geo.mercator.tiley2lat(y, zoom);

                    var sw = geo.mercator.ll2m(xLowerLeft, yLowerLeft, true);
                    var ne = geo.mercator.ll2m(xUpperRight, yUpperRight, true);
                    var bbox_mercator = sw.x + ',' + sw.y + ',' + ne.x + ',' + ne.y;
                    var params = {
                        SERVICE: 'WMS',
                        VERSION: '1.3.0',
                        REQUEST: 'GetMap',
                        LAYERS: layer,
                        STYLES: '',
                        BBOX: bbox_mercator,
                        WIDTH: 256,
                        HEIGHT: 256,
                        FORMAT: 'image/png',
                        TRANSPARENT: true,
                        SRS: projection,
                        TILED: true
                    };
                    return baseUrl + '?' + $.param(params);
                }
            );
        } else {
            if (!_.contains(this.datasets, dataset.id)) {

                dataset.once('m:dataLoaded', function (datasetId) {
                    var dataset = this.collection.get(datasetId);
                    var layer = this.map.createLayer('feature');

                    var reader = geo.createFileReader(dataset.geoFileReader, {layer: layer});
                    this.datasets[datasetId] = layer;

                    layer.clear();

                    reader.read(dataset.fileData, _.bind(function () {
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
        // Remove WMS layer, if any
        this.map.deleteLayer(this.wmsLayers[datasetId]);
        // Remove the legend, if any
        this.legendWidget[datasetId].remove(datasetId);
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
        this.wmsLayers = {};
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
