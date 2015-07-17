minerva.models.S3DatasetModel = minerva.models.DatasetModel.extend({

    initialize: function () {
    },

    save: function () {

        // First call the superclass to create the item
        minerva.models.DatasetModel.prototype.save.call(this).on('g:saved', _.bind(function() {
            var data = {};
            _.each(this.attributes, function (value, key) {
                if (typeof value !== 'object') {
                    data[key] = value;
                }
            });

            var id = this.get('_id');

            girder.restRequest({
                path: '/minerva_dataset_s3/' + id + '/dataset',
                type: 'POST',
                data: data,
                error: null // don't do default error behavior (validation may fail)
            }).done(_.bind(function (resp) {
                this.setMinervaMetadata(resp);
                this.trigger('m:saved');
            }, this)).error(_.bind(function (err) {
                this.trigger('m:error', err);
                // If we couldn't successfully start the s3 import destroy the
                // item.
                this.destroy();
            }, this));
        }, this)).on('g:error', _.bind(function (err) {
            console.error(err);
        }, this));

        return this;
    },

    destroy: function (opts) {
        var meta = this.get('meta');

        // First call the superclass to delete the item
        minerva.models.DatasetModel.prototype.destroy.call(this).on('g:deleted', _.bind(function() {

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
    },

    getDatasetType: function () {
        return 's3';
    },
});
