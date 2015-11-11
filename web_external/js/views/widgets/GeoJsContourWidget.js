/**
* This widget is used to edit params for GeoJs contour analysis.
*/
minerva.views.GeoJsContourWidget = minerva.View.extend({

    events: {
        'submit #m-geojs-contour-form': function (e) {
            e.preventDefault();
            this.$('.g-validation-failed-message').text('');

            var datasetId = this.$('#m-geojs-contour-input-dataset').val();
            var parameter = this.$('#m-geojs-contour-parameter').val();
            var timestep = this.$('#m-geojs-contour-timestep').val();
            var dataset = this.datasetsCollection.get(datasetId);
            var itemId = this.analysis.get('_id');
            var selectedDatasetItem = dataset.metadata().selectedItems[0];

            girder.restRequest({
                path: 'item/' + selectedDatasetItem  + '/files',
                type: 'GET',
                data: {
                    limit: 1
                },
                contentType: 'application/json'
            }).done(_.bind(function (files) {
                var data = {
                        inputs: {
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
                            fileId: {
                                format: 'json',
                                name: 'fileId',
                                data: files[0]._id
                            },
                            variable: {
                                format: 'json',
                                data: parameter
                            },
                            timestep: {
                                format: 'number',
                                data: Number.parseInt(timestep)
                            }
                        },
                        outputs: {
                            result: {
                                format: 'json'
                            }
                        }
                    };

                girder.restRequest({
                    path: 'item/' + itemId  + '/romanesco',
                    type: 'POST',
                    data: JSON.stringify(data),
                    contentType: 'application/json'
                }).done(_.bind(function () {
                    this.$el.modal('hide');
                    girder.events.trigger('m:job.created');
                }, this));
            }, this));
        }
    },

    initialize: function (settings) {
        this.datasetsCollection = settings.datasetsCollection;
        this.analysis = settings.analysis;
    },

    render: function () {
        var modal = this.$el.html(minerva.templates.geoJsContourWidget({
            datasets: this.datasetsCollection.models
        })).girderModal(this).on('ready.girder.modal', _.bind(function () {
        }, this));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

        return this;
    }
});
