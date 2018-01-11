import events from 'girder/events';
import JobListWidget from 'girder_plugins/jobs/views/JobListWidget';

import Panel from '../body/Panel';
import JobDetailsWidgetModalWrapper from '../widgets/JobDetailsWidgetModalWrapper';
import template from '../../templates/body/jobsPanel.pug';

const JobsPanel = Panel.extend({

    initialize: function () {
        var columnEnum = JobListWidget.prototype.columnEnum;
        var columns = columnEnum.COLUMN_STATUS_ICON |
                      columnEnum.COLUMN_TITLE;
        this.jobListWidget = new JobListWidget({ // eslint-disable-line new-cap
            columns: columns,
            showHeader: false,
            pageLimit: 6,
            showPaging: false,
            triggerJobClick: true,
            parentView: this
        }).on('g:jobClicked', function (job) {
            // update the job before displaying, as the job in the collection
            // could be stale and out of sync from the display in the job panel
            job.once('g:fetched', function () {
                this.jobDetailsWidgetModalWrapper = new JobDetailsWidgetModalWrapper({
                    job: job,
                    el: $('#g-dialog-container'),
                    parentView: this
                });
                this.jobDetailsWidgetModalWrapper.render();
            }, this).fetch();
        }, this);

        events.on('m:job.created', function () {
            this.jobListWidget.collection.fetch({}, true);
        }, this);

        Panel.prototype.initialize.apply(this);
    },

    render: function () {
        this.$el.html(template({}));
        this.jobListWidget.setElement(this.$('.m-jobsListContainer')).render();

        return this;
    }
});
export default JobsPanel;
