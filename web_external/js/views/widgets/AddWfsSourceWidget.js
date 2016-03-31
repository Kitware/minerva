/**
* This widget displays a form for adding a WFS source.
*/
minerva.views.AddWfsSourceWidget = minerva.View.extend({

    events: {
        'submit #m-add-wfs-source-form': function (e) {
            e.preventDefault();
            var params = {
                name: this.$('#m-wfs-name').val(),
                baseURL: this.$('#m-wfs-uri').val(),
                username: this.$('#m-wfs-username').val(),
                password: this.$('#m-wfs-password').val()
            };
            var wfsSource = new minerva.models.WfsSourceModel({});
            wfsSource.on('m:sourceReceived', function () {
                this.$el.modal('hide');
                // TODO: might need to be added to a new panel/data sources ?
                this.collection.add(wfsSource);
            }, this).createSource(params);
        }
    },

    initialize: function (settings) {
        this.collection = settings.collection;
        this.title = 'Enter WFS Source details';
    },

    render: function () {
        var modal = this.$el.html(minerva.templates.addWfsSourceWidget({}));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
        return this;
    }

});
