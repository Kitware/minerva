/**
* This widget is used to diplay minerva metadata for a dataset.
*/
minerva.views.DatasetHierarchyWidget = minerva.View.extend({
    events: {
        'click .m-use-selected-button': 'updateModelWithSelectedItems'
    },
    initialize: function (settings) {
        // this.folderAccess = settings.folderAccess || false;
        this.folderAccess = false;
        this.dataset = settings.dataset;
        this.folderId = settings.folderId;
        this.folder = new girder.models.FolderModel();

        this.folder.set({
            _id: this.folderId,
            minerva: this.dataset.get('meta').minerva
        });

        this.folder.on('g:fetched', function () {
            this._createHierarchyWidget();
            this.render();
        }, this).on('g:error', function () {
            this.folder = null;
            this._createHierarchyWidget();
            this.render();
        }, this).fetch();
    },

    updateModelWithSelectedItems: function () {
        // if we already have something checked because of selectedItems
        // then itemListView.checked will be out of date,  recompute it here.
        // We have a one source of truth problem that needs to be resolved between
        // itemListView.checked and DataModel.attributes.meta.minerva.selectedItems
        this.hierarchyWidget.itemListView.recomputeChecked();

        var resources = this.hierarchyWidget.getCheckedResources();
        this.dataset.get('meta').minerva.selectedItems = resources.item || [];
        this.dataset.save();
        this.$el.modal('hide');

        return this;
    },

    _createHierarchyWidget: function () {
        this.hierarchyWidget = new minerva.views.ReadOnlyHierarchyWidget({
            parentView: this,
            parentModel: this.folder,
            folderAccess: false,
            upload: false,
            folderCreate: false,
            folderEdit: false,
            itemCreate: false,
            checkboxes: false
        });
        return this;
    },

    render: function () {
        var modal = this.$el.html(minerva
                                  .templates
                                  .datasetHierarchyWidget({}))
                .girderModal(this)
                .on('ready.girder.modal',
                    _.bind(function () {
                        this.hierarchyWidget.setElement(this.$('.datasetHierarchy')).render();
                    }, this));

        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

        return this;
    }
});
