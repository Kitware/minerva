import _ from 'underscore';
import eventStream from 'girder/utilities/EventStream';
import UploadWidget from 'girder/views/widgets/UploadWidget';
import JobStatus from 'girder_plugins/jobs/JobStatus';

import events from '../../events';
import Panel from '../body/Panel';
import AddWmsSourceWidget from '../widgets/AddWmsSourceWidget';
import StyleWmsDatasetWidget from '../widgets/StyleWmsDatasetWidget';
import CsvViewerWidget from '../widgets/CsvViewerWidget';
import DatasetModel from '../../models/DatasetModel';
import DatasetInfoWidget from '../widgets/DatasetInfoWidget';
import PostgresWidget from '../widgets/PostgresWidget';
import template from '../../templates/body/dataPanel.pug';
import '../../stylesheets/body/dataPanel.styl';

export default Panel.extend({
    events: {
        // TODO namespace.
        'click .add-dataset-to-session': 'addDatasetToSessionEvent',
        'click .m-upload-local': 'uploadDialog',
        'click .m-add-wms': 'addWmsDataset',
        'click .m-postgres': 'connectToPostgres',
        'click .delete-dataset': 'deleteDatasetEvent',
        'click .m-display-dataset-table': 'displayTableDataset',
        'click .dataset-info': 'displayDatasetInfo',
        'click .m-configure-wms-styling': 'styleWmsDataset',
        'click .source-title': 'toggleSources',
        'click .category-title': 'toggleCategories'
    },
    toggleCategories: function (event) {
        // Get the div belov the title which was clicked
        var source = $(event.currentTarget).parent().attr('data-source');
        var category = $(event.currentTarget).text();
        this.visibleMenus[source][category] = !this.visibleMenus[source][category];
        this.render();
    },
    toggleSources: function (event) {
        var source = $(event.currentTarget).text();
        this.visibleMenus[source] = this.visibleMenus[source] ? null : {};
        this.render();
    },
    addWmsDataset: function (event) {
        var addWmsWidget = new AddWmsSourceWidget({
            el: $('#g-dialog-container'),
            collection: this.collection,
            parentView: this
        });
        addWmsWidget.render();
    },

    connectToPostgres: function (event) {
        var postgresWidget = new PostgresWidget({
            el: $('#g-dialog-container'),
            collection: this.collection,
            parentView: this
        }).on('m:dataset_created', function (datasetId) {
            var dataset = new DatasetModel({ _id: datasetId });
            dataset.on('g:fetched', function () {
                this.collection.add(dataset);
            }, this).fetch();
        });
        postgresWidget.render({});
    },

    // Ability to style a wms layer
    styleWmsDataset: function (event) {
        var datasetId = $(event.currentTarget).attr('m-dataset-id');
        var dataset = this.collection.get(datasetId);
        var styleWmsWidget = new StyleWmsDatasetWidget({
            el: $('#g-dialog-container'),
            collection: this.collection,
            dataset: dataset,
            parentView: this
        });
        styleWmsWidget.render();
    },

    /**
     * Displays the selected dataset's tabular data in a CSV viewer widget.
     */
    displayTableDataset: function (event) {
        var datasetId = $(event.currentTarget).attr('m-dataset-id');
        var dataset = this.collection.get(datasetId);
        dataset.on('m:dataset_table_dataLoaded', function () {
            new CsvViewerWidget({
                el: $('#g-dialog-container'),
                collection: this.collection,
                parentView: this,
                dataset: dataset,
                data: dataset.get('tableData')
            }).render();
        }, this).loadTabularData();
    },

    /**
     * Displays a dialog allowing the user to upload files, that will become
     * Datasets.
     */
    uploadDialog: function () {
        var container = $('#g-dialog-container');

        this.uploadWidget = new UploadWidget({
            el: container,
            noParent: true,
            title: 'Upload a dataset',
            overrideStart: true,
            parentView: this.parentView,
            multiFile: false
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
        this.newDataset = new DatasetModel({
            name: _.first(this.uploadWidget.files).name,
            folderId: this.collection.folderId
        }).on('g:saved', function () {
            this.uploadWidget.parentType = 'item';
            this.uploadWidget.parent = this.newDataset;
            this.uploadWidget.uploadNextFile();
        }, this).on('g:error', function (err) {
            console.error(err);
        });
        this.newDataset.save();
    },

    /**
     * Promote an Item to a Dataset, then add it to the DatasetCollection.
     */
    uploadFinished: function () {
        var params = {};
        // If the file is csv, parse the first 10 rows and save in minerva metadata
        if (this.uploadWidget.files &&
            this.uploadWidget.files.length > 0 &&
            this.uploadWidget.files[0].type === 'text/csv') {
            var ROWS_PREVIEW = 10;
            if (typeof (FileReader) !== 'undefined') {
                var reader = new FileReader();
                reader.onload = function (e) {
                    // get file content
                    var csv = e.target.result;
                    var parsedCSV = Papa.parse(csv, { skipEmptyLines: true, header: true, preview: ROWS_PREVIEW });
                    if (parsedCSV.data) {
                        params.csvPreview = parsedCSV.data;
                    }
                };
                reader.readAsText(this.uploadWidget.files[0]);
            } else {
                alert('This browser does not support HTML5.');
            }
        }
        this.newDataset.on('m:dataset_promoted', function () {
            this.collection.add(this.newDataset);
        }, this).on('g:error', function (err) {
            console.error(err);
        }).promoteToDataset(params);
    },

    addDatasetToSessionEvent: function (event) {
        var datasetId = $(event.currentTarget).attr('m-dataset-id'),
            dataset = this.collection.get(datasetId);

        dataset.set('displayed', true);
    },

    deleteDatasetEvent: function (event) {
        if (!$(event.currentTarget).hasClass('icon-disabled')) {
            var datasetId = $(event.currentTarget).attr('m-dataset-id');
            var dataset = this.collection.get(datasetId);
            dataset.destroy();
            this.collection.remove(dataset);
        }
    },

    displayDatasetInfo: function (event) {
        var datasetId = $(event.currentTarget).attr('m-dataset-id');
        var dataset = this.collection.get(datasetId);
        this.datasetInfoWidget = new DatasetInfoWidget({
            el: $('#g-dialog-container'),
            dataset: dataset,
            parentView: this
        });
        this.datasetInfoWidget.render();
    },
    initialize: function (settings) {
        var externalId = 1;
        this.collection = settings.session.datasetsCollection;
        this.visibleMenus = {};
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
        }, this).listenTo(events, 'm:updateDatasets', function () {
            this.collection.fetch(undefined, true);
        }, this).listenTo(events, 'm:addExternalGeoJSON', function (options) {
            if (!options || !options.data) {
                console.warn('Invalid external geojson');
                return;
            }
            var dataset = new DatasetModel({
                _id: externalId++,
                name: options.name || 'External GeoJSON',
                folderId: options.folderId || this.collection.folderId
            });
            dataset.set({
                meta: {
                    minerva: {
                        dataset_type: 'geojson',
                        original_type: 'geojson',
                        geo_render: {
                            type: 'geojson'
                        },
                        geojson: {
                            data: options.data
                        },
                        source: {
                            layer_source: 'GeoJSON',
                            source_type: 'geojson'
                        }
                    }
                }
            });

            // these datasets are temporary, so these are noops
            dataset.sync = function () { };
            dataset.fetch = function () { };
            dataset.save = function () { };
            dataset.destroy = function () { };

            dataset.saveMinervaMetadata = function (mm) {
                if (mm) {
                    dataset.setMinervaMetadata(mm);
                }
                return dataset;
            };

            this.collection.add(dataset);
        }, this);

        eventStream.on('g:event.job_status', _.bind(function (event) {
            var status = window.parseInt(event.data.status);
            if (status === JobStatus.SUCCESS) {
                if (event.data && event.data.meta && event.data.meta.minerva &&
                    event.data.meta.minerva.outputs && event.data.meta.minerva.outputs.length > 0 &&
                    event.data.meta.minerva.outputs[0].dataset_id) {
                    var datasetId = event.data.meta.minerva.outputs[0].dataset_id;
                    var dataset = new DatasetModel({ _id: datasetId });
                    dataset.on('g:fetched', function () {
                        this.collection.add(dataset);
                    }, this).fetch();
                }
            }
        }, this));

        Panel.prototype.initialize.apply(this);
    },

    getDatasetModel: function () {
        return this.parentView.parentView.model;
    },

    render() {
        var sourceName = (model) => {
            return (((model.get('meta') || {}).minerva || {}).source || {}).layer_source;
        };

        this.sourceCategoryDataset = _.chain(this.collection.models)
            .filter(sourceName)
            .groupBy(sourceName)
            .mapObject((datasets, key) => {
                return _.groupBy(datasets, (dataset) => {
                    return dataset.get('meta').minerva.category || 'Other';
                });
            }).value();

        this.$el.html(template({
            sourceCategoryDataset: this.sourceCategoryDataset,
            visibleMenus: this.visibleMenus
        }));

        // TODO pagination and search?
        return this;
    }

});
