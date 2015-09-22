minerva.views.SourcePanel = minerva.View.extend({

    events: {
        'click .m-add-source': 'addSourceDialog',
        'click .m-display-wms-layers-list': 'displayWmsLayersList',
        'click .m-icon-info': 'displaySourceInfo',
        'click .m-delete-source': 'deleteSource'
    },

    addSourceDialog: function () {
        var container = $('#g-dialog-container');

        this.addSourceWidget = new minerva.views.AddSourceWidget({
            el: container,
            collection: this.sourceCollection,
            parentView: this
        }).render();
    },

    displayWmsLayersList: function (evt) {
        var el = $(evt.currentTarget);
        var wmsSource = this.sourceCollection.get(el.attr('cid'));
        if (!this.wmsLayersListWidget) {
            this.wmsLayersListWidget = new minerva.views.WmsLayersListWidget({
                el: $('#g-dialog-container'),
                source: wmsSource,
                collection: this.datasetCollection,
                parentView: this
            });
            this.wmsLayersListWidget.render();
        } else {
            this.wmsLayersListWidget.setCurrentSource(wmsSource);
        }
    },

    displaySourceInfo: function (evt) {
        var el = $(evt.currentTarget);
        var source = this.sourceCollection.get(el.attr('cid'));
        this.sourceInfoWidget = new minerva.views.SourceInfoWidget({
            el: $('#g-dialog-container'),
            source: source,
            parentView: this
        });
        this.sourceInfoWidget.render();
    },

    deleteSource: function (evt) {
        var el = $(evt.currentTarget);
        var source = this.sourceCollection.get(el.attr('cid'));
        this.sourceCollection.remove(source);
        source.destroy();
    },

    initialize: function (settings) {
        this.session = settings.session;
        this.sourceCollection = settings.sourceCollection;
        this.datasetCollection = settings.datasetCollection;
        this.listenTo(this.sourceCollection, 'g:changed', function () {
            this.render();
        }, this).listenTo(this.sourceCollection, 'change', function () {
            this.render();
        }, this).listenTo(this.sourceCollection, 'change:displayed', function () {
            this.render();
        }, this).listenTo(this.sourceCollection, 'add', function () {
            this.render();
        }, this).listenTo(this.sourceCollection, 'remove', function () {
            this.render();
        }, this);
    },

    render: function () {
        this.$el.html(minerva.templates.sourcePanel({
            sources: this.sourceCollection.models
        }));

        var tooltipProperties = {
            placement: 'left',
            delay: 400,
            container: this.$el,
            trigger: 'hover'
        };
        this.$('.m-add-source').tooltip(tooltipProperties);

        return this;
    }
});
