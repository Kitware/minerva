minerva.views.JobsPanel = minerva.View.extend({

    initialize: function () {
        var columnEnum = girder.views.jobs_JobListWidget.prototype.columnEnum;
        var columns = columnEnum.COLUMN_STATUS_ICON |
                      columnEnum.COLUMN_TITLE;
        this.jobListWidget = new girder.views.jobs_JobListWidget({
            columns: columns,
            showHeader: false,
            pageLimit: 10,
            showPaging: false,
            triggerJobClick: true,
            parentView: this
        }).on('g:jobClicked', function (job) {
            // TODO right way to update specific job?
            // otherwise can get a detail that is out of sync with actual job status
            // seems weird to update the entire collection from here
            // another option is to refresh the job specifically
            this.jobListWidget.collection.on('g:changed', function () {
                job = this.jobListWidget.collection.get(job.get('id'));
                this.jobDetailsWidgetModalWrapper = new minerva.views.JobDetailsWidgetModalWrapper({
                    job: job,
                    el: $('#g-dialog-container'),
                    parentView: this
                });
                this.jobDetailsWidgetModalWrapper.render();
            }, this);
            this.jobListWidget.collection.fetch({}, true);
        }, this);

        girder.events.once('m:job.created', function () {
            this.jobListWidget.collection.fetch({}, true);
        }, this);

    },

    render: function () {
        this.$el.html(minerva.templates.jobsPanel({}));
        this.jobListWidget.setElement(this.$('.m-jobsListContainer'));

        return this;
    }
});
