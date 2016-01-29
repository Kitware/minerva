minerva.views.JobDetailsWidgetModalWrapper = minerva.View.extend({
    initialize: function (settings) {
        this.job = settings.job;
    },

    render: function () {
        var modal = this.$el.html(minerva.templates.jobDetailsWidgetModalWrapper({})).girderModal(this);
        this.jobDetailWidget = new girder.views.jobs_JobDetailsWidget({ // eslint-disable-line new-cap
            el: $('.jobDetailsWrapper'),
            parentView: this,
            job: this.job,
            renderImmediate: true
        });
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

        return this;
    }
});
