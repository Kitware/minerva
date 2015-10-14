minerva.views.ElasticGeospaceWidget = minerva.View.extend({

    events: {
        'submit #m-elastic-geospace-form': 'submitForm'
    },

    initialize: function (settings) {
        this.analysis = settings.analysis;
        this.sourceCollection = settings.sourceCollection;

        this.render();
    },

    render: function () {
        var modal = this.$el.html(minerva.templates.elasticGeospaceWidget({
            sources: this.sourceCollection.models
        })).girderModal(this);

        // daterange stuff
    },

    submitForm: function (e) {
        e.preventDefault();
        this.$('.g-validation-failed-message').text('');

        var jobItemId = this.analysis.get('_id'),
            sourceId = this.$('#m-elastic-geospace-input-source').val(),
            query = this.$('#m-elastic-geospace-query').val() || '',
            dateRange = this.$('#m-elastic-geospace-daterange').val();

        if (!sourceId) {
            this.$('.g-validation-failed-message').text('Must have a source');
        }

        girder.restRequest({
            path: 'item/' + jobItemId + '/romanesco',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                inputs: {
                    query: {
                        format: 'json',
                        data: query
                    },
                    host: {
                        format: 'json',
                        data: window.location.hostname
                    },
                    port: {
                        format: 'json',
                        data: window.location.port
                    },
                    token: {
                        format: 'json',
                        data: girder.cookie.find('girderToken')
                    },
                    sourceId: {
                        format: 'json',
                        data: sourceId
                    }
                },
                outputs: {
                    result: {
                        format: 'json'
                    }
                }
            })
        }).done(_.bind(function () {
            this.$el.modal('hide');
            girder.events.trigger('m:job.created');
        }, this));
    }
});
