minerva.models.SourceModel = minerva.models.MinervaModel.extend({

    getSourceType: function () {
        return this.metadata().source_type;
    }

});
