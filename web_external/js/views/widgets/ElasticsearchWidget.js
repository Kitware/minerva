minerva.views.ElasticsearchWidget = minerva.View.extend({

    events: {
        'submit #m-elastic-search-form': function (e) {
            e.preventDefault();
            var itemId = this.analysis.get('_id');

            var data = {
                inputs: {
                    query: {
                        format: 'json',
                        data: this.$('#m-elastic-search-query').val()
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
                    }
                },
                outputs: {
                    result: {
                        format: 'json'
                    }
                }
            };

            girder.restRequest({
                path: 'item/' + itemId + '/romanesco',
                type: 'POST',
                data: JSON.stringify(data),
                contentType: 'application/json'
            }).done(_.bind(function () {
                girder.events.trigger('m:job.created');
            }));
        }
    },

    initialize: function (settings) {
        this.datasetsCollection = settings.datasetsCollection;
        this.analysis = settings.analysis;

        this.render();
    },

    render: function () {
        var modal = this.$el.html(minerva.templates.elasticsearchWidget({
        })).girderModal(this).on('ready.girder.modal', _.bind(function () {
        }, this));
    }
});
