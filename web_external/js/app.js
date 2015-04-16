minerva.App = girder.App.extend({

    render: function () {
        this.$el.html(minerva.templates.layout());

        new minerva.views.LayoutHeaderView({
            el: this.$('#m-app-header-container'),
            parentView: this
        }).render();

        return this;
    },

    navigateTo: function (view, settings) {
        this.$('#g-app-body-container').removeClass('m-body-nopad');
        return girder.App.prototype.navigateTo.apply(this, arguments);
    }
});
