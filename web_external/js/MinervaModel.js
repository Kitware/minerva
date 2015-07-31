minerva.models.MinervaModel = girder.models.ItemModel.extend({

    defaults: {},

    initialize: function () {
        var minervaMetadata = this.getMinervaMetadata();
        if (minervaMetadata) {
            this.setMinervaMetadata(minervaMetadata);
        }
    },

    renderableP: function () {
        // Really this function should be defined in each data model subclass,
        // OR - based on whether or not geoFileReader is defined (better because
        // then readability is based on whether GeoJS has a reader for this type)
        // but to do that we would have to be persisting geoFileReader to the server
        // which would require some things being rearranged.

        // For now we know that if original_type is 'json' its ACTUALLY contour json,
        // and if its'geojson'  its actually geojson - and for now these are the only
        // two renderable data types.
        return this.getMinervaMetadata().original_type === 'json' ||
            this.getMinervaMetadata().original_type === 'geojson';
    },

    getMinervaMetadata: function () {
        // for now assume that keys exists and allow exceptions to happen if they don't
        var meta = this.get('meta');
        if (meta) {
            var minervaMetadata = meta.minerva;
            return minervaMetadata;
        } else {
            return false;
        }
    },

    setMinervaMetadata: function (minervaMetadata) {
        this.set('meta', _.extend(this.get('meta') || {}, {minerva: minervaMetadata}));
        return minervaMetadata;
    },

    saveMinervaMetadata: function (minervaMetadata) {
        if (minervaMetadata) {
            this.setMinervaMetadata(minervaMetadata);
        }
        girder.restRequest({
            path: 'item/' + this.get('_id') + '/metadata',
            type: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(this.get('meta'))
        }).done(_.bind(function () {
            this.trigger('m:minervaMetadataSaved', this);
        }, this)).error(_.bind(function (err) {
            console.error(err);
            girder.events.trigger('g:alert', {
                icon: 'cancel',
                text: 'Could not update Minerva metadata in Item.',
                type: 'error',
                timeout: 4000
            });
        }, this));
    }

});
