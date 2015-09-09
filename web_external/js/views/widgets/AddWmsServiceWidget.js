/**
* This widget displays a form for adding WMS services
*/
minerva.views.AddWmsServiceWidget = minerva.View.extend({

    events: {
        'submit #m-add-wms-service-form': function (e) {
            e.preventDefault();
            var params = {
                name: this.$('#m-wms-name').val(),
                baseUri: this.$('#m-wms-uri').val(),
                username: this.$('#m-wms-username').val(),
                password: this.$('#m-wms-password').val()
            };

            console.log(params);

            // var datasetName = this.$('#m-dataset-name').val();
            // var mongoUri = this.$('#m-mongo-uri').val();
            // var mongoCollection = this.$('#m-mongo-collection').val();

            // var dataset = new minerva.models.DatasetModel({});
            // dataset.on('m:externalMongoDatasetCreated', function () {
            //     this.$el.modal('hide');
            //     this.collection.add(dataset);
            // }, this).createExternalMongoDataset(datasetName, mongoUri, mongoCollection);
        }
    },

    initialize: function (settings) {
        this.collection = settings.collection;
    },

    render: function () {
        var modal = this.$el.html(minerva.templates.addWmsServiceWidget({}));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
        return this;
    }

});
