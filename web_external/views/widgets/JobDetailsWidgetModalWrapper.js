import JobDetailsWidget from 'girder_plugins/jobs/views/JobDetailsWidget';
import View from '../view';
import template from '../../templates/widgets/jobDetailsWidgetModalWrapper.pug';

const JobDetailsWidgetModalWrapper = View.extend({
    initialize: function (settings) {
        this.job = settings.job;
    },

    render: function () {
        var modal = this.$el.html(template({})).girderModal(this);
        this.jobDetailWidget = new JobDetailsWidget({ // eslint-disable-line new-cap
            el: $('.jobDetailsWrapper'),
            parentView: this,
            job: this.job,
            renderImmediate: true
        });
        modal.trigger($.Event('ready.girder.modal', { relatedTarget: modal }));

        return this;
    }
});
export default JobDetailsWidgetModalWrapper;
