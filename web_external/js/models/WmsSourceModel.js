minerva.models.WmsSourceModel = minerva.models.SourceModel.extend({

    initialize: function () {
        var params = this.attributes.params;
        this.createSource(params);
    },

    createSource: function (params) {
        girder.restRequest({
            path: '/minerva_source_wms',
            type: 'POST',
            data: params,
            error: null // ignore default error behavior (validation may fail)
        }).done(_.bind(function (resp) {
            console.log(resp)
            this.set(resp);
            this.trigger('m:saved');
        }, this)).error(_.bind(function (err) {
            this.trigger('m:error', err);
        }, this));

        return this;
    }
});
