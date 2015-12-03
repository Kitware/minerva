minerva.views.SourcePanel = minerva.View.extend({

    events: {
        'click .m-add-source': 'addSourceDialog',
        'click .m-upload-local': 'uploadLocalDialog',
        'click .m-display-wms-layers-list': 'displayWmsLayersList',
        'click .m-icon-info': 'displaySourceInfo',
        'click .m-delete-source': 'deleteSource',
        'click .m-display-elasticsearch-query': 'displayElasticsearchQuery',
        'click .m-display-s3-bucket-hierarchy': 'selectS3Files',
        'click .m-display-mongo-collections': 'displayMongoCollections',
        'click .m-display-pdf': 'displayPdf'
    },


    addSourceDialog: function () {
        var container = $('#g-dialog-container');

        this.addSourceWidget = new minerva.views.AddSourceWidget({
            el: container,
            collection: this.sourceCollection,
            parentView: this
        }).render();
    },

    uploadLocalDialog: function () {
        var container = $('#g-dialog-container');

        this.uploadWidget = new girder.views.UploadWidget({
            el: container,
            noParent: true,
            title: 'Upload a local file',
            overrideStart: true,
            parentView: this.parentView
        }).on('g:uploadFinished', function () {
            this.upload = false;
        }, this).render();
        this.listenTo(this.uploadWidget, 'g:filesChanged', this.filesSelected);
        this.listenTo(this.uploadWidget, 'g:uploadStarted', this.uploadStarted);
        this.listenTo(this.uploadWidget, 'g:uploadFinished', this.uploadFinished);

        //this.addSourceWidget = new minerva.views.AddSourceWidget({
            //el: container,
            //collection: this.sourceCollection,
            //parentView: this
        //}).render();
    },

    /**
     * Called when the user selects or drops files to be uploaded.
     */
    filesSelected: function (files) {
        var zeroethFileName = null;
        this.newItemName = null;
        this.newItemExt = null;
        if (files && files.length > 0) {
            zeroethFileName = files[0].name;
            this.newItemName = zeroethFileName.substr(0, zeroethFileName.lastIndexOf('.'));
            this.newItemExt = zeroethFileName.substr(zeroethFileName.lastIndexOf('.'), zeroethFileName.length);
            this.newItemType = files[0].type;
        }
    },

    /**
     * Create a new Item for the source, then upload all files there.
     */
    uploadStarted: function () {
        // need to create a new item in the dataset folder, then upload there
        this.itemSource = new minerva.models.ItemSourceModel({});
        var params = {
            name: this.newItemName,
            type: this.newItemType
        };
        this.itemSource.on('m:sourceReceived', function (source) {
        //this.itemSource.on('g:saved', function () {
            this.uploadWidget.parentType = 'item';
            this.uploadWidget.parent = this.itemSource;
            this.uploadWidget.uploadNextFile();
        }, this).on('g:error', function (err) {
            console.error(err);
        }).createSource(params);
    },

    /**
     * Post-process data after it has been loaded depending on the
     * extension of the dataset.
     */
    uploadFinished: function () {
        this.sourceCollection.add(this.itemSource);
//source);
        //this.itemSource.on('m:sourceReceived', function (source) {
        //}, this).createSource();
    },

    selectS3Files: function (evt) {
        var el = $(evt.currentTarget);
        var source = this.sourceCollection.get(el.attr('cid'));

        this.datasetHierarchyWidget = new minerva.views.DatasetHierarchyWidget({
            el: $('#g-dialog-container'),
            dataset: source,
            folderId: source.metadata().folder_id,
            parentView: this
        });

    },

    displayMongoCollections: function (evt) {
        var el = $(evt.currentTarget);
        var source = this.sourceCollection.get(el.attr('cid'));
        if (!this.addMongoDatasetWidget) {
            this.addMongoDatasetWidget = new minerva.views.AddMongoDatasetWidget({
                el: $('#g-dialog-container'),
                source: source,
                collection: this.datasetCollection,
                folderId: source.getMinervaMetadata().folder_id,
                parentView: this
            });
            this.addMongoDatasetWidget.render();
        } else {
            this.addMongoDatasetWidget.setCurrentSource(source);
        }
    },

    displayWmsLayersList: function (evt) {
        // TODO this looks like a good interface for a generalized source-action
        // Then we could just have a single source-action event handler
        // which would pull the source type from the set of classes
        // then create and dispatch to the correct widget type.
        // First we should add in S3 as a source and get that working, then
        // refactor.
        var el = $(evt.currentTarget);
        var wmsSource = this.sourceCollection.get(el.attr('cid'));
        if (!this.wmsLayersListWidget) {
            this.wmsLayersListWidget = new minerva.views.WmsLayersListWidget({
                el: $('#g-dialog-container'),
                source: wmsSource,
                collection: this.datasetCollection,
                parentView: this
            });
        } else {
            this.wmsLayersListWidget.setCurrentSource(wmsSource);
        }
        this.wmsLayersListWidget.render();
    },

    displaySourceInfo: function (evt) {
        var el = $(evt.currentTarget);
        var source = this.sourceCollection.get(el.attr('cid'));
        this.sourceInfoWidget = new minerva.views.SourceInfoWidget({
            el: $('#g-dialog-container'),
            source: source,
            parentView: this
        });
        this.sourceInfoWidget.render();
    },

    displayPdf: function (evt) {
        var el = $(evt.currentTarget);
        var source = this.sourceCollection.get(el.attr('cid'));
        if (!this.pdfViewWidget) {
            this.pdfViewWidget = new minerva.views.PdfViewWidget({
                el: $('#g-dialog-container'),
                source: source,
                parentView: this
            });
        } else {
            this.pdfViewWidget.setCurrentSource(source);
        }
        this.pdfViewWidget.render();
    },

    deleteSource: function (evt) {
        var el = $(evt.currentTarget);
        var source = this.sourceCollection.get(el.attr('cid'));
        this.sourceCollection.remove(source);
        source.destroy();
    },

    displayElasticsearchQuery: function (evt) {
        var el = $(evt.currentTarget);
        var source = this.sourceCollection.get(el.attr('cid'));
        if (!this.elasticsearchWidget) {
            this.elasticsearchWidget = new minerva.views.ElasticsearchWidget({
                el: $('#g-dialog-container'),
                source: source,
                collection: this.datasetCollection,
                parentView: this
            });
        }
        this.elasticsearchWidget.render();
    },

    initialize: function (settings) {
        this.session = settings.session;
        this.sourceCollection = settings.sourceCollection;
        this.datasetCollection = settings.datasetCollection;

        this.listenTo(this.sourceCollection, 'g:changed', function () {
            this.render();
        }, this).listenTo(this.sourceCollection, 'change', function () {
            this.render();
        }, this).listenTo(this.sourceCollection, 'change:displayed', function () {
            this.render();
        }, this).listenTo(this.sourceCollection, 'add', function () {
            this.render();
        }, this).listenTo(this.sourceCollection, 'remove', function () {
            this.render();
        }, this);

        girder.eventStream.on('g:event.job_status', _.bind(function (event) {
            var status = window.parseInt(event.data.status);
            if (status === girder.jobs_JobStatus.SUCCESS &&
                event.data.type === 's3.import') {
                this.sourceCollection.fetch({}, true);
            }
        }, this));
    },

    sourceDisplay: function (source) {
        // TODO similar to addSourceWidget,
        //
        //
        //
        // would be nice if new source types could register themselves,
        // perhaps with a method on the minerva object, that we could then
        // query here.  All the source types register themselves upon definition,
        // and we query here upon instantation.

        var sourceTypes = {
            wms: {
                icon: 'icon-layers',
                action: 'm-display-wms-layers-list'
            },
            elasticsearch: {
                icon: 'icon-search',
                action: 'm-display-elasticsearch-query'
            },
            s3: {
                icon: 'icon-cloud',
                action: 'm-display-s3-bucket-hierarchy'
            },
            mongo: {
                icon: 'icon-leaf',
                action: 'm-display-mongo-collections'
            },
            item: {
                icon: 'icon-doc-text-inv',
                action: null
            }
        // TODO check postgres
        };

        var display = sourceTypes[source.metadata().source_type];
        if (source.metadata().source_type === 'item' && source.metadata().item_type === 'application/pdf') {
            display = {
                icon: 'icon-file-pdf',
                action: 'm-display-pdf'
            };
        }
        return display;
    },


    render: function () {


        this.$el.html(minerva.templates.sourcePanel({
            sources: this.sourceCollection.models,
            sourceDisplay: this.sourceDisplay
        }));

        var tooltipProperties = {
            placement: 'left',
            delay: 400,
            container: this.$el,
            trigger: 'hover'
        };
        this.$('i').tooltip(tooltipProperties);

        return this;
    }
});
