minerva.collections.SourceCollection = minerva.collections.MinervaCollection.extend({

    model: function (attrs, options) {
        if (attrs.meta && ('minerva' in attrs.meta)) {
            if (_.has(minerva.registry.sourceModels, attrs.meta.minerva.source_type)) {
                var SourceModel = minerva.registry.sourceModels[attrs.meta.minerva.source_type];
                return new SourceModel(attrs, options);
            }
        }
        console.error('Source collection includes unknown source type: ' + attrs.meta.minerva.source_type);
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
