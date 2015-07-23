/**
* This widget is used to diplay minerva metadata for a dataset.
*/
minerva.views.DatasetHierarchyWidget = minerva.View.extend({
    initialize: function (settings) {
        // this.folderAccess = settings.folderAccess || false;
        this.folderAccess = false;

        this.folder = new girder.models.FolderModel();
        this.folder.set({
            "_id": settings.folderID
        })

        this.folder.on('g:fetched', function () {
            this._createHierarchyWidget();
            this.render();
        }, this).on('g:error', function () {
            this.folder = null;
            this._createHierarchyWidget();
            this.render();
        }, this).fetch();

    },
    _createHierarchyWidget: function () {
        this.hierarchyWidget = new girder.views.HierarchyWidget({
            parentModel: this.folder,
            folderAccess: this.folderAccess,
            upload: false,
            folderCreate: false,
            folderEdit: false,
            itemCreate: false,
            parentView: this
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
                        this.hierarchyWidget.setElement(this.$(".datasetHierarchy")).render();
                    }, this));

        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

        return this;
    }
});
