minerva.models.MinervaModel = girder.models.ItemModel.extend({

    defaults: {},

    initialize: function () {
        var minervaMetadata = this.getMinervaMetadata();
        if (minervaMetadata) {
            this.setMinervaMetadata(minervaMetadata);
        }
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
