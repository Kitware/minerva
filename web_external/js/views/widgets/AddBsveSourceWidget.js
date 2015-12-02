/**
* This widget is used to add a new BSVE connection for data searches
*/
minerva.views.AddBsveSourceWidget = minerva.View.extend({
    events: {
        'submit #m-bsve-add-source-form': function (e) {
            e.preventDefault();
            this.$('.m-add-source-button').addClass('disabled');

            var params = {
                name: $('#m-bsve-source-name').val(),
                username: $('#m-bsve-source-user').val(),
                apikey: $('#m-bsve-source-apikey').val(),
                secretkey: $('#m-bsve-source-secretkey').val()
            };

            var bsveSource = new minerva.models.BsveSourceModel();
            bsveSource.on('m:sourceReceived', function () {
                this.$el.modal('hide');
                this.collection.add(bsveSource);
            }, this).on('m:error', function (msg) {
                this.$('.g-validation-failed-message').text(msg.responseJSON.message);
            }, this).createSource(params);
        }
    },
    initialize: function () {},
    render: function () {
        var modal = this.$el.html(
            minerva.templates.addBsveSourceWidget({})
        );
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
        return this;
    }
});
