/**
 * Extend the hierarchy widget with a button to import geonames data
 */
girder.wrap(girder.views.HierarchyWidget, 'render', function (render) {
    render.call(this);

    if (this.parentModel.getAccessLevel() === girder.AccessType.ADMIN &&
        this.parentModel.get('_modelType') === 'folder') {
        var classes = 'btn btn-sm btn-danger';
        this.$('.g-folder-header-buttons > .g-upload-here-button')
            .before(
                '<button class="g-import-geonames-data-button ' +
                classes + '" title="Import geonames database here">' +
                '<i class="icon-download-cloud"/>' +
                '</button>'
            );
        var button = this.$('.g-import-geonames-data-button').tooltip({
                container: this.$el,
                animation: false,
                delay: {
                    show: 100
                }
            }).hide(); // enable if the folder is empty
        girder.restRequest({
            type: 'GET',
            path: 'item',
            data: {
                folderId: this.parentModel.get('_id'),
                limit: 1
            }
        }).done(_.bind(function (resp) {
            if (resp.length === 0) {
                button.show();
            }
        }, this));
    }
});

girder.views.HierarchyWidget.prototype.events['click .g-import-geonames-data-button'] = function () {
    // prevent double clicks
    this.$('.g-import-geonames-data-button').prop('disabled', 'disabled');

    girder.restRequest({
        type: 'POST',
        path: 'resource/geonames',
        data: {
            folder: this.parentModel.get('_id'),
            progress: true
        }
    });

    this.parentView.render();
};
