minerva.views.DataPanel = minerva.View.extend({

    events: {
        'click .m-add-dataset-button': 'uploadDialog'
    },

    initialize: function (settings) {
        this.upload = settings.upload;
        console.log('datapanel init');//
        this.collection = new minerva.collections.DatasetCollection();
        this.collection.on('g:changed', function () {
            console.log('call to render');
            this.render();
        }, this).fetch();
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
            this.shapefileName = shapefile.name.substr(0, shapefile.name.lastIndexOf('.'));
        } else {
            this.shapefileName = null;
        }

        this.uploadWidget.setUploadEnabled(this.shapefileContentsOk);
        if (!this.shapefileContentsOk) {
            $('.g-upload-error-message').text(
                'You must include one file of each type: [' + this._shapefileRequired.join(', ') + ']');
            $('.g-overall-progress-message').empty();
        } else {
            $('.g-upload-error-message').empty();
        }

    },

    /**
     * Create a new Item for the shapefile under
     * the minerva folder, then upload all files into that Item.
     */
    uploadStarted: function () {
        // need to create a new item in the dataset folder, then upload there
        this.shapefileItem = new girder.models.ItemModel({
            name: this.shapefileName,
            folderId: this.collection.datasetFolderId,
        }).on('g:saved', _.bind(function () {
            this.uploadWidget.parentType = 'item';
            this.uploadWidget.parent = this.shapefileItem;
            this.uploadWidget.uploadNextFile();
        }, this)).on('g:error', function (err) {
            console.error(err);
        }).save();
    },


    uploadFinished: function () {
        girder.restRequest({
            path: 'item/' + this.shapefileItem.get('_id') + '/geojson',
            type: 'POST'
        }).done(_.bind(function (resp) {
            console.log('finished processing');
            // TODO update list of datasets
        }, this)).error(_.bind(function (err) {
            girder.events.trigger('g:alert', {
                icon: 'cancel',
                text: 'Could not create geojson in shapefile item.',
                type: 'error',
                timeout: 4000
            });
        }, this));

    }
});


