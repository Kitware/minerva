/**
 * Creates a widget that displays information on what was clicked on.
 */
minerva.views.ClickInfoWidget = minerva.View.extend({
    initialize: function (settings) {
        this.listenTo(this.model, 'change', this.render);
        this.$el.dialog({appendTo: '#m-map-panel', autoOpen: false});
    },
    render: function (settings) {
        this.$el.html(this.template(this.model.attributes));
        this.$el.dialog('open');
    },
    template: minerva.templates.clickInfoWidget,
    className: 'm-click-info-widget'
});
