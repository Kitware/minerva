import $ from 'jquery';
import _ from 'underscore';
import 'jquery-ui-bundle';
import 'jquery-ui-bundle/jquery-ui.css';
import { restRequest } from 'girder/rest';

import View from '../view';
import contentTemplate from '../../templates/widgets/featureInfoContent.pug';
import GeoJSONStyle from '../../models/GeoJSONStyle';
import template from '../../templates/widgets/featureInfoWidget.pug';
import '../../stylesheets/widgets/featureInfoWidget.styl';

const FeatureInfoWidget = View.extend({

    initialize: function (settings) {
        this.modal = {};
        this.map = settings.map;
        this.version = settings.version;
        this.layers = settings.layers;
        this.callback = settings.callback;
        this.setElement($('#m-map-panel'));
        this.content = '';
        this.fixedParams = 'REQUEST=GetFeatureInfo&' +
            'EXCEPTIONS=application%2Fvnd.ogc.se_xml&' +
            'SERVICE=WMS&FEATURE_COUNT=50&styles=&' +
            'srs=EPSG:3857&INFO_FORMAT=application/json&format=image%2Fpng';
    },

    callInfo(event) {
        var that = this;

        // function getWMSLayersInfo() {
        //     var wmsLayers = _.chain(this.parentView.collection.models)
        //         .filter(function (set) {
        //             return set.get('displayed') &&
        //                 set.get('visible') &&
        //                 set.getDatasetType() !== 'geojson' &&
        //                 set.getDatasetType() !== 'geojson-timeseries' &&
        //                 set.getDatasetType() !== 'geotiff'
        //         });
        //         .invoke('get', ['_id'])
        //         .value();
        //     return restRequest({
        //         url: '/minerva_get_feature_info',
        //         type: 'GET',
        //         data: {
        //             'activeLayers': wmsLayers,
        //             'bbox': mapParams.bbox,
        //             'x': mapParams.x,
        //             'y': mapParams.y,
        //             'width': mapParams.width,
        //             'height': mapParams.height
        //         }
        //     }).done((data) => {
        //         return JSON.parse(data);
        //     });
        // }

        function getInspectMapParams(event) {
            var mapParams = {};
            var coord = event.geo;
            var pnt = that.map.gcsToDisplay(coord);

            // Spherical Mercator projection.
            var mapBounds = that.map.bounds(undefined, 'EPSG:3857');

            if (mapBounds.left > mapBounds.right) {
                // 20037508.34 is the maximum extent of the Spherical Mercator projection.
                mapBounds.right = 20037508.34 + (20037508.34 - mapBounds.right);
            }
            mapParams['x'] = Math.round(pnt.x);
            mapParams['y'] = Math.round(pnt.y);
            mapParams['bbox'] = mapBounds.left + ',' + mapBounds.bottom + ',' + mapBounds.right + ',' + mapBounds.top;
            mapParams['width'] = that.map.node().width();
            mapParams['height'] = that.map.node().height();
            return mapParams;
        }

        var mapParams = getInspectMapParams(event);
        $.when(this.getWMSLayersInfo(mapParams),
            this.getGeojsonLayersInfo(event),
            this.getGeotiffLayersInfo(event))
            .done((...args) => {
                this.renderContents(_.flatten(args));
            });
    },
    renderContents(inspectResp) {
        if (inspectResp.length !== 0) {
            $('#m-feature-info-dialog').html(
                contentTemplate({
                    layersInfo: inspectResp
                })
            );
            $('#m-feature-info-dialog').dialog('open');
        }
    },

    render() {
        this.$el.append(template());
        this.$("#m-feature-info-dialog").dialog({
            autoOpen: false,
            width: 'auto'
        });
        return this;
    },

    getWMSLayersInfo(mapParams) {
        var wmsLayers = _.chain(this.parentView.collection.models)
            .filter((set) => {
                return set.get('displayed') && set.get('visible') &&
                    set.getDatasetType() !== 'geojson' &&
                    set.getDatasetType() !== 'geojson-timeseries' &&
                    set.getDatasetType() !== 'geotiff';
            })
            .invoke('get', ['_id'])
            .value();
        if (wmsLayers.length === 0) {
            return $.when([]);
        } else {
            return restRequest({
                url: '/minerva_get_feature_info',
                type: 'GET',
                data: {
                    'activeLayers': wmsLayers,
                    'bbox': mapParams.bbox,
                    'x': mapParams.x,
                    'y': mapParams.y,
                    'width': mapParams.width,
                    'height': mapParams.height
                }
            }).done(function (data) {
                var obj = JSON.parse(data);
                return obj;
            });
        }
    },

    /**
    * Filter out properties used for styling the geojson
    */
    filterStyleProperties(props) {
        var styleProps = _.keys(GeoJSONStyle.prototype.defaults);
        props = _.extend({}, props);
        _.each(styleProps, function (s) {
            delete props[s];
        });
        return props;
    },

    getGeojsonLayersInfo(event) {
        var geojsonLayers = [];
        _.chain(this.parentView.collection.models)
            .filter((set) => { return set.get('displayed') && set.get('visible') && (set.getDatasetType() === 'geojson' || set.getDatasetType() === 'geojson-timeseries'); })
            .map((dataset) => {
                var i;
                var name = dataset.get('name');
                var features = dataset.geoJsLayer.features();
                _.chain(features)
                    .filter((feature) => feature.visible())
                    .each((feature) => {
                        var hits = feature.pointSearch(event.geo);
                        if (hits && hits.found) {
                            for (i = hits.found.length - 1; i >= 0; i -= 1) {
                                if (hits.found[i].properties) {
                                    geojsonLayers.push({
                                        properties: this.filterStyleProperties(hits.found[i].properties),
                                        id: name
                                    });
                                }
                            }
                        }
                    });
                return geojsonLayers;
            });

        return $.when(geojsonLayers);
    },

    getGeotiffLayersInfo(event) {
        var geotiffLayers = _.chain(this.parentView.collection.models)
            .filter((set) => { return set.get('displayed') && set.get('visible') && set.getDatasetType() === 'geotiff'; }).value();
        if (geotiffLayers.length === 0) {
            return $.when([]);
        } else {
            var infoDeferreds = geotiffLayers.map((dataset) => {
                let fileId = dataset.get('meta').minerva.original_files[0]._id;
                let coord = event.geo;
                return restRequest({
                    url: `ktile/${fileId}/query`,
                    type: 'GET',
                    data: {
                        'lat': coord.y,
                        'lon': coord.x
                    }
                }).then((result) => {
                    if (_.isEmpty(result)) {
                        return null;
                    }
                    return {
                        id: dataset.get('name'),
                        properties: result
                    };
                });
            });
            return $.when(...infoDeferreds).then((...results) => results.filter((result) => result));
        }
    }
});
export default FeatureInfoWidget;
