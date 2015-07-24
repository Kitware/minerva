minerva.collections.SessionCollection = minerva.collections.MinervaCollection.extend({

    model: minerva.models.SessionModel,
    path: 'minerva_session',
    getInitData: function () {
        var initData = { userId: girder.currentUser.get('_id') };
        return initData;
    }

});
