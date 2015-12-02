minerva.models.SessionModel = girder.models.ItemModel.extend({

    defaults: {
        sessionJsonFile: null,
        sessionJsonContents: null
    },

    initialize: function () { },

    _featureFromDataset: function (dataset) {
        var feature = {
            datasetId: dataset.id
        };
        return feature;
    },

    _featureIdentityPredicate: function (feature) {
        return function (otherFeature) {
            return otherFeature.datasetId === feature.datasetId;
        };
    },

    datasetInFeatures: function (dataset) {
        var datasetFinder = this._featureIdentityPredicate(this._featureFromDataset(dataset));
        return _.some(this.sessionJsonContents.features, datasetFinder);
    },

    addLayoutAttributes: function (panelView, attributes) {
        if (!_.has(this.sessionJsonContents, 'layout')) {
            this.sessionJsonContents.layout = {};
        }

        if (!_.has(_.keys(this.sessionJsonContents.layout, panelView))) {
            this.sessionJsonContents.layout[panelView] = attributes;
        } else {
            _.extend(this.sessionJsonContents.layout[panelView], attributes);
        }
    },

    addDataset: function (dataset) {
        // for now just add them to a list
        // may want to unify caching of geojson file id
        // TODO may need to be smarter about finding
        // especially if we copy the file into our session item and the ids change
        var feature = this._featureFromDataset(dataset);
        if (!_.find(this.sessionJsonContents.features, this._featureIdentityPredicate(feature))) {
            this.sessionJsonContents.features.push(feature);
        }
        // TODO may need to set this to changed because not using setX
    },

    removeDataset: function (dataset) {
        var feature = this._featureFromDataset(dataset);
        var featureIdentifier = this._featureIdentityPredicate(feature);
        this.sessionJsonContents.features = _.reject(this.sessionJsonContents.features, featureIdentifier);
        // TODO may need to set this to changed because not using setX
    },

    createSessionJson: function (callback) {
        // TODO do this on the server side and just call it
        // when we create the session item, want to create a session.json file in it
        var sessionJsonContents = {};
        sessionJsonContents.basemap = 'osm';
        sessionJsonContents.center = {x: -100, y: 36.5};
        sessionJsonContents.zoom = 1;
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
                    console.error(err);
                    girder.events.trigger('g:alert', {
                        icon: 'cancel',
                        text: 'Could not download session json contents.',
                        type: 'error',
                        timeout: 4000
                    });
                }, this));
            }, this)).error(_.bind(function (err) {
                console.error(err);
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
    },
    // when we load the session item, want to load the session.json file in it
    // will also make a file for each geojson dataset we want to add in
    // this will be a pointer in girder

    // the standard save for this model will save this item
    // here we save the session.json and any files that should be a part of the item
    saveSession: function () {
        // TODO will want more info on features, possibly layer or transparency or mapping or ??
        // for now just save the fileid
        // update the json, save it
        this.sessionJsonFile.on('g:upload.complete', function () {
            this.trigger('m:saved');
            // TODO some work here
            // may want to add or remove any files needed into the item
            // hold off for now
            // will need to get the complete list of files for the item
            // dealing with pagination
            // then compare that to the list of files as features
            // delete any in files and not in features
            // add any in features and not in files
        }, this).updateContents(JSON.stringify(this.sessionJsonContents));

    }
});
