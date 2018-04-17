import View from '../view';
import template from '../../templates/widgets/screenshotResultWidget.pug';
import '../../stylesheets/widgets/screenshotResultWidget.styl';

const ScreenshotResultWidget = View.extend({
    events: {
    },
    initialize(options) {
        this.image = options.image;
    },
    render() {
        if (!this.modalOpenned) {
            var el = this.$el.html(template(this));
            this.modalOpenned = true;
            var modal = el.girderModal(this);
            modal.trigger($.Event('ready.girder.modal', { relatedTarget: modal }));
        } else {
            this.$el.html(template(this));
        }
        return this;
    }
});

export default ScreenshotResultWidget;
