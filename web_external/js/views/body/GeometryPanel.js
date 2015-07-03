minerva.views.GeometryPanel = minerva.View.extend({

    initialize: function () {
    },

    render: function () {
        this.$el.html(minerva.templates.geometryPanel({}));

        return this;
    }
});
