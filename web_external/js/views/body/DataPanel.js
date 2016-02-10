minerva.views.DataPanel = minerva.views.Panel.extend({
    events: {
        // TODO namespace.
        'click .m-add-dataset-to-session': 'addDatasetToSessionEvent',
        'click .m-upload-local': 'uploadDialog',
        'click .m-delete-dataset': 'deleteDatasetEvent',
        'click .csv-mapping': 'mapTableDataset',
        'click .m-dataset-info': 'displayDatasetInfo',
        'click .m-configure-geo-render': 'configureGeoRender'
    },

    /**
     * Length of dataset name prefix to display.
     */
    DATASET_NAME_LENGTH: 20,

    /**
     * Display a modal dialog allowing configuration of GeoJs rendering
     * properties for the selected dataset.
     */
    configureGeoRender: function (event) {
        var datasetId = $(event.currentTarget).attr('m-dataset-id');
        var dataset = this.collection.get(datasetId);
        var geoRenderType = dataset.getGeoRenderType();
        if (dataset.get('displayed') || geoRenderType === null) {
            // Don't pop up the modal when the dataset is active,
            // or it can't be configured.
            return;
        }
        var configureWidgets = {
            'choropleth': minerva.views.ChoroplethRenderWidget,
            'geojson': minerva.views.JsonConfigWidget,
            'contour': minerva.views.JsonConfigWidget
        };
        if (!this.configureWidgets) {
            this.configureWidgets = {};
        }
        if (!this.configureWidgets[geoRenderType]) {
            this.configureWidgets[geoRenderType] = new (configureWidgets[geoRenderType])({
                el: $('#g-dialog-container'),
                dataset: dataset,
                parentView: this
            });
            this.configureWidgets[geoRenderType].render();
        } else {
            this.configureWidgets[geoRenderType].setCurrentDataset(dataset);
        }
    },

    /**
     * Displays a dialog allowing the user to upload files, that will become
     * Datasets.
     */
    uploadDialog: function () {
        var container = $('#g-dialog-container');

        this.uploadWidget = new girder.views.UploadWidget({
            el: container,
            noParent: true,
            title: 'Upload a dataset',
            overrideStart: true,
            parentView: this.parentView
        }).on('g:uploadFinished', function () {
            this.upload = false;
        }, this).render();
        this.listenTo(this.uploadWidget, 'g:uploadStarted', this.uploadStarted);
        this.listenTo(this.uploadWidget, 'g:uploadFinished', this.uploadFinished);
    },

    /**
     * Create a new Item for the dataset, then upload all files there.
     */
    uploadStarted: function () {
        this.newDataset = new minerva.models.DatasetModel({
            name: _.first(this.uploadWidget.files).name,
            folderId: this.collection.folderId
        }).on('g:saved', function () {
            this.uploadWidget.parentType = 'item';
            this.uploadWidget.parent = this.newDataset;
            this.uploadWidget.uploadNextFile();
        }, this).on('g:error', function (err) {
            console.error(err);
        }).save();
    },

    /**
     * Promote an Item to a Dataset, then add it to the DatasetCollection.
     */
    uploadFinished: function () {
        this.newDataset.on('minerva.dataset.promoted', function () {
            this.collection.add(this.newDataset);
        }, this).on('g:error', function (err) {
            console.error(err);
        }).promoteToDataset();
    },

    addDatasetToSessionEvent: function (event) {
        var datasetId = $(event.currentTarget).attr('m-dataset-id');
        var dataset = this.collection.get(datasetId);
        var stackValues = _.map(this.collection.models, function (dataset) {
            return dataset.get('stack');
        });

        // Retrieve the last stack value in the collection
        var lastValueInStack =
            _.last(
                stackValues.sort(function (a, b) {
                    return a - b;
                })
            );

        if (!dataset.get('displayed')) {
            dataset.set('stack', lastValueInStack + 1);
            // TODO maybe this check is unnecessary, how can we get into this state?
            dataset.set('displayed', true);
        }
    },

    deleteDatasetEvent: function (event) {
        if ($(event.currentTarget).hasClass('icon-disabled')) {
            return;
        } else {
            var datasetId = $(event.currentTarget).attr('m-dataset-id');
            var dataset = this.collection.get(datasetId);
            dataset.destroy();
            this.collection.remove(dataset);
        }
    },

    displayDatasetInfo: function (event) {
        var datasetId = $(event.currentTarget).attr('m-dataset-id');
        var dataset = this.collection.get(datasetId);
        this.datasetInfoWidget = new minerva.views.DatasetInfoWidget({
            el: $('#g-dialog-container'),
            dataset: dataset,
            parentView: this
        });
        this.datasetInfoWidget.render();
    },

    initialize: function (settings) {
        this.collection = settings.session.datasetsCollection;
        this.listenTo(this.collection, 'g:changed', function () {
            this.render();
        }, this).listenTo(this.collection, 'change', function () {
            this.render();
        }, this).listenTo(this.collection, 'change:meta', function () {
            this.render();
        }, this).listenTo(this.collection, 'change:displayed', function () {
            this.render();
        }, this).listenTo(this.collection, 'add', function () {
            this.render();
        }, this).listenTo(this.collection, 'remove', function () {
            this.render();
        }, this);

        girder.eventStream.on('g:event.job_status', _.bind(function (event) {
            var status = window.parseInt(event.data.status);
            if (status === girder.jobs_JobStatus.SUCCESS) {
                this.collection.fetch({}, true);
            }
        }, this));

        minerva.views.Panel.prototype.initialize.apply(this);
    },

    /**
     * Render the DatasetPanel view.
     */
    render: function () {
        var datasets = _.filter(this.collection.models, function (dataset) {
            return dataset.metadata();
        });

        /**
         * Utility function to control dataset display name.
         *
         * @param {dataset} dataset the dataset model
         * @returns {string} display name for the passed in dataset.
         */
        var getDisplayName = _.bind(function (dataset) {
            var name = dataset.get('name');
            if (name.length > this.DATASET_NAME_LENGTH) {
                name = name.slice(0, this.DATASET_NAME_LENGTH) + '...';
            }
            return name;
        }, this);

        /**
         * Utility function to display event classes for visualization icon, depending
         * on the current state of the dataset.
         *
         * @param {dataset} dataset the dataset model
         * @returns {string|false} classes for the visualization icon to render
         * the dataset in the map, or false if the dataset cannot be rendered in the map.
         */
        var getGeoRenderingClasses = _.bind(function (dataset) {
            if (dataset.isGeoRenderable()) {
                var classes =  dataset.get('displayed') ? 'm-icon-disabled m-dataset-in-session' : 'm-icon-enabled m-add-dataset-to-session';
                return classes;
            } else {
                return false;
            }
        }, this);

        /**
         * Utility function to display event classes for delete icon, depending
         * on the current state of the dataset.
         *
         * @param {dataset} dataset the dataset model
         * @returns {string|false} classes for the delete icon,
         * or false if the dataset cannot be rendered in the map.
         */
        var getDatasetDeleteClasses = _.bind(function (dataset) {
            return dataset.get('displayed') ? 'm-icon-disabled m-dataset-in-session' : 'm-icon-enabled m-delete-dataset';
        }, this);

        /**
         * Utility function to display event classes for map rendering config icon, depending
         * on the current state of the dataset.
         *
         * @param {dataset} dataset the dataset model
         * @returns {string|false} classes for the map rendering config icon,
         * or false if the dataset does not have the ability to have map rendering configured.
         */
        var getGeoRenderingConfigClasses = _.bind(function (dataset) {
            var geoRenderType = dataset.getGeoRenderType();
            if (geoRenderType !== null && geoRenderType !== 'wms') {
                var classes = 'm-configure-geo-render';
                classes += (dataset.get('displayed') ? ' m-icon-disabled' : ' m-icon-enabled');
                classes += ((!dataset.get('displayed') && dataset.get('geoError')) ? ' m-geo-render-error' : '');
                return classes;
            } else {
                return false;
            }
        }, this);

        this.$el.html(minerva.templates.dataPanel({
            datasets: datasets,
            getDisplayName: getDisplayName,
            getGeoRenderingClasses: getGeoRenderingClasses,
            getDatasetDeleteClasses: getDatasetDeleteClasses,
            getGeoRenderingConfigClasses: getGeoRenderingConfigClasses
        }));

        // TODO pagination and search?

        return this;
    }

});
