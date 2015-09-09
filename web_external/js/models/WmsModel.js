minerva.models.WmsModel = minerva.models.MinervaModel.extend({

    initialize: function () {
        // On model initialization, call GetCapabilities with
        var params = this.attributes.params;
        this.getCapabilities(params);
    },

    getCapabilities: function (params) {
        console.log('params', params);
    }

});
