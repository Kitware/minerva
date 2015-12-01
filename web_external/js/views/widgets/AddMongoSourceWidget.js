/**
* This widget displays a form for adding a Mongo collection as a
* Minerva dataset.
*/
minerva.views.AddMongoSourceWidget = minerva.View.extend({

    events: {
        'submit #m-add-mongo-source-form': function (e) {
            e.preventDefault();
            this.$('.m-add-source-button').addClass('disabled');

            var params = {
                name: $('#m-mongo-source-name').val(),
                dbConnectionUri: $('#m-mongo-uri').val(),
                folderId: this.collection.folderId
            };

            var mongoSource = new minerva.models.MongoSourceModel();
            mongoSource.on('m:sourceReceived', function () {
                this.$el.modal('hide');
                this.collection.add(mongoSource);
            }, this).createSource(params);
        }
    },

    initialize: function (settings) {
        this.title = 'Enter MongoDB connection details';
        this.collection = settings.collection;
    },

    render: function () {
        var modal = this.$el.html(minerva.templates.addMongoSourceWidget({
        }));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

        return this;
    }

});
