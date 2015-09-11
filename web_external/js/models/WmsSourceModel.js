minerva.models.WmsSourceModel = minerva.models.SourceModel.extend({

    initialize: function () {
        var params = this.attributes.params;
        this.createSource(params);
    },

    // TODO: This is a temp solution to display list of WMS layers inside `Available Datasets`
    isRenderable: function () {
        return true;
    },

    createSource: function (params) {
        girder.restRequest({
            path: '/minerva_source_wms',
            type: 'POST',
            data: params,
            error: null // ignore default error behavior (validation may fail)
        }).done(_.bind(function (resp) {
            console.log(resp);
            this.set(resp);
            this.trigger('m:sourceReceived');
        }, this)).error(_.bind(function (err) {
            this.trigger('m:error', err);
        }, this));

        return this;
    }
});
