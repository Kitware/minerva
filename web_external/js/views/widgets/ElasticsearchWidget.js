/**
* This widget is used to display and run an Elasticsearch query.
*/
minerva.views.ElasticsearchWidget = minerva.View.extend({

    events: {
        'submit #m-elasticsearch-form': function (e) {
            e.preventDefault();
            this.$('.g-validation-failed-message').text('');

            var searchParams = this.$('#m-elasticsearch-dataset-params').val();
            var datasetName = this.$('#m-elasticsearch-dataset-name').val();

            if (!datasetName || datasetName === '') {
                this.$('.g-validation-failed-message').text('Dataset name is required');
                return;
            }

            try {
                // parse for side effect of validation
                JSON.parse(searchParams);
                this.$('.g-validation-failed-message').text('');
            } catch (err) {
                this.$('.g-validation-failed-message').text('Search Params must be valid JSON');
                return;
            }

            this.$('button.m-run-elasticsearch-query').addClass('disabled');

            var data = {
                datasetName: datasetName,
                searchParams: searchParams,
                sourceId: this.source.get('id')
            };

            girder.restRequest({
                path: 'minerva_query_elasticsearch',
                type: 'POST',
                data: data
            }).done(_.bind(function () {
                girder.events.trigger('m:job.created');
                this.$el.modal('hide');
            }, this));

        }
    },

    initialize: function (settings) {
        this.source = settings.source;
    },

    render: function () {
        var modal = this.$el.html(minerva.templates.elasticsearchWidget({
        })).girderModal(this).on('ready.girder.modal', _.bind(function () {
        }, this));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

        return this;
    }
});
