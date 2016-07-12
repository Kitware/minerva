minerva.App = girder.App.extend({

    render: function () {
        this.$el.html(minerva.templates.layout());

        return this;
    }

});
