minerva.collections.DatasetCollection = girder.Collection.extend({
    // minerva datasets are items in a specific folder
    resourceName: 'item',
    model: minerva.models.DatasetModel,
    pageLimit: 100,
    // TODO maybe we want to override default sort order to recency
    initialize: function () {
        // we need to set the dataset folder for the collection before
        // fetching the items from the folder
        minerva.collections.DatasetCollection.prototype.fetch =
            _.wrap(minerva.collections.DatasetCollection.prototype.fetch, function (fetch) {
                var boundFetch = _.bind(function (datasetFolderId) {
                    if (datasetFolderId) {
                        this.datasetFolderId = datasetFolderId;
                    }
                    fetch.call(this, {folderId: this.datasetFolderId});
                }, this);

                if (!this.datasetFolderId) {
                    girder.restRequest({
                        path: 'folder',
                        type: 'GET',
                        data: {
                            parentType: 'user',
                            parentId: girder.currentUser.get('_id'),
                            text: 'minerva'
                        }
                    }).done(_.bind(function (resp) {
                        var minervaFolder = _.findWhere(resp, {name: 'minerva'});
                        if (!minervaFolder) {
                            // create minervaFolder
                            minervaFolder = new girder.models.FolderModel({
                                name: 'minerva',
                                parentType: 'user',
                                parentId: girder.currentUser.get('_id')
                            });
                            minervaFolder.on('g:saved', function () {
                                console.log('dataset collection minerva folder created');
                                boundFetch(minervaFolder.get('_id'));
                            }, this).on('g:error', function (err) {
                                console.error('error creating Minerva folder')
                                console.error(err);
                                girder.events.trigger('g:alert', {
                                    icon: 'cancel',
                                    text: 'Could not create minerva folder.',
                                    type: 'error',
                                    timeout: 4000
                                });
                            }, this).save();

                        } else {
                            // minervaFolder exists
                            console.log('dataset collection minerva folder exists');
                            console.log(minervaFolder);
                            boundFetch(minervaFolder._id);
                        }
                    }));
                } else {
                    // this.datasetFolderId is valid
                    console.log('dataset collection minerva folder cached');
                    boundFetch();
                }
            });
    }



});
