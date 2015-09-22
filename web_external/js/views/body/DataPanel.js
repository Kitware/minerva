minerva.views.DataPanel = minerva.View.extend({
    events: {
        'click .m-add-dataset-button': 'addDataSetDialogEvent',
        'click .add-dataset-to-session': 'addDatasetToSessionEvent',
        'click .show-wms-layers-list': 'showWmsLayersList',
        'click .delete-dataset': 'deleteDatasetEvent',
        'click .csv-mapping': 'mapTableDataset',
        'click .s3-bucket-menu': 'selectS3Files',
        'click .dataset-info': 'displayDatasetInfo'
    },

    selectS3Files: function (event) {
        var datasetId = $(event.currentTarget).attr('m-dataset-id');
        var dataset = this.collection.get(datasetId);

        this.datasetHierarchyWidget = new minerva.views.DatasetHierarchyWidget({
            el: $('#g-dialog-container'),
            dataset: dataset,
            parentView: this
        });

    },

    mapTableDataset: function (event) {
        var datasetId = $(event.currentTarget).attr('m-dataset-id');
        var dataset = this.collection.get(datasetId);
        // TODO may want to split out json from csv at some point
        // TODO standardize on callback or else dual calls of getX and getXData

        var datasetType = dataset.getDatasetType();
        if (datasetType === 'json' || datasetType === 'mongo') {
            this.keymapWidget = new minerva.views.KeymapWidget({
                el: $('#g-dialog-container'),
                dataset: dataset,
                parentView: this
            });
            this.keymapWidget.render();
        } else {
            // assuming csv
            // list the files of this item
            var filesCallback = _.bind(function () {
                this.tableWidget = new minerva.views.TableWidget({
                    el: $('#g-dialog-container'),
                    dataset: dataset,
                    parentView: this
                });
                this.tableWidget.render();
            }, this);
            dataset.getCSVFile(filesCallback);
        }
    },

    addDatasetToSessionEvent: function (event) {
        var datasetId = $(event.currentTarget).attr('m-dataset-id');
        var dataset = this.collection.get(datasetId);
        // TODO maybe this check is unnecessary, how can we get into this state?
        if (!dataset.get('displayed')) {
            dataset.set('displayed', true);
        }
    },

    deleteDatasetEvent: function (event) {
        // TODO wrap icons inside buttons and disable there
        // TODO remove depedence on DOM
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
        this.wmsLayersListWidget = null;
        this.session = settings.session;
        this.upload = settings.upload;
        this.validateShapefileExtensions = settings.validateShapeFileExtensions || false;
        this.collection = settings.collection;
        this.listenTo(this.collection, 'g:changed', function () {
            this.render();
        }, this).listenTo(this.collection, 'change', function () {
            this.render();
        }, this).listenTo(this.collection, 'change:meta', function () {
            console.log('meta change');
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

    },

    render: function () {
        this.$el.html(minerva.templates.dataPanel({
            datasets: this.collection.models
        }));

        // TODO pagination and search?

        if (this.upload) {
            this.uploadDialog();
        }

        return this;
    },

    addDataSetDialogEvent: function () {
        var container = $('#g-dialog-container');

        this.addDataSetWidget = new minerva.views.AddDataSetWidget({
            el: container,
            parentView: this
        }).render();
    },

    // Handling WMS layers list
    showWmsLayersList: function (event) {
        var datasetId = $(event.currentTarget).attr('m-dataset-id');
        var dataset = this.collection.get(datasetId);
        if (!this.wmsLayersListWidget) {
            this.wmsLayersListWidget = new minerva.views.WmsLayersListWidget({
                el: $('#g-dialog-container'),
                dataset: dataset,
                collection: this.collection,
                parentView: this
            });
            this.wmsLayersListWidget.render();
        } else {
            this.wmsLayersListWidget.render();
        }
    }
});
