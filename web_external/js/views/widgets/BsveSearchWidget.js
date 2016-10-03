/**
* This widget is used to edit json params for bsve search.
*/
minerva.views.BsveSearchWidget = minerva.View.extend({

    events: {
        'submit #m-bsve-search-form': function (e) {
            e.preventDefault();
            this.$('.g-validation-failed-message').text('');

            var searchParams = this.$('#m-bsveSearchParams').val();
            var datasetName = this.$('#m-bsveSearchDatasetName').val();

            if (!datasetName || datasetName === '') {
                this.$('.g-validation-failed-message').text('Dataset name is required');
                return;
            }

            try {
                // parse for side effect of validation
                JSON.parse(searchParams);
                this.$('.g-validation-failed-message').text('');
            } catch (err) {
                this.$('.g-validation-failed-message').text('BSVE Search Params must be valid JSON');
                return;
            }

            this.$('button.m-runBsveSearch').addClass('disabled');

            var data = {
                datasetName: datasetName,
                bsveSearchParams: searchParams
            };
            girder.restRequest({
                path: 'minerva_analysis/bsve_search',
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
        var modal = this.$el.html(minerva.templates.bsveSearchWidget({
        })).girderModal(this).on('ready.girder.modal', _.bind(function () {
        }, this));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

        return this;
    }
});
