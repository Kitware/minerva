minerva.models.WmsDatasetModel = minerva.models.DatasetModel.extend({

    isRenderable: function () { // eslint-disable-line underscore/prefer-constant
        return true;
    },

    createWmsDataset: function (params) {
        girder.restRequest({
            path: '/minerva_datasets_wms',
            type: 'POST',
            data: params,
            error: null // ignore default error behavior (validation may fail)
        }).done(_.bind(function (resp) {
            this.set(resp);
            this.trigger('m:wmsDatasetAdded');
        }, this)).error(_.bind(function (err) {
            this.trigger('m:error', err);
        }, this));

        return this;
    }

});
