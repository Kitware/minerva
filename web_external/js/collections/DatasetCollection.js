minerva.collections.DatasetCollection = minerva.collections.MinervaCollection.extend({

    //model: minerva.models.DatasetModel,
    model: function (attrs, options) {
        if (attrs.meta && ('minerva' in attrs.meta) &&
            attrs.meta.minerva.original_type === 's3') {
            return new minerva.models.S3DatasetModel(attrs, options);
        } else {
            return new minerva.models.DatasetModel(attrs, options);
        }
    },
    path: 'minerva_dataset',
    getInitData: function () {
        var initData = { userId: girder.currentUser.get('_id') };
        return initData;
    }

});
