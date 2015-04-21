minerva.views.LayersPanel = minerva.View.extend({

    initialize: function () {
        console.log('layerspanel init');//
    },

    render: function () {
        this.$el.html(minerva.templates.layersPanel({}));

        return this;
    }
});



