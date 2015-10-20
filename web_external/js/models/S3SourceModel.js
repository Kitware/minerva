minerva.models.S3SourceModel = minerva.models.SourceModel.extend({

    initialize: function () {
    },

    createSource: function (params) {
        girder.restRequest({
            path: '/minerva_source_s3',
            type: 'POST',
            data: params,
            error: null // don't do default error behavior (validation may fail)
        }).done(_.bind(function (resp) {
            this.setMinervaMetadata(resp);
            this.trigger('m:sourceReceived');
        }, this)).error(_.bind(function (err) {
            this.trigger('m:error', err);
            // If we couldn't successfully start the s3 import destroy the item.
            this.destroy();
        }, this));

        return this;
    },

    destroy: function () {
        var meta = this.get('meta');

        // First call the superclass to delete the item
        minerva.models.DatasetModel.prototype.destroy.call(this).on('g:deleted', _.bind(function () {

            if (meta) {
                var args = {
                    path: '/folder/' + meta.minerva.folderId,
                    type: 'DELETE'
                };

                girder.restRequest(args).done(_.bind(function () {
                    this.trigger('m:deleted');
                }, this)).error(_.bind(function (err) {
                    this.trigger('m:error', err);
                }, this));
            }

        }, this));

        return this;
    }
});
