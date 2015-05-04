minerva.views.DataPanel = minerva.View.extend({

    events: {
        'click .m-add-dataset-button': 'uploadDialog',
        'click .add-dataset-to-layers': 'addDatasetToLayers'
    },

    addDatasetToLayers: function (event) {
        var datasetId = $(event.currentTarget).attr('m-dataset-id');
        if (_.contains(this.datasetsInLayers, datasetId)) {
            return;
        } else {
            this.datasetsInLayers[datasetId] = datasetId;
            var dataset = this.collection.get(datasetId);
            girder.events.trigger('m:addDatasetToLayer', dataset);
            $(event.currentTarget).addClass('dataset-in-layers');
            $(event.currentTarget).removeClass('add-dataset-to-layers');
        }
    },

    removeDatasetFromLayers: function (dataset) {
        var datasetId = dataset.get('id');
        var element = $("i.dataset-in-layers[m-dataset-id='"+datasetId+"']");
        element.removeClass('dataset-in-layers');
        element.addClass('add-dataset-to-layers');
        delete this.datasetsInLayers[datasetId];
    },

    initialize: function (settings) {
        settings = settings || {};
        this.upload = settings.upload;
        this.datasetsInLayers = {};
        this.validateShapefileExtensions = settings.validateShapeFileExtensions || false;
        this.collection = new minerva.collections.DatasetCollection();
        this.collection.on('g:changed', function () {
            this.render();
        }, this).fetch();
        girder.events.on('m:layerDatasetRemoved', this.removeDatasetFromLayers, this);
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

    uploadDialog: function () {
        var container = $('#g-dialog-container');

        this.uploadWidget = new girder.views.UploadWidget({
            el: container,
            noParent: true,
            title: 'Upload a new dataset',
            overrideStart: true,
            parentView: this
        }).on('g:uploadFinished', function () {
            girder.dialogs.handleClose('upload');
            this.upload = false;
            // TODO get update when new dataset added through upload
            this.render();
        }, this).render();

        this.$('input.m-shapefile-item-name').focus();
        this.listenTo(this.uploadWidget, 'g:filesChanged', this.filesSelected);
        this.listenTo(this.uploadWidget, 'g:uploadStarted', this.uploadStarted);
        this.listenTo(this.uploadWidget, 'g:uploadFinished', this.uploadFinished);

    },

    // any shapefile upload must contain files with these extensions
    _shapefileRequired: ['.shp', '.shx', '.dbf'],

    /**
     * Called when the user selects or drops files to be uploaded.
     */
    filesSelected: function (files) {
        this.newItemName = null;
        if (this.validateShapefileExtensions) {
            // get a list of file extensions in the selected files
            var fileExts = _.filter(_.map(files, function (file) {
                var dotPos = file.name.lastIndexOf('.');
                if (dotPos === -1) {
                    return '';
                } else {
                    return file.name.substr(dotPos);
                }
            }), function (ext) {
                return ext !== '';
            });

            // ensure that every one of the required extensions exists
            // somewhere in the list of selected files
            this.shapefileContentsOk =
                _.every(this._shapefileRequired, function (ext) {
                    return _.contains(fileExts, ext);
                });

            // get the name for the item from the .shp
            var shapefile = _.find(files, function (file) {
                var dotPos = file.name.lastIndexOf('.');
                return (dotPos > -1 && file.name.substr(dotPos) === '.shp');
            });
            if (shapefile && shapefile.name.lastIndexOf('.') > -1) {
                this.newItemName = shapefile.name.substr(0, shapefile.name.lastIndexOf('.'));
            }

            this.uploadWidget.setUploadEnabled(this.shapefileContentsOk);
            if (!this.shapefileContentsOk) {
                $('.g-upload-error-message').text(
                    'You must include one file of each type: [' + this._shapefileRequired.join(', ') + ']');
                $('.g-overall-progress-message').empty();
            } else {
                $('.g-upload-error-message').empty();
            }
        } else {
            // take the new item's name from the first file
            if (files && files.length > 0) {
                var zeroethFileName = files[0].name;
                this.newItemName = zeroethFileName.substr(0, zeroethFileName.lastIndexOf('.'));
            }
        }
    },

    /**
     * Create a new Item for the shapefile under
     * the minerva folder, then upload all files into that Item.
     */
    uploadStarted: function () {
        // need to create a new item in the dataset folder, then upload there
        this.newDataset = new minerva.models.DatasetModel({
            name: this.newItemName,
            folderId: this.collection.datasetFolderId,
        }).on('g:saved', function () {
            this.uploadWidget.parentType = 'item';
            this.uploadWidget.parent = this.newDataset;
            this.uploadWidget.uploadNextFile();
        }, this).on('g:error', function (err) {
            console.error(err);
        }).save();
    },


    uploadFinished: function () {
        // TODO seems weird to pass in the collection
        // maybe should send in the view and have it be updated?
        this.newDataset.createGeoJson(this.collection);
    }
});


