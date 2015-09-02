(function () {

    /**
    * This widget is used to add a new dataset
    */
    minerva.views.AddS3DataSetWidget = minerva.View.extend({
        events: {
            'submit #m-add-s3-dataset-form': function (e) {
                e.preventDefault();

                var fields = {
                    name: $('#m-s3-dataset-name').val(),
                    bucket: $('#m-s3-bucket').val(),
                    prefix: $('#m-s3-prefix').val(),
                    accessKeyId: $('#m-s3-access-key-id').val(),
                    secret: $('#m-s3-secret').val(),
                    service: $('#m-s3-service').val(),
                    readOnly: $('#m-s3-readonly').val(),
                    folderId: this.collection.folderId
                };

                if (fields.prefix.indexOf('/') !== 0) {
                    fields.prefix = '/' + fields.prefix;
                }

                this.model = new minerva.models.S3DatasetModel(fields);
                this.model.on('m:saved', function () {
                    this.$el.modal('hide');
                    this.collection.add(this.model);
                    girder.events.trigger('m:job.created');
                }, this).on('m:error', function (err) {
                    var message = 'An unexpected error occurred. Please check the console form more details';

                    if ('responseJSON' in err && 'message' in err.responseJSON) {
                        message = err.responseJSON.message;
                    }

                    this.$('.g-validation-failed-message').text(err.responseJSON.message);
                    girder.events.trigger('m:job.created');
                }, this).save();
            }
        },

        initialize: function (settings) {
            this.model = settings.model || null;
            // parentCollection only needed for a new session to know
            // the parent container for the new item
            this.parentCollection = settings.parentCollection;
            this.parentView = settings.parentView;
            this.session = settings.parentView.session;
            this.upload = settings.parentView.upload;
            this.validateShapefileExtensions = settings.parentView.validateShapeFileExtensions || false;
            this.assetstoreCollection = new girder.collections.AssetstoreCollection();
            this.assetstoreCollection.fetch();
            this.collection = settings.parentView.collection;

        },

        render: function () {
            var modal = this.$el.html(minerva.templates.addS3DataSetWidget({
                session: this.model
            }));
            modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

            return this;
        }
    });
})();
