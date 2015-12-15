minerva.models.CsvSourceModel = minerva.models.SourceModel.extend({

    createSource: function (params) {
        girder.restRequest({
            path: '/minerva_source_csv',
            type: 'POST',
            data: params,
            error: null // ignore default error behavior (validation may fail)
        }).done(_.bind(function (resp) {
            console.log(resp);
            this.set(resp);
            this.trigger('m:csvSourceReceived');
        }, this)).error(_.bind(function (err) {
            this.trigger('m:error', err);
        }, this));
        return this;
    }

});
