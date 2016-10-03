/**
 * Creates a widget that displays information on what was clicked on.
 */
minerva.views.ClickInfoWidget = minerva.View.extend({
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
        this.$el.html(this.template(this.model.attributes));
        this.$el.dialog('open');
    },
    template: minerva.templates.clickInfoWidget,
    className: 'm-click-info-widget'
});
