import View from '../view';
import template from '../../templates/widgets/clickInfoWidget.pug';
import '../../stylesheets/widgets/clickInfoWidget.styl';
/**
 * Creates a widget that displays information on what was clicked on.
 */
const ClickInfoWidget = View.extend({
    initialize: function () {
        this.listenTo(this.model, 'change', this.render);
        this.$el.dialog({
            appendTo: '#m-map-panel',
            autoOpen: false,
            position: {
                my: 'right bottom',
                at: 'right bottom'
            },
            height: 250,
            width: 600
        });
    },
    render: function () {
        this.$el.html(this.template(this.model.toJSON()));
        this.$el.dialog('open');
        return this;
    },
    template: template,
    className: 'm-click-info-widget'
});
export default ClickInfoWidget;
