minerva.collections.DatasetCollection = minerva.collections.MinervaCollection.extend({

    model: function (attrs, options) {
        // TODO dataset/source refactor
        if (attrs.meta && ('minerva' in attrs.meta)) {
            if (attrs.meta.minerva.dataset_type === 'wms') {
                return new minerva.models.WmsDatasetModel(attrs, options);
            }
        }
        return new minerva.models.DatasetModel(attrs, options);
    },

    path: 'minerva_dataset',
    getInitData: function () {
        var initData = { userId: girder.currentUser.get('_id') };
        return initData;
    }

});
