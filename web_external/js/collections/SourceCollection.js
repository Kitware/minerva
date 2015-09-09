minerva.collections.SourceCollection = minerva.collections.MinervaCollection.extend({

    model: function (attrs, options) {
        if (attrs.meta && ('minerva' in attrs.meta)) {
            if (attrs.meta.minerva.source_type === 'wms') {
                return new minerva.models.WmsSourceModel(attrs, options);
            }
        } else {
            console.error('Source collection includes unknown source type');
            console.error(attrs);
            girder.events.trigger('g:alert', {
                icon: 'cancel',
                text: 'Unknown source type in collection.',
                type: 'error',
                timeout: 4000
            });
        }
    },
    path: 'minerva_source'

});
