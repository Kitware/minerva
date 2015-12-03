/**
* This widget is used to diplay minerva metadata for a dataset.
*/
minerva.views.PdfViewWidget = minerva.View.extend({

    initialize: function (settings) {
        this.setCurrentSource(settings.source);
    },

    /**
     * Change the current source.
     *
     * @param  source  The source to display.
     */
    setCurrentSource: function (source) {
        this.source = source;
        // TODO extract pdf file
        this.collection = new girder.collections.FileCollection();
        this.collection.altUrl = 'item/' + source.get('_id') + '/files';
        this.collection.append = true; // Append, don't replace pages
    },

    render: function () {
        this.collection.on('g:changed', function () {
            var modal = this.$el.html(minerva.templates.pdfViewWidget({
                        name: this.source.get('name'),
                        // TODO get static path, currently hardcoded
                        data: '/api/v1/file/' + this.collection.models[0].get('_id') + '/download?contentDisposition=inline'
                    }))
                    .girderModal(this)
                    .on('ready.girder.modal',
                                _.bind(function () {
                                }, this));
                    modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
        }, this).fetch();

        return this;
    }
});
