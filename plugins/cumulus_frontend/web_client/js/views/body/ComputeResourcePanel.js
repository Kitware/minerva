/**
 * This view is in charge of the Compute Resources panel.
 * The panel is backed by a collection of compute resource models.
 *
 * This panel is responsible for the following:
 *   Viewing (and keeping up to date) a list of compute resources
 *   Adding compute resources
 *   Allowing a user to view a cluster's details
 *   Terminating a cluster
 *   Removing a cluster
 *
 * In the need for keeping the panel list up to date, 2 main types of event
 * handling need to happen:
 * 1) When the collection changes (via reset or remove) this view needs
 * to be re-rendered but ALSO listen to changes in status on any individual
 * model in the collection as this effects what type of icon would be displayed.
 * 2) When the Girder event stream triggers a g:event.cluster.status, this indicates
 * that one of the cluster models has changed status - and as such it gets set on the
 * appropriate model. This action triggers a re-render through item 1.
 **/
minerva.views.ComputeResourcePanel = minerva.views.Panel.extend({
    events: {
        'click .m-add-computeresource': 'addComputeResourceDialog',
        'click .m-cluster-details': 'viewClusterDetails',
        'click .m-terminate-cluster': 'terminateCluster',
        'click .m-remove-cluster': 'removeCluster'
    },

    initialize: function () {
        minerva.views.Panel.prototype.initialize.apply(this);
        this.collection = new minerva.collections.ComputeResourceCollection();

        // When the collection is fetched (it gets reset), re-render and ensure that
        // each model listens for a status change and re-renders.
        this.listenTo(this.collection, 'reset', _.bind(function (collection) {
            collection.each(_.bind(function (model) {
                this.listenTo(model, 'change:status', _.bind(this.render, this));
            }, this));

            this.render();
        }, this));

        // When clusters are removed, stop listening and re-render
        this.listenTo(this.collection, 'remove', _.bind(function (model) {
            this.stopListening(model);
            this.render();
        }, this));

        // When a new status is received from a cluster, change the model.
        // The changes to the model will propagate to the above listeners, which will
        // re-render this panel, updating icons/text.
        girder.eventStream.on('g:event.cluster.status', function (e) {
            var cluster = this.collection.get(e.data._id);
            cluster.set('status', e.data.status);
        }, this);

        this.collection.fetch();
    },

    render: function () {
        this.$el.html(girder.templates.computeResourcePanel({
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
    },

    viewClusterDetails: function (e) {
        var resource = this.collection.get($(e.currentTarget).attr('m-resource-id'));

        new minerva.views.ComputeResourceDetailWidget({
            el: $('#g-dialog-container'),
            model: resource,
            parentView: this
        }).render(true);
    },

    terminateCluster: function (e) {
        var resource = this.collection.get($(e.currentTarget).attr('m-resource-id'));
        e.stopPropagation();

        if (!_.contains(['error', 'terminating', 'terminated'], resource.get('status'))) {
            girder.restRequest({
                path: '/clusters/' + resource.id + '/terminate',
                type: 'PUT'
            });
        } else {
            resource.destroy();
        }
    },

    removeCluster: function (e) {
        var resource = this.collection.get($(e.currentTarget).attr('m-resource-id'));
        e.stopPropagation();
        resource.destroy();
    }
});
