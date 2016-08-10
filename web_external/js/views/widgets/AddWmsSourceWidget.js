/**
* This widget displays a form for adding a WMS source.
*/
minerva.views.AddWmsSourceWidget = minerva.View.extend({

    events: {
        'submit #m-add-wms-source-form': function (e) {
            e.preventDefault();
            var params = {
                name: this.$('#m-wms-name').val(),
                baseURL: this.$('#m-wms-uri').val(),
                username: this.$('#m-wms-username').val(),
                password: this.$('#m-wms-password').val()
            };
            var wmsSource = new minerva.models.WmsSourceModel({});
            wmsSource.on('m:sourceReceived', function () {
                this.$el.modal('hide');
            }, this).createSource(params);
        }
    },

    initialize: function (settings) {
        this.title = 'Enter WMS Source details';
        return this;
    },

    render: function () {
        var modal = this.$el.html(minerva.templates.addWmsSourceWidget({})).girderModal(this);
        return this;
    }

});
