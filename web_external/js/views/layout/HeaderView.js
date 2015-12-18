minerva.views.LayoutHeaderView = minerva.View.extend({
    events: {
    },

    render: function () {

        this.$('a[title]').tooltip({
            placement: 'bottom',
            delay: {show: 300}
        });

        new minerva.views.LayoutHeaderUserView({
            el: this.$('.m-current-user-wrapper'),
            parentView: this
        }).render();
    }
});
