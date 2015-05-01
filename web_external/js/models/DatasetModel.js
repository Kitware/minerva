minerva.models.DatasetModel = girder.models.ItemModel.extend({

    initialize: function () {
        this.geojsonFileId = null;
    },

    getFullDataset: function () {
        // TODO
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

    createGeoJson: function (collection) {
        console.log('DatasetModel.createGeoJson, no implementation');
        console.log(this.get('_id'));
        girder.restRequest({
            path: 'item/' + this.get('_id') + '/geojson',
            type: 'POST'
        }).done(_.bind(function (resp) {
            console.log('finished processing');
            console.log(resp);
            this.geojsonFileId = resp._id;
            // TODO seems weird to do it this way
            // and it will probably blow away the geojsonFileId we just set
            collection.fetch({}, true);
        }, this)).error(_.bind(function (err) {
            girder.events.trigger('g:alert', {
                icon: 'cancel',
                text: 'Could not create geojson in shapefile item.',
                type: 'error',
                timeout: 4000
            });
        }, this));

    },
});
