minerva.views.JobsPanel = minerva.View.extend({

    initialize: function () {
    },

    render: function () {
        this.$el.html(minerva.templates.jobsPanel({}));

        return this;
    }
});
