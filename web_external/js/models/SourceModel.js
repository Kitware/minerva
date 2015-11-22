minerva.models.SourceModel = minerva.models.MinervaModel.extend({

    getSourceType: function () {
        return this.metadata().source_type;
    }

});

minerva.registerSourceModel = function (sourceModelName, sourceType, sourceModel) {
    if (_.has(minerva.registry.sourceModels, sourceType)) {
        throw 'minerva cannot register an additional source of type ' + sourceType;
    }
    minerva.registry.sourceModels[sourceType] = sourceModel;
    minerva.models[sourceModelName] = sourceModel;
};

minerva.createSourceModel = function (sourceModelName, sourceType, apiRoute) {

    var sourceModel = minerva.models.SourceModel.extend({
        createSource: function (params) {
            girder.restRequest({
                path: '/' + apiRoute,
                type: 'POST',
                data: params,
                error: null // ignore default error behavior (validation may fail)
            }).done(_.bind(function (resp) {
                this.set(resp);
                this.trigger('m:sourceReceived');
            }, this)).error(_.bind(function (err) {
                this.trigger('m:error', err);
            }, this));

            return this;
        }
    });

    minerva.registerSourceModel(sourceModelName, sourceType, sourceModel);
    return sourceModel;
};
minerva.clearRegistry('sourceModels');

minerva.createSourceModel('WmsSourceModel', 'wms', 'minerva_source_wms');
minerva.createSourceModel('ElasticsearchSourceModel', 'elasticsearch', 'minerva_source_elasticsearch');
minerva.createSourceModel('PostgresSourceModel', 'postgres', 'minerva_source_postgres');
