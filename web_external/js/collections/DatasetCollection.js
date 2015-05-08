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
            _.wrap(minerva.collections.DatasetCollection.prototype.fetch, function (fetch, params, reset) {
                var boundFetch = _.bind(function (datasetFolderId) {
                    if (datasetFolderId) {
                        this.datasetFolderId = datasetFolderId;
                    }
                    if (!params) {
                        params = {};
                    }
                    fetch.call(this, _.extend(params, {folderId: this.datasetFolderId}), reset);
                }, this);

                if (!this.datasetFolderId) {
                    girder.restRequest({
                        path: 'minerva_dataset/folder',
                        type: 'GET',
                        data: {
                            userId: girder.currentUser.get('_id')
                        }
                    }).done(_.bind(function (resp) {
                        if (!resp.folder) {
                            girder.restRequest({
                                path: 'minerva_dataset/folder',
                                type: 'POST',
                                data: {
                                    userId: girder.currentUser.get('_id')
                                }
                            }).done(_.bind(function (resp) {
                                boundFetch(resp.folder._id);
                            }, this));
                        } else {
                            boundFetch(resp.folder._id);
                        }
                    }));
                } else {
                    // this.datasetFolderId is valid
                    boundFetch();
                }
            });
    }

});
