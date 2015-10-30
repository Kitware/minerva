minerva.views.ImagespacePanel = minerva.View.extend({
    initialize: function (options) {
        options = options || {};

        this.ads = options.ads;
        this.render();
    },

    render: function () {
        this.$el.html(minerva.templates.imagespacePanel({
            ads: _.first(this.ads || [], 10)
        }));
    }
});
