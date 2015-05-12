minerva.collections.SessionCollection = girder.Collection.extend({
    // minerva sessions are items in a specific folder
    resourceName: 'item',
    model: minerva.models.SessionModel,
    pageLimit: 100,
    // TODO maybe we want to override default sort order to recency
    initialize: function () {
        // we need to set the session folder for the collection before
        // fetching the items from the folder
        minerva.collections.SessionCollection.prototype.fetch =
            _.wrap(minerva.collections.SessionCollection.prototype.fetch, function (fetch, params, reset) {
                var boundFetch = _.bind(function (sessionFolderId) {
                    if (sessionFolderId) {
                        this.sessionFolderId = sessionFolderId;
                    }
                    if (!params) {
                        params = {};
                    }
                    fetch.call(this, _.extend(params, {folderId: this.sessionFolderId}), reset);
                }, this);

                if (!this.sessionFolderId) {
                    girder.restRequest({
                        path: 'minerva_session/folder',
                        type: 'GET',
                        data: {
                            userId: girder.currentUser.get('_id')
                        }
                    }).done(_.bind(function (resp) {
                        if (!resp.folder) {
                            girder.restRequest({
                                path: 'minerva_session/folder',
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
                    // this.sessionFolderId is valid
                    boundFetch();
                }
            });
    }

});
