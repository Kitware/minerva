minerva.views.JobsPanel = minerva.views.Panel.extend({

    initialize: function () {
        var columnEnum = girder.views.jobs_JobListWidget.prototype.columnEnum;
        var columns = columnEnum.COLUMN_STATUS_ICON |
                      columnEnum.COLUMN_TITLE;
        this.jobListWidget = new girder.views.jobs_JobListWidget({ // eslint-disable-line new-cap
            columns: columns,
            showHeader: false,
            pageLimit: 10,
            showPaging: false,
            triggerJobClick: true,
            parentView: this
        }).on('g:jobClicked', function (job) {
            // update the job before displaying, as the job in the collection
            // could be stale and out of sync from the display in the job panel
            job.once('g:fetched', function () {
                this.jobDetailsWidgetModalWrapper = new minerva.views.JobDetailsWidgetModalWrapper({
                    job: job,
                    el: $('#g-dialog-container'),
                    parentView: this
                });
                this.jobDetailsWidgetModalWrapper.render();
            }, this).fetch();
        }, this);

        girder.events.on('m:job.created', function () {
            this.jobListWidget.collection.fetch({}, true);
        }, this);

        minerva.views.Panel.prototype.initialize.apply(this);
    },

    render: function () {
        this.$el.html(minerva.templates.jobsPanel({}));
        this.jobListWidget.setElement(this.$('.m-jobsListContainer')).render();

        return this;
    }
});
