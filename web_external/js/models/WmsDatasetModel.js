minerva.models.WmsDatasetModel = minerva.models.DatasetModel.extend({

    isRenderable: function () {
        return true;
    },

    createWmsDataset: function (params) {
        girder.restRequest({
            path: '/minerva_dataset_wms',
            type: 'POST',
            data: params,
            error: null // ignore default error behavior (validation may fail)
        }).done(_.bind(function (resp) {
            this.set(resp);
            console.log(resp);
            this.trigger('m:layerSentToMap');
        }, this)).error(_.bind(function (err) {
            console.log(err);
            this.trigger('m:error', err);
        }, this));

        return this;

      //girder.events.trigger('m:layerDatasetLoaded', this);
    }
});
