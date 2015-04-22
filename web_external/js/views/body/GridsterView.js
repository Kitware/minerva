minerva.views.GridsterView = minerva.View.extend({

    initialize: function () {
        girder.cancelRestRequests('fetch');
        console.log('init');//
        this.render();
    },

    render: function () {
        this.$el.html(minerva.templates.gridsterPage({}));

        new minerva.views.DataPanel({
            el: this.$('.dataPanel'),
            parentView: this
        });

        new minerva.views.LayersPanel({
            el: this.$('.layersPanel'),
            parentView: this
        }).render();

        new minerva.views.MapPanel({
            el: this.$('.mapPanel'),
            parentView: this
        }).render();

        new minerva.views.GeometryPanel({
            el: this.$('.geometryPanel'),
            parentView: this
        }).render();

        new minerva.views.AnalysisPanel({
            el: this.$('.analysisPanel'),
            parentView: this
        }).render();

        this.$(".gridster ul").gridster({
                    widget_margins: [10, 10],
                    widget_base_dimensions: [210, 210]
                });

        return this;
    }
});

minerva.router.route('maps', 'maps', function () {
    girder.events.trigger('g:navigateTo', minerva.views.GridsterView);
});
