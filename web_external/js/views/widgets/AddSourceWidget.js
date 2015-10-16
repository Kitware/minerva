/**
* This widget is used to add a new source
*/
minerva.views.AddSourceWidget = minerva.View.extend({
    events: {
        'submit #m-add-source-form': function (e) {
            e.preventDefault();

            var sourceType = $('#m-add-source-form input:radio:checked').attr('id');
            var container = $('#g-dialog-container');

            if (sourceType === 'm-wms-source') {
                this.wmsSourceWidget = new minerva.views.AddWmsSourceWidget({
                    el: container,
                    title: 'Enter WMS Source details',
                    noParent: true,
                    collection: this.collection,
                    parentView: this.parentView
                }).render();
            } else if (sourceType === 'm-elasticsearch-source') {
                this.elasticsearchSourceWidget = new minerva.views.AddElasticsearchSourceWidget({
                    el: container,
                    title: 'Enter Elasticsearch Source details',
                    noParent: true,
                    collection: this.collection,
                    parentView: this.parentView
                }).render();
            } else if (sourceType === 'm-postgres-source') {
                this.postgresSourceWidget = new minerva.views.AddPostgresSourceWidget({
                    el: container,
                    title: 'Enter Postgres Source details',
                    noParent: true,
                    collection: this.collection,
                    parentView: this.parentView
                }).render();
            } else {
                console.error('Unknown source type');
            }
        }
    },

    initialize: function (settings) {
        this.collection = settings.collection;
    },

    render: function () {
        var view = this;
        var modal = this.$el.html(minerva.templates.addSourceWidget({
            session: this.model
        })).girderModal(this).on('shown.bs.modal', function () {
            view.$('#m-wms-name').focus();
        }).on('hidden.bs.modal', function () {
        }).on('ready.girder.modal', function () {
        });
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

        return this;
    }

});
