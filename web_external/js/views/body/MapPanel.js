minerva.views.MapPanel = minerva.View.extend({

    events: {
        'click .m-save-current-baselayer': function () {
            this.session.sessionJsonContents.center = this.map.center();
            this.session.sessionJsonContents.zoom = this.map.zoom();
            this.session.saveSession();
        }
    },

    transitionToMsa: function (msa) {
        girder.restRequest({
            type: 'GET',
            path: 'minerva_analysis/msa_bounding_box',
            data: {
                msaName: msa,
                centroid: true
            }
        }).done(_.bind(function (boundingBox) {
            this.map.transition({
                center: {
                    x: boundingBox.coordinates[0],
                    y: boundingBox.coordinates[1]
                },
                zoom: _.max([8, this.map.zoom()]),
                duration: 200
            });
        }, this));
    },

    _specifyWmsDatasetLayer: function (dataset, layer) {
        var minervaMetadata = dataset.getMinervaMetadata();
        var baseUrl = minervaMetadata.base_url;
        if (minervaMetadata.hasOwnProperty('credentials')) {
            baseUrl = '/wms_proxy/' + encodeURIComponent(baseUrl) + '/' +
                minervaMetadata.credentials;
        }
        var layerName = minervaMetadata.type_name;
        var projection = 'EPSG:3857';
        layer.gcs(projection);
        layer.tileUrl(
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
                    VERSION: '1.1.1',
                    REQUEST: 'GetMap',
                    LAYERS: layerName,
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
    },

    esToggleClustering: function (evt) {
        if (this.esClustered) {
            this.esPointFeature.clustering(false);
            this.esClustered = false;
        } else {
            this.esPointFeature.clustering({radius: 0.0});
            this.esClustered = true;
        }

        this.map.draw();
    },

    _esMouseover: function (evt) {
        var label, position;

        if (evt.data.__cluster) {
            label = 'Cluster containing ' + evt.data.__data.length + ' points.';
            position = this.map.gcsToDisplay({
                x: evt.data.x,
                y: evt.data.y
            });
        } else {
            label = 'it\'s a point!';
            position = this.map.gcsToDisplay({
                x: Number(evt.data.properties.latitude[0]),
                y: Number(evt.data.properties.longitude[0])
            });
        }

        $(this.uiLayer.node()).append(
            '<div id="example-overlay">' + label + '</div>'
        );

        $('#example-overlay').css('position', 'absolute');
        $('#example-overlay').css('left', position.x + 'px');
        $('#example-overlay').css('top', position.y + 'px');
    },

    _esMouseout: function (evt) {
        $('#example-overlay').remove();
    },

    _esMouseclick: function (evt) {
        var ads;

        if (evt.data.__cluster) {
            ads = _.pluck(evt.data.__data, 'properties');
        } else {
            ads = [evt.data.properties];
        }

        // Each property of each ad is an array with 1 element.. do some normalizing
        ads = _.map(ads, function (f) {
            return _.object(_.keys(f),
                            _.map(_.values(f), _.first));
        });

        this.imagespacePanel().ads = ads;
        this.imagespacePanel().render();
    },

    imagespacePanel: function () {
        if (!this._imagespacePanel) {
            this._imagespacePanel = new minerva.views.ImagespacePanel({
                el: '.imagespacePanel',
                parentView: this
            });
        }

        return this._imagespacePanel;
    },

    ga_data: function (data, visibility, visibleData) {
        if (data === true || data === false) {
            visibleData = data;
            data = undefined;
        }
        if (data !== undefined) {
            this.data = data;
            this.dataUpdated = new Date().getTime();
            this.dataVisible = null;
        }
        if (visibility !== undefined &&
            !_.isEqual(visibility, this.dataVisibilityParams)) {
            this.dataVisibilityParams = visibility;
            this.dataVisible = null;
        }
        if (!this.dataVisible && visibleData && this.data) {
            var vis = this.dataVisibilityParams, col;
            data = this.data;
            if (vis && vis.dateColumn && data.data && data.columns &&
                data.columns[vis.dateColumn] !== undefined && (
                    vis.dateMin || vis.dateMax)) {
                data = _.clone(data);
                col = data.columns[vis.dateColumn];
                data.data = _.filter(data.data, function (d) {
                    return ((!vis.dateMin || d[col] >= vis.dateMin) &&
                            (!vis.dateMax || d[col] < vis.dateMax));
                });
            }
            if (vis && vis.maxPoints) {
                if (data === this.data) {
                    data = _.clone(data);
                }
                data.data = data.data.slice(0, vis.maxPoints);
            }
            if (vis && vis.sortByDate && vis.dateColumn && data.columns &&
                data.columns[vis.dateColumn] !== undefined) {
                if (data === this.data) {
                    data = _.clone(data);
                }
                col = data.columns[vis.dateColumn];
                _.each(data.data, function (d, idx) {
                    d.origOrder = idx;
                });
                data.data = _.sortBy(data.data, function (d) {
                    return d[col];
                });
                data.sortedIndices = [];
                _.each(data.data, function (d, idx) {
                    data.sortedIndices[d.origOrder] = idx;
                    delete d.origOrder;
                });
            }
            this.dataVisible = data;
            this.dataVisibleUpdated = new Date().getTime();

            // @dl removed dataVisibility trigger
        }
        return visibleData ? this.dataVisible : this.data;
    },

    _renderElasticDataset: function (datasetId) {
        this.dataset = this.collection.get(datasetId);
        this.data = JSON.parse(this.dataset.fileData);
        this.msa = this.dataset.get('meta').minerva.elastic_search_params.msa;
        this.esFeatureLayer = this.map.createLayer('feature', {
            renderer: 'vgl'
        });
        this.esPointFeature = this.esFeatureLayer.createFeature('point', {
            primitiveShape: 'triangle',
            selectionAPI: true,
            dynamicDraw: true
        });
        this.doAnimation = false;
        this.datasetLayers[datasetId] = this.esFeatureLayer;

        if (!this.doAnimation) {
            var color = '#C21529',
                opacity = 0.65;

            this.esPointFeature
                .clustering({radius: 0.0})
                .style({
                    fillColor: color,
                    fillOpacity: opacity,
                    stroke: false,
                    radius: function (d) {
                        var baseRadius = 2;

                        if (d.__cluster) {
                            return baseRadius + Math.log10(d.__data.length);
                        }

                        return baseRadius;
                    }
                })
                .position(function (d) {
                    return {
                        x: d.geometry.coordinates[0],
                        y: d.geometry.coordinates[1]
                    };
                })
                .geoOn(geo.event.feature.mouseover, _.bind(this._esMouseover, this))
                .geoOn(geo.event.feature.mouseout, _.bind(this._esMouseout, this))
                .geoOn(geo.event.feature.mouseclick, _.bind(this._esMouseclick, this))
                .data(this.data.features);

            this.map.draw();
            this.transitionToMsa(this.msa);

            return;
        }

        this.ga_data({
            columns: {
                latitude: 0,
                longitude: 1,
                posttime: 2
            },
            data: _.map(this.data.features, function(x) {
                return [parseFloat(x.properties.latitude[0]),
                        parseFloat(x.properties.longitude[0]),
                        moment(x.properties.posttime[0]).valueOf()];
            })
        });

        this.transitionToMsa(this.msa);

        this.trigger('m:elastic-ready-for-animation');

        this.esFeatureLayer.binForAnimation = _.bind(function (params, start, range, binWidth) {
            console.log('binForAnimation called');

            var mapData = this.ga_data(true),
                dateColumn = this.getDateColumn(),
                data, i;

            if (!mapData || !mapData.data) {
                return;
            }
            data = mapData.data;
            var dataLength = mapData.numPoints;
            // @dl hardcoding the data length to be data.length - not sure of ramifications
            dataLength = data.length;
            if (data.length < dataLength) {
                dataLength = data.length;
            }
            var dataBin = new Int32Array(dataLength);
            // @dl hardcode, look for other instance of elastic
            params.layers.elastic = {dataBin: dataBin};
            for (i = 0; i < dataLength; i += 1) {
                dataBin[i] = Math.floor(((
                    data[i][dateColumn] - start) % range) /
                                        binWidth);
            }
        }, this);

        this.esFeatureLayer.animateFrame = _.bind(function (options) {
            console.log('animateFrame called');

            // @dl hardcode
            this.datakey = 'elastic';

            if (!options.layers[this.datakey]) {
                return;
            }
            var mapData = this.ga_data(true),
                visOpac = (options.opacity || 0.1),
                dataBin = options.layers[this.datakey].dataBin,
                i, j, v, opac, vis, vpf;

            if (true) {
                visOpac = Math.min(0.65 * 1.5, 1);
            }
            vpf = this.esPointFeature.verticesPerFeature();
            opac = this.esPointFeature.actors()[0].mapper().getSourceBuffer('fillOpacity');
            for (i = 0, v = 0; i < mapData.numPoints; i += 1) {
                vis = this.inAnimationBin(
                    dataBin[i], options.numBins, options.step,
                    options.substeps);
                vis = (vis ? visOpac : 0);
                for (j = 0; j < vpf; j += 1, v += 1) {
                    opac[v] = vis;
                }
            }
            this.esPointFeature.actors()[0].mapper().updateSourceBuffer('fillOpacity');

        }, this);

        this.esFeatureLayer.updateMapParams = _.bind(function (params) {
            console.log('layer updatemapparams called');

            var visParam = {
                dateMin: params['display-date_min'] ?
                    0 + moment.utc(params['display-date_min']) : null,
                dateMax: params['display-date_max'] ?
                    0 + moment.utc(params['display-date_max']) : null,
                dateColumn: 'posttime',
                maxPoints: null
            },
                data = this.ga_data(true, visParam),
                visible = !!(data);
            this.esPointFeature.visible(visible);
            var recent = true;

            if (!visible) {
                return;
            }

            this.maximumMapPoints = 99999999;

            data.numPoints = Math.min(data.data.length, this.maximumMapPoints);
            data.x_column = data.columns.longitude;
            data.y_column = data.columns.latitude;
            var pointData = data.data || [];
            if (pointData.length > this.maximumMapPoints) {
                pointData = data.data.slice(0, this.maximumMapPoints);
            }
            var color = '#C21529',
                opacity = 0.65,
                radius = 5;

            this.esPointFeature.data(pointData)
                .style({
                    fillColor: color,
                    fillOpacity: opacity,
                    strokeColor: 'black',
                    strokeOpacity: 1,
                    strokeWidth: 5,
                    stroke: function (d) {
                        return d._selected;
                    },
                    radius: radius
                })
                .position(function (d) {
                    return {
                        x: d[data.x_column],
                        y: d[data.y_column]
                    };
                });


        }, this);
    },

    inAnimationBin: function (bin, numBins, step, substeps) {
        if (bin < 0 || bin >= numBins) {
            return false;
        }
        return ((bin >= step && bin < step + substeps) ||
                bin + numBins < step + substeps);
    },

    getDateColumn: function () {
        var data = this.ga_data();

        if (!data || !data.columns) {
            return null;
        }

        return data.columns.posttime;
    },

    addDataset: function (dataset) {
        // TODO HACK
        // deleting and re-adding ui layer to keep it on top
        //this.map.deleteLayer(this.uiLayer);
        // this causes a problem when there are at least two feature layers,
        // so for now it is commented out
        // this means we keep re-adding the ui layer each time a dataset is
        // added as a feature layer, which is even more of a HACK
        if (!_.contains(this.datasetLayers, dataset.id)) {
            if (dataset.getDatasetType() === 'wms') {
                var datasetId = dataset.id;
                var layer = this.map.createLayer('osm', {
                    baseUrl: 'http://otile1.mqcdn.com/tiles/1.0.0/sat/',
                    attribution: null
                });
                this.datasetLayers[datasetId] = layer;
                this._specifyWmsDatasetLayer(dataset, layer);

                this.legendWidget[datasetId] = new minerva.views.LegendWidget({
                    el: $('.m-map-legend-container'),
                    parentView: this,
                    id: datasetId,
                    legend: 'data:image/png;base64,' + dataset.getMinervaMetadata().legend
                });
                this.legendWidget[datasetId].render();
                this.legendWidget[datasetId].show();

                // Add the UI slider back
                this.uiLayer = this.map.createLayer('ui');
                this.map.draw();
            } else if (dataset.getDatasetType() === 'elasticsearch') {
                dataset.once('m:dataLoaded', _.bind(this._renderElasticDataset, this));
                dataset.loadData();
            } else {
                // Assume the dataset provides a reader, so load the data
                // and adapt the dataset to the map with the reader.
                dataset.once('m:dataLoaded', function (datasetId) {
                    // TODO: allow these datasets to specify a legend.
                    var dataset = this.collection.get(datasetId);
                    var layer = this.map.createLayer('feature');

                    var reader = geo.createFileReader(dataset.geoFileReader, {layer: layer});
                    this.datasetLayers[datasetId] = layer;

                    layer.clear();

                    reader.read(dataset.fileData, _.bind(function () {
                        this.uiLayer = this.map.createLayer('ui');
                        this.map.draw();
                    }, this));
                }, this);

                dataset.loadData();
            }
        }
    },

    removeDataset: function (dataset) {
        var datasetId = dataset.id;
        var layer = this.datasetLayers[datasetId];
        if (_.has(this.legendWidget, datasetId)) {
            this.legendWidget[datasetId].remove(datasetId);
            delete this.legendWidget[datasetId];
        }
        if (_.contains(['wms', 'elasticsearch'], dataset.getDatasetType()) && layer) {
            this.map.deleteLayer(layer);
        } else if (layer) {
            layer.clear();
            layer.draw();
        }
        delete this.datasetLayers[datasetId];
    },

    initialize: function (settings) {
        this.once('m:rendermap.after', _.bind(function () {
            this.animationControlsWidgetView =
                new minerva.views.AnimationControlsWidget({
                    parentView: this,
                    el: $('li.animationPanel')
                });

            // Tell the user what MSA they're viewing when they move the map.
            // It determines this based on which MSA is taking up the most area.
            this.uiLayer.geoOn(geo.event.pan, _.debounce(_.bind(function () {
                var $el = $('#m-session-info');

                // Only try to determine where they're looking if they're zoomed in
                // a decent amount
                if (this.map.zoom() <= 7.5) {
                    $el.empty();
                    return;
                }

                var bounds = this.map.bounds();

                girder.restRequest({
                    type: 'GET',
                    path: 'minerva_analysis/terra_msa_from_bbox',
                    data: {
                        xMin: bounds.lowerLeft.x,
                        yMin: bounds.lowerLeft.y,
                        xMax: bounds.upperRight.x,
                        yMax: bounds.upperRight.y
                    },
                    success: function (data) {
                        // If we got an MSA back that has an intersecting area > 0,
                        // display information about it
                        if (_.size(data) === 2 && data[1] > 0) {
                            $el.html(minerva.templates.sessionInfo({
                                msa: _.first(data)
                            }));
                        }
                    }
                });
            }, this), 500));

        }, this));

        this.session = settings.session;
        this.listenTo(this.session, 'm:mapUpdated', function () {
            // TODO for now only dealing with center
            if (this.map) {
                // TODO could better separate geojs needs from session storage
                this.map.center(this.session.sessionJsonContents.center);
            }
        });
        this.datasetLayers = {};
        this.legendWidget = {};

        this.collection = settings.collection;
        this.listenTo(this.collection, 'change:displayed', function (dataset) {
            // There is a slight danger of a user trying to add a dataset
            // to a session while the map is not yet created.  If the map isn't
            // created, we don't need to add/remove the datasets here because
            // they will be taken care of in the renderMap initialization block.
            if (this.mapCreated) {
                if (dataset.get('displayed')) {
                    this.addDataset(dataset);
                } else {
                    this.removeDataset(dataset);
                }
            }
        }, this);

        window.minerva_map = this;
    },

    renderMap: function () {
        if (!this.map) {
            this.map = geo.map({
                node: '.mapPanelMap',
                // Center of aggregate MSA bounding box
                center: {
                    x: -111.33493,
                    y: 44.3101665
                },
                zoom: 3.8
            });
            this.map.createLayer('osm', {
                tileUrl: 'http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
                attribution: '<div class="leaflet-control-attribution leaflet-control">© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="http://cartodb.com/attributions#basemaps">CartoDB</a>, CartoDB <a href="http://cartodb.com/attributions" target="_blank">attribution</a></div>'
            });


            this.uiLayer = this.map.createLayer('ui');
            this.mapCreated = true;
            _.each(this.collection.models, function (dataset) {
                if (dataset.get('displayed')) {
                    this.addDataset(dataset);
                }
            }, this);

            window.minerva_map = this;
        }
        this.map.draw();

        this.trigger('m:rendermap.after', this);
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
