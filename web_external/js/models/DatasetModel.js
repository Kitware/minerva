minerva.models.DatasetModel = girder.models.ItemModel.extend({

    defaults: {
        geojsonFileId: null,
        displayed: false
    },

    // TODO put in a toJson method ignoring displayed and other state

    initialize: function () {
    },

    getFullDataset: function () {
        // TODO maybe this isn't needed
        // get the full item
        console.log('DatasetModel.getFullDataset, no implementation');
    },

    getGeoJson: function () {
        if (!this.geojsonFileId) {
            // TODO
            // only get the geojson file, or whatever is the output of processing
            // possibly rename to generalize
            girder.restRequest({
                path: 'item/' + this.get('_id') + '/geojson',
                type: 'GET'
            }).done(_.bind(function (resp) {
                this.geojsonFileId = resp._id;
                this.trigger('m:geojsonLoaded', this);
            }, this)).error(_.bind(function (err) {
                console.error(err);
                girder.events.trigger('g:alert', {
                    icon: 'cancel',
                    text: 'Could not load geojson from shapefile item.',
                    type: 'error',
                    timeout: 4000
                });
            }, this));
        } else {
            this.trigger('m:geojsonLoaded', this);
        }
    },

    createGeoJson: function (callback) {
        girder.restRequest({
            path: 'item/' + this.get('_id') + '/geojson',
            type: 'POST'
        }).done(_.bind(function (resp) {
            this.geojsonFileId = resp._id;
            callback(this);
        }, this)).error(_.bind(function (err) {
            console.error(err);
            girder.events.trigger('g:alert', {
                icon: 'cancel',
                text: 'Could not create geojson in shapefile item.',
                type: 'error',
                timeout: 4000
            });
        }, this));
    }
});
