minerva.views.ComputeResourcePanel = minerva.views.Panel.extend({
    events: {
        'click .m-add-computeresource': 'addComputeResourceDialog'
    },


    initialize: function () {
        this.collection = new minerva.collections.ComputeResourceCollection();

        minerva.views.Panel.prototype.initialize.apply(this);
    },

    render: function () {
        this.$el.html(girder.templates.resourcePanel({
            resources: this.collection.models
        }));

        return this;
    },

    addComputeResourceDialog: function(){
        var container = $("#g-dialog-container");

        this.addComputeResourceWidget = new minerva.views.AddComputeResourceWidget({
            el: container,
            collection: this.collection,
            parentView: this
        }).render();
    }
});
