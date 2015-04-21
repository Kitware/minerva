minerva.views.DataPanel = minerva.View.extend({

    initialize: function () {
        console.log('datapanel init');//
    },

    render: function () {
        this.$el.html(minerva.templates.dataPanel({}));

        // TODO use a modal

/**        new minerva.views.UploadShapefileView({
            el: this.$('.loadData'),
            parentView: this
        }).render();*/

        return this;
    }
});


