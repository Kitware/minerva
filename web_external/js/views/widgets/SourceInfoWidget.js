/**
* This widget is used to diplay minerva metadata for a source.
*/
minerva.views.SourceInfoWidget = minerva.View.extend({
    initialize: function (settings) {
        this.source = settings.source;
    },

    render: function () {
        var modal = this.$el.html(minerva.templates.sourceInfoWidget({}))
            .girderModal(this)
            .on('ready.girder.modal', _.bind(function () {
                this.$('#m-source-info').text(JSON.stringify(this.source.getMinervaMetadata(), null, 4));
            }, this));

        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

        return this;
    }
});
