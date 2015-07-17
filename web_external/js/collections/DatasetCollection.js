minerva.collections.DatasetCollection = minerva.collections.MinervaCollection.extend({

    model: minerva.models.DatasetModel,
    path: 'minerva_dataset',
    getInitData: function () {
       return { userId: girder.currentUser.get('_id') };
    }

});
