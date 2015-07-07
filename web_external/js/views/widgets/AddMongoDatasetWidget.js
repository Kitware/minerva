/**
* This widget displays a form for adding a Mongo collection as a
* Minerva dataset.
*/
minerva.views.AddMongoDatasetWidget = minerva.View.extend({

    events: {
        'submit #m-add-mongo-dataset-form': function (e) {
            e.preventDefault();
            this.$('.m-add-dataset-button').addClass('disabled');

            var datasetName = this.$('#m-dataset-name').val();
            var mongoUri = this.$('#m-mongo-uri').val();
            var mongoCollection = this.$('#m-mongo-collection').val();

            var dataset = new minerva.models.DatasetModel({});
            dataset.on('m:externalMongoDatasetCreated', function () {
                this.$el.modal('hide');
                this.collection.add(dataset);
            }, this).createExternalMongoDataset(datasetName, mongoUri, mongoCollection);
        }
    },

    initialize: function (settings) {
        this.collection = settings.collection;
    },

    render: function () {
        var modal = this.$el.html(minerva.templates.addMongoDatasetWidget({}));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

        return this;
    }

});
