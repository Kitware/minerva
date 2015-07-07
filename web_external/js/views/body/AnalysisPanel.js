minerva.views.AnalysisPanel = minerva.View.extend({

    initialize: function () {
    },

    render: function () {
        this.$el.html(minerva.templates.analysisPanel({}));

        return this;
    }
});
