minerva.models.BsveSourceModel = minerva.models.SourceModel.extend({

    initialize: function () {
    },

    createSource: function (params) {
        girder.restRequest({
            path: '/minerva_source_bsve',
            type: 'POST',
            data: params,
            error: null // don't do default error behavior (validation may fail)
        }).done(_.bind(function (resp) {
            this.set(resp);
            this.trigger('m:sourceReceived');
        }, this)).error(_.bind(function (err) {
            this.trigger('m:error', err);
        }, this));

        return this;
    }
});
