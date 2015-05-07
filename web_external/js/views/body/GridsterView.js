minerva.views.GridsterView = minerva.View.extend({

    initialize: function () {
        girder.cancelRestRequests('fetch');
        this.collection = new minerva.collections.DatasetCollection();
        this.collection.fetch();
        this.render();
    },

    render: function () {
        this.$el.html(minerva.templates.gridsterPage({}));

        this.dataPanel = new minerva.views.DataPanel({
            el: this.$('.dataPanel'),
            collection: this.collection,
            parentView: this
        });

        this.layersPanel = new minerva.views.LayersPanel({
            el: this.$('.layersPanel'),
            collection: this.collection,
            parentView: this
        }).render();

        this.mapPanel = new minerva.views.MapPanel({
            el: this.$('.mapPanel'),
            collection: this.collection,
            parentView: this
        }).render();

        this.geometryPanel = new minerva.views.GeometryPanel({
            el: this.$('.geometryPanel'),
            parentView: this
        }).render();

        this.analysisPanel = new minerva.views.AnalysisPanel({
            el: this.$('.analysisPanel'),
            parentView: this
        }).render();

        this.$('.gridster ul').gridster({
            widget_margins: [10, 10],
            widget_base_dimensions: [210, 210]
        });

        return this;
    }
});

minerva.router.route('maps', 'maps', function () {
    girder.events.trigger('g:navigateTo', minerva.views.GridsterView);
});
