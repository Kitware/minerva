minerva.models.SourceModel = minerva.models.MinervaModel.extend({

    getSourceType: function () {
        return this.getMinervaMetadata().source_type;
    }

});
