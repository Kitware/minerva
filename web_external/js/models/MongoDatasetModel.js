minerva.models.MongoDatasetModel = minerva.models.DatasetModel.extend({

    isRenderable: function () { // eslint-disable-line underscore/prefer-constant
        return true;
    },

    getExternalMongoLimits: function (field) {
        var data = { field: field };
        girder.restRequest({
            path: 'minerva_dataset_mongo/' + this.get('_id') +
            '/external_mongo_limits',
            type: 'GET',
            data: data
        }).done(_.bind(function (resp) {
            this.metadata(resp);
            this.trigger('m:externalMongoLimitsGot', this);
        }, this));
    },

    createMongoDataset: function (params) {
        girder.restRequest({
            path: '/minerva_dataset_mongo',
            type: 'POST',
            data: params,
            error: null // ignore default error behavior (validation may fail)
        }).done(_.bind(function (resp) {
            this.set(resp);
            this.metadata(resp.meta.minerva);
            this.trigger('m:mongoDatasetAdded');
        }, this)).error(_.bind(function (err) {
            this.trigger('m:error', err);
        }, this));

        return this;
    }

});
