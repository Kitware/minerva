minerva.collections.SourceCollection = minerva.collections.MinervaCollection.extend({

    model: function (attrs, options) {
        // TODO this should be included in the refactor where new source types
        // can register themselves globally
        if (attrs.meta && ('minerva' in attrs.meta)) {
            if (attrs.meta.minerva.source_type === 'wms') {
                return new minerva.models.WmsSourceModel(attrs, options);
            } else if (attrs.meta.minerva.source_type === 's3') {
                return new minerva.models.S3SourceModel(attrs, options);
            }
        }

        console.error('Source collection includes unknown source type ' + attrs.meta.minerva.source_type);
        console.error(attrs);
        girder.events.trigger('g:alert', {
            icon: 'cancel',
            text: 'Unknown source type in collection.',
            type: 'error',
            timeout: 4000
        });
    },

    path: 'minerva_source',
    getInitData: function () {
        var initData = { userId: girder.currentUser.get('_id') };
        return initData;
    }

});
