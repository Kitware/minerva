minerva.views.GeometryPanel = minerva.View.extend({

    initialize: function () {
        console.log('geometrypanel init');//
    },

    render: function () {
        this.$el.html(minerva.templates.geometryPanel({}));

        return this;
    }
});



