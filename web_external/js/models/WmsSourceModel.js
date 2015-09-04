minerva.models.WmsSourceModel = minerva.models.SourceModel.extend({

    createSource: function (name, baseURL) {
        var params = {
            name: name,
            baseURL: baseURL
        };
        girder.restRequest({
            path: '/minerva_source/wms_source',
            type: 'POST',
            data: params,
            error: null // ignore default error behavior (validation may fail)
        }).done(_.bind(function (resp) {
            this.set(resp);
            this.trigger('m:saved');
        }, this)).error(_.bind(function (err) {
            this.trigger('m:error', err);
        }, this));

        return this;
    }
});
