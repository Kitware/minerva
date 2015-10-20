/**
* This widget is used to add a new dataset
*/
minerva.views.AddDataSetWidget = minerva.View.extend({
    events: {
        'submit #m-add-dataset-form': function (e) {
            e.preventDefault();

            var dataSetType = $('#m-add-dataset-form input:radio:checked').attr('id');
            var container = $('#g-dialog-container');

            if (dataSetType === 'm-upload-dataset') {
                this.uploadWidget = new girder.views.UploadWidget({
                    el: container,
                    noParent: true,
                    title: 'Upload a new dataset',
                    overrideStart: true,
                    parentView: this.parentView
                }).on('g:uploadFinished', function () {
                    this.upload = false;
                }, this).render();

                this.$('input.m-shapefile-item-name').focus();
                this.listenTo(this.uploadWidget, 'g:filesChanged', this.filesSelected);
                this.listenTo(this.uploadWidget, 'g:uploadStarted', this.uploadStarted);
                this.listenTo(this.uploadWidget, 'g:uploadFinished', this.uploadFinished);
            } else if (dataSetType === 'm-mongo-dataset') {
                this.mongoDatasetWidget = new minerva.views.AddMongoDatasetWidget({
                    el: container,
                    title: 'Add a Mongo collection as a dataset',
                    collection: this.collection,
                    parentView: this.parentView
                }).render();
            }
        }
    },

    initialize: function (settings) {
        this.model = settings.model || null;
        // parentCollection only needed for a new session to know
        // the parent container for the new item
        this.parentCollection = settings.parentCollection;
        this.parentView = settings.parentView;
        this.session = settings.parentView.session;
        this.upload = settings.parentView.upload;
        this.validateShapefileExtensions = settings.parentView.validateShapeFileExtensions || false;
        this.collection = settings.parentView.collection;
    },

    render: function () {
        var view = this;
        var modal = this.$el.html(minerva.templates.addDataSetWidget({
            session: this.model
        })).girderModal(this).on('shown.bs.modal', function () {
            view.$('#m-session-name').focus();
        }).on('hidden.bs.modal', function () {
            if (view.create) {
                girder.dialogs.handleClose('create');
            } else {
                girder.dialogs.handleClose('edit');
            }
        }).on('ready.girder.modal', function () {
            if (view.model) {
                view.create = false;
            } else {
                view.create = true;
            }
        });
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

        if (view.model) {
            girder.dialogs.handleOpen('edit');
        } else {
            girder.dialogs.handleOpen('create');
        }

        return this;
    },

    // any shapefile upload must contain files with these extensions
    _shapefileRequired: ['.shp', '.shx', '.dbf'],

    /**
     * Called when the user selects or drops files to be uploaded.
     */
    filesSelected: function (files) {
        var zeroethFileName = null;
        this.newItemName = null;
        this.newItemExt = null;
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
                this.newItemExt = zeroethFileName.substr(zeroethFileName.lastIndexOf('.'), zeroethFileName.length);
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
                zeroethFileName = files[0].name;
                this.newItemName = zeroethFileName.substr(0, zeroethFileName.lastIndexOf('.'));
                this.newItemExt = zeroethFileName.substr(zeroethFileName.lastIndexOf('.'), zeroethFileName.length);
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
     * Post-process data after it has been loaded depending on the
     * extension of the dataset.
     */
    uploadFinished: function () {
        this.newDataset.on('m:datasetCreated', function (dataset) {
            this.collection.add(dataset);
        }, this).createDataset();
    }

});
