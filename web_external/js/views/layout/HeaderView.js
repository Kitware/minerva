minerva.views.LayoutHeaderView = minerva.View.extend({
    events: {
    },
    render: function () {
        this.$el.html(minerva.templates.layoutHeader({
            staticRoot: girder.staticRoot
        }));
        new minerva.views.LayoutHeaderUserView({
            el: this.$('.m-current-user-wrapper'),
            parentView: this
        }).render();
    }
});
