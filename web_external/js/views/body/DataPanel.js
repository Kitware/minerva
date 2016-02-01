minerva.views.DataPanel = minerva.views.Panel.extend({
    events: {
        // TODO namespace.
        'click .add-dataset-to-session': 'addDatasetToSessionEvent',
        'click .m-upload-local': 'uploadDialog',
        'click .delete-dataset': 'deleteDatasetEvent',
        'click .csv-mapping': 'mapTableDataset',
        'click .dataset-info': 'displayDatasetInfo',
        'click .m-configure-geo-render': 'configureGeoRender'
    },

    renderCsvViewer: function (csv, dataset) {
        new minerva.views.CsvViewerWidget({
            el               : $('#g-dialog-container'),
            collection       : this.collection,
            parentView       : this,
            dataset          : dataset,
            data             : csv
        }).render();
    },

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
        if (geoRenderType === 'choropleth') {
            if (!this.choroplethRenderWidget) {
                this.choroplethRenderWidget = new minerva.views.ChoroplethRenderWidget({
                    el: $('#g-dialog-container'),
                    dataset: dataset,
                    parentView: this
                });
                this.choroplethRenderWidget.render();
            } else {
                this.choroplethRenderWidget.setCurrentDataset(dataset);
            }
        } else if (_.contains(['geojson', 'contour'], geoRenderType)) {
            if (!this.jsonConfigWidget) {
                this.jsonConfigWidget = new minerva.views.JsonConfigWidget({
                    el: $('#g-dialog-container'),
                    dataset: dataset,
                    parentView: this
                });
                this.jsonConfigWidget.render();
            } else {
                this.jsonConfigWidget.setCurrentDataset(dataset);
            }

        } else if (geoRenderType === 'csv') {
            // First download the file, then open it in the csv viewer widget
            var fileId = dataset.get('meta').minerva.original_files[0]._id;
            var csvFile = new minerva.models.DatasetModel({});
            csvFile.on('g:csvDownloaded', function (csv) {
                // Open the csv in the csv viewer widget
                this.renderCsvViewer(csv, dataset);
            }, this).on('g:error', function (err) {
                console.error(err);
            }).getCsvFile(fileId);
        } else {
            return;
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
     * Test if the uploaded file is csv or not.
     */
    _isCsvFile: function (file) {
        var REGEX = /^([a-zA-Z0-9\s_\\.\-:])+(.csv|.txt)$/;
        if (REGEX.test(file[0].name.toLowerCase())) {
            return true;
        } else {
            return false;
        }
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
     * Create a Dataset from the Item, then add it to the DatasetCollection.
     */
    uploadFinished: function () {
        var params = {};
        // If the file is csv, parse the first 10 rows and save in minerva metadata
        if (this._isCsvFile(this.uploadWidget.files)) {
            var ROWS_PREVIEW = 10;
            if (typeof (FileReader) !== "undefined") {
                var reader = new FileReader();
                reader.onload = function(e) {
                    // get file content
                    var csv = e.target.result;
                    var parsedCSV = Papa.parse(csv, { skipEmptyLines: true, header: true, preview: ROWS_PREVIEW });
                    if (parsedCSV.data) {
                        params.csvPreview = parsedCSV.data;
                    }
                }.bind(this);
                reader.readAsText(this.uploadWidget.files[0]);
            } else {
                alert("This browser does not support HTML5.");
            }
        }
        this.newDataset.on('m:datasetCreated', function () {
            this.collection.add(this.newDataset);
        }, this).on('g:error', function (err) {
            console.error(err);
        }).createDataset(params);
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

    render: function () {
        this.$el.html(minerva.templates.dataPanel({
            datasets: this.collection.models
        }));

        // TODO pagination and search?

        return this;
    }

});
