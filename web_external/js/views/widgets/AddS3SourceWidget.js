/**
* This widget displays a form for adding a new S3 source.
*/
minerva.views.AddS3SourceWidget = minerva.View.extend({

    events: {
        'submit #m-add-s3-source-form': function (e) {
            e.preventDefault();

            var params = {
                name: $('#m-s3-source-name').val(),
                bucket: $('#m-s3-bucket').val(),
                prefix: $('#m-s3-prefix').val(),
                accessKeyId: $('#m-s3-access-key-id').val(),
                secret: $('#m-s3-secret').val(),
                service: $('#m-s3-service').val(),
                readOnly: $('#m-s3-readonly').val(),
                folderId: this.collection.folderId
            };

            if (params.prefix.indexOf('/') !== 0) {
                params.prefix = '/' + params.prefix;
            }

            if (name.trim() === '' || bucket.trim() === '') {
                this.$('.g-validation-failed-message').text('Source name and S3 bucket name are required');
                return;
            }

            var s3Source = new minerva.models.S3SourceModel();
            s3Source.on('m:sourceReceived', function () {
                this.$el.modal('hide');
                this.$('.g-validation-failed-message').text('');
                // TODO: might need to be added to a new panel/data sources ?
                girder.events.trigger('m:job.created');
            }, this).on('m:error', function (msg) {
                this.$('.g-validation-failed-message').text(msg.responseText);
            }, this).createSource(params);
        }
    },

    initialize: function (settings) {
        this.title = 'Enter S3 bucket details';
        this.collection = settings.collection;
    },

    render: function () {
        var modal = this.$el.html(minerva.templates.addS3SourceWidget({
        }));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

        return this;
    }
});
