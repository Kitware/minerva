minerva.views.MapPanel = minerva.View.extend({

    initialize: function () {
        console.log('mappanel init');//
    },

    render: function () {
        this.$el.html(minerva.templates.mapPanel({}));

        return this;
    }
});



