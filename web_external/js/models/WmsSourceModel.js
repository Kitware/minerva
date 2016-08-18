minerva.models.WmsSourceModel = minerva.models.SourceModel.extend({

    createSource: function (params) {
        girder.restRequest({
            path: '/minerva_dataset_wms',
            type: 'POST',
            data: params,
            error: null // ignore default error behavior (validation may fail)
        }).done(_.bind(function (resp) {
            this.set(resp);
            this.trigger('m:sourceReceived', resp);
        }, this)).error(_.bind(function (err) {
            this.trigger('m:error', err);
        }, this));

        return this;
    }

});
