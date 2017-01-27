minerva.views.ListPostgresLayersWidget = minerva.View.extend({
    render: function (layerArray) {
        var modal = this.$el.html(minerva.templates.listPostgresLayersWidget({
            layerArray: layerArray})).girderModal(this);
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
        return this;
    }
})
