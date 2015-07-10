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
                        return 6 + Math.ceil(Math.sqrt(2 * d.__data.length));
                    }
                    return 4;
                }

                // range is PRGn 11 from Colorbrewer 2
                var colorRange = ["#40004b","#762a83","#9970ab","#c2a5cf","#e7d4e8","#f7f7f7","#d9f0d3","#a6dba0","#5aae61","#1b7837","#00441b"];
                var color = d3.scale.ordinal().range(colorRange);
                function fillColor(d) {
                    var i = 0, sum = 0;
                    if (d.__cluster) {
                        for (i = 0; i < d.__data.length; i += 1) {
                            if (d.__data[i].properties.resolution_method === 'geocode') {
                                sum += 0;
                            } else {
                                sum += 1;
                            }
                        }
                        return color(Math.floor(sum/d.__data.length));
                    } else {
                        if (d.properties.resolution_method === 'geocode') {
                            return colorRange[colorRange.length - 1];
                        } else {
                            return colorRange[0];
                        }
                    }
                }
                function strokeColor(d) {
                    if (d.__cluster) {
                        return 'black';
                    } else {
                        if (d.properties.resolution_method === 'geocode') {
                            return colorRange[colorRange.length - 1];
                        } else {
                            return colorRange[0];
                        }
                    }
                }

                var features = (JSON.parse(dataset.geoJsonData)).features;

                points
                .clustering({radius: 0.015})
                .position(function (d) {
                    if (d.__cluster) {
                        return {x:d.x, y:d.y};
                    }
                    return {
                        x: d.geometry.coordinates[0],
                        y: d.geometry.coordinates[1]
                    };
                }).style('radius', radius)
                    .style('fillColor', fillColor)
                    .style('strokeColor', strokeColor)
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
