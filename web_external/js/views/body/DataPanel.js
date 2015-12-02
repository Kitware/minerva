minerva.views.DataPanel = minerva.views.Panel.extend({
    events: {
        'click .add-dataset-to-session': 'addDatasetToSessionEvent',
        'click .delete-dataset': 'deleteDatasetEvent',
        'click .csv-mapping': 'mapTableDataset',
        'click .dataset-info': 'displayDatasetInfo'
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
        _.extend(this.events, minerva.views.Panel.prototype.events);
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

    },

    render: function () {
        this.$el.html(minerva.templates.dataPanel({
            datasets: this.collection.models
        }));

        // TODO pagination and search?

        return this;
    }

});
