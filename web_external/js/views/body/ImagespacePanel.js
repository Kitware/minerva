minerva.views.ImagespacePanel = minerva.View.extend({
    initialize: function (options) {
        options = options || {};

        this.ads = options.ads;
        this.render();

        // Clear out ads panel when a dataset is removed
        // TODO This ignores the notion of having multiple datasets on the map.
        minerva.events.once('m:remove-dataset', _.bind(function (){
            this.$el.empty();
        }, this));
    },

    render: function () {
        this.$el.html(minerva.templates.imagespacePanel({
            ads: _.first(this.ads || [], 10)
        }));

        this.$el.show();
    }
});
