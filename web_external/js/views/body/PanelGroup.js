minerva.views.PanelGroup = minerva.View.extend({
    initialize: function (settings) {
        this.id = settings.id;
        this.panelViews = settings.panelViews || [];
    },

    render: function () {
        // Render each of our panels
        _.each(this.panelViews, function (panelView) {
            this.$el.append('<div id="' + panelView.id + '"></div>');
            panelView.setElement(this.$('#' + panelView.id)).render();
        }, this);

        return this;
    }
});
