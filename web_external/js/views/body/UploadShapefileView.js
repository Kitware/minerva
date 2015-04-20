minerva.views.UploadShapefileView = minerva.View.extend({

    // any shapefile upload must contain files with these extensions
    _shapefileRequired: ['.shp', '.shx', '.dbf'],

    /**
     * validation help to ensure that required file extensions are present
     * and the shapefile is given a name before uploading.
     */
    _uploadshapefileValidation: function () {
        var titleOk = this.$('input.m-shapefile-item-name').val().trim().length > 0;

        if (!this.shapefileContentsOk) {
            this.$('.m-upload-shapefile-error').text(
                'You must include one file of each type: [' + this._shapefileRequired.join(', ') + ']');
        } else if (!titleOk) {
            this.$('input.m-shapefile-item-name').focus();
            this.$('.m-upload-shapefile-error').text(
                'Please enter a name for this shapefile.');
        } else {
            this.$('.m-upload-shapefile-error').empty();
        }

        this.uploadWidget.setUploadEnabled(titleOk && this.shapefileContentsOk);
    },

    events: {
        'input .m-shapefile-item-name': function () {
            this._uploadshapefileValidation();
        }
    },

    render: function () {
        this.$el.html(minerva.templates.uploadShapefile({
            maxNameLength: 80
        }));

        this.uploadWidget = new girder.views.UploadWidget({
            el: this.$('.m-upload-shapefile-widget'),
            modal: false,
            noParent: true,
            title: null,
            overrideStart: true,
            parentView: this
        }).render();

        this.$('input.m-shapefile-item-name').focus();

        this.listenTo(this.uploadWidget, 'g:filesChanged', this.filesSelected);
        this.listenTo(this.uploadWidget, 'g:uploadStarted', this.uploadStarted);
        this.listenTo(this.uploadWidget, 'g:uploadFinished', this.uploadFinished);

        return this;
    },

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

        this._uploadshapefileValidation();
    },

    /**
     * When "start upload" is clicked, ensure a minerva folder exists in the user's
     * personal space for uploading.  Create a new Item for the shapefile under
     * the minerva folder, then upload all files into that Item.
     */
    uploadStarted: function () {
        girder.restRequest({
            path: 'user/' + girder.currentUser.get('_id') + '/minervafolder',
            type: 'POST'
        }).done(_.bind(function (resp) {
            this.minervafolder = new girder.models.FolderModel({
                name: resp.name,
                parentType: resp.parentCollection,
                parentId: resp.parentId,
                _id: resp._id
            });
            this.shapefileItem = new girder.models.ItemModel({
                name: this.$('input.m-shapefile-item-name').val().trim(),
                folderId: resp._id
            }).on('g:saved', _.bind(function () {
                this.uploadWidget.parentType = 'item';
                this.uploadWidget.parent = this.shapefileItem; this.uploadWidget.uploadNextFile();
            }, this)).on('g:error', function (err) {
                console.error(err);
            }).save();

        }, this)).error(_.bind(function (err) {
            console.error('error getting minervafolder');
            console.error(err);
            girder.events.trigger('g:alert', {
                icon: 'cancel',
                text: 'Could not create minerva folder.',
                type: 'error',
                timeout: 4000
            });
        }, this));

    },

    /**
     * When the upload is complete, convert the shapefile to geojson.
     */
    uploadFinished: function () {
        girder.restRequest({
            path: 'item/' + this.shapefileItem.get('_id') + '/geojson',
            type: 'POST'
        }).done(_.bind(function (resp) {
            girder.events.trigger('m:renderMap', resp);
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
