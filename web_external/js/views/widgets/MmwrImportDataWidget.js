/**
* This widget is used to download and accumulate MMWR data from the BSVE
*/
minerva.views.MmwrImportDataWidget = minerva.View.extend({

    events: {
        'submit #m-mmwr-import-form': function (e) {
            e.preventDefault();

            var count = this.$('#m-mmwrDataCount').val();
            var datasetName = this.$('#m-mmwrImportDatasetName').val();

            if (!datasetName || datasetName === '') {
                this.$('.g-validation-failed-message').text('Dataset name is required');
                return;
            }

            this.$('button.m-runMmwrImport').addClass('disabled');

            var data = {
                datasetName: datasetName,
                count: count
            };
            girder.restRequest({
                path: 'minerva_analysis/mmwr_import',
                type: 'POST',
                data: data
            }).done(_.bind(function () {
                girder.events.trigger('m:job.created');
                this.$el.modal('hide');
            }, this));
        }
    },

    initialize: function () {
    },

    render: function () {
        var modal = this.$el.html(minerva.templates.mmwrImportDataWidget({
        })).girderModal(this).on('ready.girder.modal', _.bind(function () {
        }, this));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

        return this;
    }
});
