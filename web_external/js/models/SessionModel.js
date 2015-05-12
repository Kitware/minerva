minerva.models.SessionModel = girder.models.ItemModel.extend({

    defaults: {
        sessionJsonFile: null,
        sessionJsonContents: null
    },

    initialize: function () { },

    createSessionJson: function (callback) {
        // TODO do this on the server side and just call it
        // when we create the session item, want to create a session.json file in it
        var sessionJsonContents = {};
        sessionJsonContents.basemap = 'osm';
        sessionJsonContents.center = {x: -10, y: 36.5};
        sessionJsonContents.features = [];
        // now save this as session.json as a file in the item
        this.sessionJsonFile = new girder.models.FileModel();
        this.sessionJsonFile.on('g:upload.complete', function () {
            callback();
        }, this).uploadToItem(this, JSON.stringify(sessionJsonContents), 'session.json', 'application/json');
    },

    fetch: function () {
        this.on('g:fetched', function () {
            // now get the session file
            var sessionParams = {
                path: 'minerva_session/' + this.get('_id') + '/session',
                type: 'GET'
            };
            girder.restRequest(sessionParams).done(_.bind(function (file) {
                this.sessionJsonFile = new girder.models.FileModel(file);
                // TODO if there isn't one need to create it
                // now we have the file, get the actual contents
                girder.restRequest({
                    path: 'file/' + file._id + '/download',
                    type: 'GET'
                }).done(_.bind(function (resp) {
                    this.sessionJsonContents = resp;
                    this.trigger('m:fetched');
                }, this)).error(_.bind(function (err) {
                    girder.events.trigger('g:alert', {
                        icon: 'cancel',
                        text: 'Could not download session json contents.',
                        type: 'error',
                        timeout: 4000
                    });
                }, this));
            }, this)).error(_.bind(function (err) {
                girder.events.trigger('g:alert', {
                    icon: 'cancel',
                    text: 'Could not load session item.',
                    type: 'error',
                    timeout: 4000
                });
            }, this));
        }, this).on('g:error', function () {
            minerva.router.navigate('sessions', {trigger: true});
        }, this);
        girder.models.ItemModel.prototype.fetch.call(this);
    }
    // when we load the session item, want to load the session.json file in it
    // will also make a file for each geojson dataset we want to add in
    // this will be a pointer in girder

});
