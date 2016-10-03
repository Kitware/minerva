minerva.App = girder.App.extend({

    render: function () {
        this.$el.html(minerva.templates.layout());

        new minerva.views.LayoutHeaderView({
            el: this.$('#m-app-header-container'),
            parentView: this
        }).render();

        return this;
    }

});
