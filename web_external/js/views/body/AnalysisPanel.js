minerva.views.AnalysisPanel = minerva.View.extend({

    initialize: function () {
        console.log('analysispanel init');//
    },

    render: function () {
        this.$el.html(minerva.templates.analysisPanel({}));

        return this;
    }
});
