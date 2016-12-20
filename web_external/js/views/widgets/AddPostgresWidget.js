/**
* This widget displays a form for adding a Postgresql database source.
 */
minerva.views.AddPostgresWidget = minerva.View.extend({

    render: function () {
        var modal = this.$el.html(minerva.templates.addPostgresWidget({})).girderModal(this);
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
        return this;
    }
});
