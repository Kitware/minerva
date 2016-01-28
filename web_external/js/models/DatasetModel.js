minerva.models.DatasetModel = minerva.models.MinervaModel.extend({

    defaults: {
        // TODO revise and rename these.
        displayed: false,
        files: null,
        opacity: 1,
        order: null,
        stack: 0,
        // GeoJs related attributes.
        geoError: false,
        geoData: null
    },

    /**
     * Async function that should be called after uploading a file as an
     * Item to the user's Minerva/Dataset folder, this function will then
     * initialize the Item's 'minerva' namespaced metadata, ensuring it is usable
     * as a Dataset in Minerva;
     * emits a 'm:datasetCreated' event upon successful Dataset creation
     * and initialization.
     */
    createDataset: function (params) {
        girder.restRequest({
            path: 'minerva_dataset/' + this.get('_id') + '/item',
            type: 'POST',
            params: params
        }).done(_.bind(function (resp) {
            // TODO: To discuss the right approach to update metadata
            resp.meta.minerva.csvPreview = params.csvPreview;
            this.metadata(resp.meta.minerva);
            this.trigger('m:datasetCreated', this);
        }, this)).error(_.bind(function (err) {
            console.error(err);
            girder.events.trigger('g:alert', {
                icon: 'cancel',
                text: 'Could not create dataset from dataset item.',
                type: 'error',
                timeout: 4000
            });
        }, this));
    },

    getDatasetType: function () {
        var minervaMetadata = this.metadata();
        return _.has(minervaMetadata, 'dataset_type') ? minervaMetadata.dataset_type :
            (_.has(minervaMetadata, 'original_type') ? minervaMetadata.original_type : null);
    },

    ////////////////////////////////////////////////////////
    // GeoJs rendering api.                               //
    ////////////////////////////////////////////////////////

    /**
     * Initialize the GeoJs rendering type along with any secondary data needed for
     * GeoJs rendering, inferring the rendering type based on
     * the dataset's metadata, and saving the dataset's metadata if changed.
     *
     * @returns {Object} Updated minerva metadata of this dataset.
     */
    _initGeoRender: function () {
        var mm = this.metadata();
        if (!mm.geo_render) {
            mm.geo_render = null;
            if (mm.dataset_type === 'geojson') {
                if (mm.source_type === 'mmwr_data_import') {
                    mm.geo_render = {
                        type: 'choropleth',
                        file_id: mm.geojson_file._id
                    };
                } else {
                    mm.geo_render = {
                        type: 'geojson',
                        file_id: mm.geojson_file._id
                    };
                }
            } else if (mm.dataset_type === 'json') {
                // Guess contour json as a default for a json file.
                mm.geo_render = {
                    type: 'contour',
                    file_id: mm.original_files[0]._id
                };
            } else if (mm.dataset_type === 'wms') {
                mm.geo_render = {
                    type: 'wms'
                };
            }
            this.saveMinervaMetadata(mm);
        }
        return mm;
    },

    /**
     * Override the GeoJs rendering type and set any secondary data needed for
     * GeoJs rendering based on the dataset's metadata,
     * and saving the dataset's metadata if changed;
     * will also reset the geoError property to false.
     *
     * @param {'geojson'|'contour'} GeoJs rendering type to set on this dataset.
     * @returns {Object} Updated minerva metadata of this dataset.
     */
    overrideGeoRenderType: function (geoRenderType) {
        this.set('geoError', false);
        var mm = this.metadata();
        if (_.contains(['geojson'], geoRenderType)) {
            // TODO 'choropleth' could work here,
            // but we would need a way to extract the values.
            mm.geo_render = {
                type: geoRenderType
            };
            if (mm.geojson_file) {
                mm.geo_render.file_id = mm.geojson_file.file_id;
            } else {
                mm.geo_render.file_id = mm.original_files[0]._id;
            }
            console.log(mm);
        } else if (geoRenderType === 'contour') {
            mm.geo_render = {
                type: 'contour',
                file_id: mm.original_files[0]._id
            };
        }
        this.saveMinervaMetadata(mm);
        return mm;
    },

    /**
     * Getter for the GeoJs rendering type of the dataset, initializing it if
     * necessary by inference from the dataset's metadata, and saving
     * the dataset's metadata if changed.
     *
     * @returns {'choropleth'|'geojson'|'contour'|'wms'|null} GeoJs rendering type of this dataset, will
     * be null if no rendering type can be inferred.
     */
    getGeoRenderType: function () {
        var mm = this._initGeoRender();
        return mm.geo_render ? mm.geo_render.type : mm.geo_render;
    },

    /**
     * Gets the download URL for the file data needed by GeoJs to render
     * this dataset, if one exists; initializing it if
     * necessary by inference from the dataset's metadata, and saving
     * the dataset's metadata if changed.
     *
     * @returns {String|null} Download URL for the file data, if one exists.
     */
    _getGeoRenderDownloadUrl: function () {
        var mm = this._initGeoRender();
        if (mm.geo_render && mm.geo_render.file_id) {
            return girder.apiRoot + '/file/' + mm.geo_render.file_id + '/download';
        } else {
            return null;
        }
    },

    /**
     * Gets whether GeoJs can render this dataset, initializing it if
     * necessary by inference from the dataset's metadata, and saving
     * the dataset's metadata if changed.
     *
     * @returns {Boolean} Whether GeoJs can render this dataset.
     */
    isGeoRenderable: function () {
        var mm = this._initGeoRender();
        return (mm.geo_render !== null);
    },

    /*
     * Async function that loads any data needed by this dataset to render in GeoJs,
     * sets that data as an attribute on this dataset named 'geoData',
     * emitting the 'm:geoDataLoaded' event and passing a reference to this dataset
     * when data is loaded or if this dataset did not need to load any data to render in GeoJs.
     */
    loadGeoData: function () {
        var mm = this._initGeoRender();
        if (this.get('geoData') !== null || mm.geo_render === null || !mm.geo_render.file_id) {
            this.trigger('m:geoDataLoaded', this);
        } else {
            var url = this._getGeoRenderDownloadUrl();
            $.ajax({
                url: url,
                contentType: 'application/json',
                success: _.bind(function (data) {
                    this.set('geoData', data);
                }, this),
                complete: _.bind(function () {
                    this.trigger('m:geoDataLoaded', this);
                }, this)
            });
        }
    }

});
