girder.wrap(girder.views.FileListWidget, 'render', function (render) {
    render.call(this);
    if (!this.parentItem || !this.parentItem.get('_id')) {
        return this;
    }
    if (this.parentItem.getAccessLevel() < girder.AccessType.WRITE) {
        return this;
    }
    var minerva = (this.parentItem.get('meta') || {}).minerva;
    var files = this.collection.toArray();
    _.each(files, function (file) {
        var isMinervaGeojson = ((minerva || {}).geojson_file || {})._id === file.id;
        if (!minerva && $.inArray(file.get('mimeType'), ['application/json', 'application/vnd.geo+json']) < 0 && !file.get('name').match(/\.(geojson|json)(\.|$)/i)) {
            return;
        }
        var actions = $('.g-file-list-link[cid="' + file.cid + '"]',
                        this.$el).closest('.g-file-list-entry').children(
                        '.g-file-actions-container');
        if (!actions.length) {
            return;
        }
        var fileAction = girder.templates.minerva_fileAction({
            file: file, minerva: minerva, geojson: isMinervaGeojson});
        if (fileAction) {
            actions.prepend(fileAction);
        }
    });
    $('.g-minerva-geojson-remove', this.$el).on('click', _.bind(function () {
        this.parentItem.removeMetadata('minerva', _.bind(function () {
            this.parentItem.unset('meta');
            this.parentItem.fetch();
        }, this));
    }, this));
    $('.g-minerva-geojson-create', this.$el).on('click', _.bind(function (e) {
        var cid = $(e.currentTarget).parent().attr('file-cid');
        var fileId = this.collection.get(cid).id;
        girder.restRequest({
            type: 'POST',
            path: 'minerva_dataset_geojson',
            data: {itemId: this.parentItem.id},
            error: function (error) {
                if (error.status !== 0) {
                    girder.events.trigger('g:alert', {
                        text: error.responseJSON.message,
                        type: 'info',
                        timeout: 5000,
                        icon: 'info'
                    });
                }
            }
        }).done(_.bind(function () {
            this.parentItem.unset('meta');
            this.parentItem.fetch();
        }, this));
    }, this));
    return this;
});
