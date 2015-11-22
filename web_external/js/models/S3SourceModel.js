var S3SourceModel = minerva.models.SourceModel.extend({

    createSource: function (params) {
        girder.restRequest({
            path: '/minerva_source_s3',
            type: 'POST',
            data: params,
            error: null // don't do default error behavior (validation may fail)
        }).done(_.bind(function (resp) {
            this.metadata(resp);
            this.trigger('m:sourceReceived');
        }, this)).error(_.bind(function (err) {
            this.trigger('m:error', err);
            // If we couldn't successfully start the s3 import destroy the item.
            this.destroy();
        }, this));

        return this;
    },

    destroy: function () {
        var folderId = this.metadata().folder_id;
        this.on('g:deleted', _.bind(function () {

            if (folderId) {
                var args = {
                    path: '/folder/' + folderId,
                    type: 'DELETE'
                };

                girder.restRequest(args).done(_.bind(function () {
                    this.trigger('m:deleted');
                }, this)).error(_.bind(function (err) {
                    this.trigger('m:error', err);
                }, this));
            }

        }, this));
        // First call the superclass to delete the item
        minerva.models.SourceModel.prototype.destroy.call(this);

        return this;
    }
});

minerva.registerSourceModel('S3SourceModel', 's3', S3SourceModel);
