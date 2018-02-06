import _ from 'underscore';
import { restRequest } from 'girder/rest';
import events from 'girder/events';

import MinervaModel from '../MinervaModel';
import geojsonUtil from '../geojsonUtil';
import GeoJSONStyle from './GeoJSONStyle';

const DatasetModel = MinervaModel.extend({

    defaults: {
        // TODO revise and rename these.
        displayed: false,
        files: null,
        opacity: 1,
        stack: 0,
        // GeoJs related attributes.
        geoError: false,
        geoData: null,
        // Tabular data related attributes.
        tableData: null,
        readOnly: true,
        visible: true,
        // Dataset styling information as passed to Adapters
        visProperties: {}
    },

    /**
     * Default initialization, attach event handlers to preprocess data
     * on load.
     */
    initialize: function () {
        MinervaModel.prototype.initialize.apply(this, arguments);
        this._applyDefaultStyle();
        this.on('g:fetched', this._applyDefaultStyle, this);
        this.on('change:geoData', this._preprocess, this);
        return this;
    },

    /**
     * Preprocess data to generate summary information about the properties
     * and value types.  This should be called whenever the dataset changes.
     *
     * For now, this is only done for GeoJSON datasets.
     */
    _preprocess: function () {
        // When the dataset is geojson, apply certain processing and update the geoData property value
        if (this.getDatasetType().match(/(geo)?json/)) {
            var geoData = geojsonUtil.normalize(this.get('geoData'));
            var visProperties = this.getMinervaMetadata().visProperties;
            // Apply max and min value as styling color clamp initial value
            if (visProperties && visProperties.polygon && visProperties.polygon.fillColorKey && geoData.summary[visProperties.polygon.fillColorKey]) {
                visProperties.polygon.maxClamp = geoData.summary[visProperties.polygon.fillColorKey].max;
                visProperties.polygon.minClamp = geoData.summary[visProperties.polygon.fillColorKey].min;
            }
            if (visProperties && visProperties.polygon && !visProperties.polygon.fillColorKey) {
                var fillColorProperties = this.tryGetDefaultFillColor(geoData.summary);
                if (fillColorProperties) {
                    this.getMinervaMetadata().visProperties.polygon = Object.assign(this.getMinervaMetadata().visProperties.polygon, fillColorProperties);
                }
            }
            // Update the property geoData value without triggering event
            this.attributes['geoData'] = geoData;
        }
    },

    tryGetDefaultFillColor(summary) {
        var numberFields = _.pairs(summary).filter((pair) => {
            return !pair[1].values && isFinite(pair[1].min) && isFinite(pair[1].max) && pair[1].min !== pair[1].max;
        });
        if (numberFields.length) {
            return {
                fillColorKey: _.sortBy(numberFields, (pair) => pair[1].max - pair[1].min).reverse()[0][0],
                fillRamp: 'Reds'
            };
        }
        var categoricalFields = _.pairs(summary).filter((pair) => {
            return pair[1].values && pair[1].values.length >= 2;
        });
        if (categoricalFields.length) {
            return {
                fillColorKey: _.sortBy(categoricalFields, (pair) => pair[1].values.length).reverse()[0][0],
                fillRamp: 'Pastel1'
            };
        }
        return null;
    },

    _applyDefaultStyle: function () {
        var meta = this.get('meta');
        if (!meta) {
            return;
        }
        if (this.getMinervaMetadata().dataset_type === 'geojson') {
            var prop = new GeoJSONStyle().attributes;
            var defaultVisProperties = {
                point: prop,
                line: prop,
                polygon: prop
            };
            if (!meta.minerva.visProperties) {
                meta.minerva.visProperties = {};
            }
            meta.minerva.visProperties = $.extend(true, {}, defaultVisProperties, meta.minerva.visProperties);
        }
    },

    /**
     * Async function that should be called after uploading a file as an
     * Item to the user's Minerva/Dataset folder, this function will then
     * promote the Item to a Minerva Dataset, which means
     * initializing the Item's 'minerva' namespaced metadata.
     *
     * @param {Object} params set of params to the created dataset, possibly including
     * {csvPreview}.
     * @fires 'm:dataset_promoted' event upon successful Dataset promotion.
     */
    promoteToDataset: function (params) {
        return restRequest({
            url: 'minerva_dataset/' + this.get('_id') + '/item',
            type: 'POST'
        }).then((resp) => {
            if (params && params.csvPreview) {
                resp.meta.minerva.csv_preview = params.csvPreview;
            }
            this.metadata(resp.meta.minerva);
            this._initGeoRender();
            this._applyDefaultStyle();
            this.trigger('m:dataset_promoted', this);
            return this;
        }).fail((err) => {
            console.error(err);
            events.trigger('g:alert', {
                icon: 'cancel',
                text: 'Could not create dataset from dataset item.',
                type: 'danger',
                timeout: 4000
            });
        });
    },

    getDatasetType: function () {
        var minervaMetadata = this.metadata();
        return _.has(minervaMetadata, 'dataset_type')
            ? minervaMetadata.dataset_type
            : (_.has(minervaMetadata, 'original_type') ? minervaMetadata.original_type : null);
    },

    /**
     * Initialize the GeoJs rendering type along with any secondary data needed for
     * GeoJs rendering, inferring the rendering type based on
     * the dataset's metadata, or else forcing the rendering type to be
     * 'geojson' or 'contour' if overrideGeoRenderType is provided,
     * finally saving the dataset's metadata if changed.
     *
     * @param {'geojson'|'contour'} overrideGeoRenderType GeoJs rendering type to set on this dataset,
     * if passed will also reset the geoError property of this dataset to false.
     * @returns {Object} Updated minerva metadata of this dataset.
     */
    _initGeoRender: function (overrideGeoRenderType) { // eslint-disable-line complexity
        var mm = this.metadata();
        if (overrideGeoRenderType) {
            this.set('geoError', false);
        }
        if (!mm.geo_render || overrideGeoRenderType) {
            mm.geo_render = null;
            if ((overrideGeoRenderType && overrideGeoRenderType === 'geojson') || mm.dataset_type === 'geojson' || mm.dataset_type === 'geojson-timeseries' || mm.geojson) {
                if (mm.source_type === 'mmwr_data_import') {
                    // Currently no other way to set a choropleth.
                    mm.geo_render = {
                        type: 'choropleth',
                        file_id: mm.geojson_file._id
                    };
                } else {
                    mm.geo_render = {
                        type: 'geojson'
                    };
                    if (mm.geojson_file) {
                        mm.geo_render.file_id = mm.geojson_file._id;
                    } else if (mm.original_files) {
                        mm.geo_render.file_id = mm.original_files[0]._id;
                    }
                }
            } else if ((overrideGeoRenderType && overrideGeoRenderType === 'contour') || mm.dataset_type === 'json') {
                // Guess contour json as a default for a json file.
                mm.geo_render = {
                    type: 'contour',
                    file_id: mm.original_files[0]._id
                };
            } else if (mm.dataset_type === 'wms') {
                mm.geo_render = {
                    type: 'wms'
                };
            } else if (mm.dataset_type === 'geotiff') {
                mm.geo_render = {
                    type: 'large_image'
                };
            } else {
                console.log('An unknown type');
            }
            this.saveMinervaMetadata(mm);
        }
        return mm;
    },

    /**
     * Getter for the GeoJs rendering type of the dataset.
     *
     * @returns {'choropleth'|'geojson'|'geojson-timeseries'|'contour'|'wms'|null} GeoJs rendering type of this dataset, will
     * be null if no rendering type can be inferred.
     */
    getGeoRenderType: function () {
        var mm = this.metadata();
        if (!mm) {
            return null;
        }
        if (!mm.geo_render) {
            this._initGeoRender();
        }
        return mm.geo_render ? mm.geo_render.type : null;
    },

    /**
     * Gets whether GeoJs can render this dataset.
     *
     * @returns {boolean} Whether GeoJs can render this dataset.
     */
    isGeoRenderable: function () {
        var mm = this.metadata();
        return (mm.geo_render !== null);
    },

    /*
     * Async function that loads any data needed by this dataset to render in GeoJs,
     * setting that data as an attribute on this dataset named 'geoData'.
     *
     * @fires 'm:dataset_geo_dataLoaded' event upon the geo data being loaded.
     */
    loadGeoData: function () {
        var mm = this.metadata();
        if (this.get('geoData') !== null || mm.geo_render === null || !mm.geo_render.file_id) {
            if (mm.geojson && mm.geojson.data) {
                // Some datasets have geojson in the metadata.
                this.set('geoData', mm.geojson.data);
            }
            this.trigger('m:dataset_geo_dataLoaded', this);
        } else {
            var url = '/minerva_dataset/' + this.get('_id') + '/download';
            restRequest({
                url: url,
                contentType: 'application/json',
                // Prevent json from getting parsed.
                dataType: null
            }).done(_.bind(function (data) {
                this.set('geoData', data);
                this.trigger('m:dataset_geo_dataLoaded', this);
            }, this)).fail(_.bind(function (err) {
                console.error(err);
                events.trigger('g:alert', {
                    icon: 'cancel',
                    text: 'Could not download geoData in Dataset.',
                    type: 'danger',
                    timeout: 4000
                });
            }, this));
        }
    },

    /*
     * Function to save layout state of entities that are linked to datasets
     */
    addLayoutAttributes: function (entity, attributes) {
        var metadata = this.metadata();
        if (!_.has(metadata, 'layout')) {
            metadata.layout = {};
        }

        if (!_.has(_.keys(metadata.layout, entity))) {
            metadata.layout[entity] = attributes;
        } else {
            _.extend(metadata.layout[entity], attributes);
        }
    },

    //
    // Tabular data api.
    //

    /*
     * Async function that loads any table data needed by this dataset to display
     * in a table view, setting that data as an attribute on this dataset named 'tableData'.
     *
     * @fires 'm:dataset_table_dataLoaded' event upon the table data being loaded.
     */
    loadTabularData: function () {
        // TODO looks similar enough to loadGeoData, consider unification.
        var mm = this.metadata();
        if (!mm) {
            return;
        }
        if (this.get('tableData') !== null) {
            this.trigger('m:dataset_table_dataLoaded', this);
        } else {
            // TODO for now making the poorly supported assumption that tabular data exists.
            var fileId = mm.original_files[0]._id;
            restRequest({
                url: '/file/' + fileId + '/download?contentDisposition=inline',
                type: 'GET',
                dataType: 'text'
            }).done(_.bind(function (resp) {
                this.set('tableData', resp);
                this.trigger('m:dataset_table_dataLoaded', this);
            }, this)).fail(_.bind(function (err) {
                console.error(err);
                events.trigger('g:alert', {
                    icon: 'cancel',
                    text: 'Could not download the tabular data file.',
                    type: 'danger',
                    timeout: 4000
                });
            }, this));
        }
    },

    removeFromSession() {
        // Make opacity 1 when a layer is deleted
        this.set('visible', true);
        this.set('opacity', 1);
        this.set('displayed', false);
    },

    getBoundSupported() {
        if (this.get('_id').toString().length < 7) {
            // dataset with a short id are dynamically created, so that the server can't calculate its bounds
            return false;
        }
        var minervaMetadata = this.metadata();
        return ['geojson', 'geotiff', 'geojson-timeseries'].indexOf(minervaMetadata.dataset_type) !== -1;
    }
});
export default DatasetModel;
