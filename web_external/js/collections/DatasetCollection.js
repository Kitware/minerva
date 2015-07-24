minerva.collections.DatasetCollection = minerva.collections.MinervaCollection.extend({

    model: minerva.models.DatasetModel,
    path: 'minerva_dataset',
    getInitData: function () {
        var initData = { userId: girder.currentUser.get('_id') };
        return initData;
    }

});
