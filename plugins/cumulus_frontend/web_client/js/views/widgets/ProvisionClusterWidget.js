minerva.views.ProvisionClusterWidget = minerva.View.extend({
    events: {
        'click .m-cluster-provision-button': 'provisionCluster'
    },

    initialize: function(settings) {
        this.el = settings;
        this.parentView = settings.parentView;
        this.model = settings.model;

        return this;
    },

    render: function () {
        this.$el.html(girder.templates.provisionClusterWidget({cluster: this.model})).girderModal(this);

        return this;
    },

    provisionCluster: _.debounce(function (e) {
        if (this.model.isProvisionable()) {
            girder.restRequest({
                path: '/clusters/' + this.model.id + '/provision',
                type: 'PUT',
                contentType: 'application/json',
                data: JSON.stringify({
                    playbook: $('#m-cluster-provision-playbook').val()
                }),
            }).done(_.bind(function (response) {
                $('.modal-footer a[data-dismiss="modal"]').click();
            })).error(console.error);
        }
    }, 500, true)
});
