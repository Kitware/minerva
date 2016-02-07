/**
* This widget is used to edit params for GeoJs contour analysis.
*/
minerva.views.ContourWidget = minerva.View.extend({

    events: {
        'submit #m-contour-geojson-form': function (e) {
            e.preventDefault();
            this.$('.g-validation-failed-message').text('');


            var datasetId = this.$('#m-geojs-contour-input-dataset').val();
            var dataset = this.datasetCollection.get(datasetId);
            var datasetName = this.$('#m-contour-geojson-dataset-name').val();

            if (!datasetName || datasetName === '') {
                this.$('.g-validation-failed-message').text('Dataset name is required');
                return;
            }

            this.$('.g-validation-failed-message').text('');
            this.$('button.m-run-geojs-contour').addClass('disabled');

            var data = {
                datasetName: datasetName,
                datasetId: dataset.get('_id'),
            };
            girder.restRequest({
                path: 'minerva_analysis/geojson_contour',
                type: 'POST',
                data: data
            }).done(_.bind(function () {
                girder.events.trigger('m:job.created');
                this.$el.modal('hide');
            }, this));
        },
    },

    initialize: function (settings) {
        this.datasetCollection = settings.datasetCollection;
        this.analysis = settings.analysis;
    },

    render: function () {
        var geojsonDatasets = _.filter(this.datasetCollection.models, function (dataset) {
            return dataset.getDatasetType() === 'geojson';
        }, this);
        var modal = this.$el.html(minerva.templates.contourWidget({
            datasets: geojsonDatasets
        })).girderModal(this).on('ready.girder.modal', _.bind(function () {
        }, this));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

        return this;
    }
});
