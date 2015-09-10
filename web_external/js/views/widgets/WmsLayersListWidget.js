/**
* This widget displays the list of WMS layers
*/
minerva.views.WmsLayersListWidget = minerva.View.extend({

    events: {
        // 'submit #m-add-wms-service-form': function (e) {
        //     e.preventDefault();
        //     var params = {
        //         name: this.$('#m-wms-name').val(),
        //         baseURL: this.$('#m-wms-uri').val(),
        //         username: this.$('#m-wms-username').val(),
        //         password: this.$('#m-wms-password').val()
        //     };

        //     var wmsService = new minerva.models.WmsSourceModel({ params: params });
        //     wmsService.on('m:sourceReceived', function () {
        //         this.$el.modal('hide');
        //         this.collection.add(wmsService);
        //     }, this);
        // }
    },

    initialize: function (settings) {
        console.log('>>>>>>>', settings);
        this.dataset = settings.dataset;
    },

    render: function () {
        var modal = this.$el.html(minerva.templates.wmsLayersListWidget({ dataset: this.dataset }));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
        this.$el.modal('show');
        return this;
    }

});
