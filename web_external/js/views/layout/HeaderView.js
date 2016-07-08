minerva.views.LayoutHeaderView = minerva.View.extend({
    events: {
    },
    render: function () {
        this.$el.html(minerva.templates.layoutHeader({
            staticRoot: girder.staticRoot
        }));
    }
});
