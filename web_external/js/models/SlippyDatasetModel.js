minerva.models.SlippyDatasetModel = minerva.models.DatasetModel.extend({

    isRenderable: function () { // eslint-disable-line underscore/prefer-constant
        return true;
    },

    createSlippyDataset: function (params) {
        girder.restRequest({
            path: '/minerva_dataset_slippy',
            type: 'POST',
            data: params,
            error: null // ignore default error behavior (validation may fail)
        }).done(_.bind(function (resp) {
            this.set(resp);
            this.trigger('m:slippyDatasetAdded');
        }, this)).error(_.bind(function (err) {
            this.trigger('m:error', err);
        }, this));

        return this;
    }

});
