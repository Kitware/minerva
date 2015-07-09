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
            dataset.once('m:geoJsonDataLoaded', function () {
                var layer = this.map.createLayer('feature', {'render': 'vgl'});
                var points = layer.createFeature('point');
                this.datasets[datasetId] = layer;

                function radius(d) {
                    if (d.__cluster) {
//                        console.log(d.__data.length);
                        return 6 + Math.ceil(Math.sqrt(d.__data.length));
                    }
                    return 4;
                }
                //pointColor = {
                    //True: {"r": 241./255., "g": 163./255., "b": 64./255.},
                    //False: {"r": 153./255., "g": 142./255., "b": 195./255.}
                //}
//['rgb(64,0,75)','rgb(118,42,131)','rgb(153,112,171)','rgb(194,165,207)','rgb(231,212,232)','rgb(247,247,247)','rgb(217,240,211)','rgb(166,219,160)','rgb(90,174,97)','rgb(27,120,55)','rgb(0,68,27)']
                function fill(d) {
                    if (d.__cluster) {
                        return false;
                    }
                    return true;
                }

                var features = (JSON.parse(dataset.geoJsonData)).features;

                points
                .clustering({radius: 0.015})
//                .clustering(true)
                .position(function (d) {
                    if (d.__cluster) {
                        return {x:d.x, y:d.y};
                    }
                    return {
                        x: d.geometry.coordinates[0],
                        y: d.geometry.coordinates[1]
                    };
                }).style('radius', radius)
                    .style('fill', fill)
                    .style('strokeColor', 'black')
                    .data(features);

                this.uiLayer = this.map.createLayer('ui');
                this.uiLayer.createWidget('slider');
                this.map.draw();
            }, this);
            dataset.loadGeoJsonData();
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
