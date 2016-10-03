minerva.views.PanelGroup = minerva.View.extend({
    initialize: function (settings) {
        this.id = settings.id;
        this.panelViews = settings.panelViews || [];
    },

    render: function () {
        // Render each of our panels
        _.each(this.panelViews, function (panelViewSpec) {
            var panelView = new panelViewSpec.view({ // eslint-disable-line new-cap
                parentView: this,
                session: this.parentView
            });

            this.$el.append('<div id="' + panelViewSpec.id + '"></div>');
            panelView.setElement(this.$('#' + panelViewSpec.id)).render();
        }, this);

        return this;
    }
});
