/**
* This widget is used to edit json params for bsve search.
*/
minerva.views.PdfTableExtractionWidget = minerva.View.extend({

    events: {
        'submit #m-pdf-table-extraction-form': function (e) {
            e.preventDefault();
            this.$('.g-validation-failed-message').text('');

            var pdfSource = this.sourceCollection.get(this.$('#m-pdf-table-extraction-input-source').val());
            var pageNumber = this.$('#m-pdf-table-extraction-page-parameter').val();

            // TODO validate as numeric
            if (!pageNumber || pageNumber === '') {
                this.$('.g-validation-failed-message').text('page number is required');
                return;
            }

            this.$('button.m-run-pdf-table-extraction').addClass('disabled');

            var data = {
                sourceId: pdfSource.get('_id'),
                pageNumber: pageNumber
            };
            girder.restRequest({
                path: 'minerva_analysis/pdf_table_extraction',
                type: 'POST',
                data: data
            }).done(_.bind(function () {
                girder.events.trigger('m:job.created');
                this.$el.modal('hide');
            }, this));
        },
        'change #m-pdf-table-extraction-input-source': function (evt) {
            this.$('#m-pdf-table-source-select-placeholder').remove();
            this.$('.m-run-pdf-table-extraction').prop('disabled', false);
            var el = $(evt.currentTarget);
            var source = this.sourceCollection.get(el.val());
            var fileCollection = new girder.collections.FileCollection();
            fileCollection.altUrl = 'item/' + source.get('_id') + '/files';
            fileCollection.append = true; // Append, don't replace pages
            fileCollection.on('g:changed', function () {
                // TODO hardcoded static path
                var downloadUrl = '/api/v1/file/' + fileCollection.models[0].get('_id') + '/download?contentDisposition=inline';
                var pdfViewer = document.createElement('object');
                pdfViewer.type = 'application/pdf';
                pdfViewer.data = downloadUrl;
                pdfViewer.width = '100%';
                pdfViewer.height = '100%';
                this.$('.m-pdf-table-extraction-display').empty();
                this.$('.m-pdf-table-extraction-display').append(pdfViewer);
                this.$('.m-pdf-table-extraction-display').show();
            }, this).fetch();
        }

    },

    initialize: function (settings) {
        this.datasetCollection = settings.datasetCollection;
        this.sourceCollection = settings.sourceCollection;
        this.analysis = settings.analysis;
        this.pdfSources = _.filter(this.sourceCollection.models, function (source) {
            return (source.getSourceType() === 'item' &&
                    source.metadata().item_type === 'application/pdf');
        });
    },

    render: function () {
        var modal = this.$el.html(minerva.templates.pdfTableExtractionWidget({
            pdfSources: this.pdfSources
        })).girderModal(this).on('ready.girder.modal', _.bind(function () {
        }, this));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

        return this;
    }
});
