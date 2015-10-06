minerva.models.GeojsonDatasetModel = minerva.models.DatasetModel.extend({

    isRenderable: function () {
        return true;
    },

    requireSpecializedRendering: function () {
        var minervaMeta = this.getMinervaMetadata();
        return (minervaMeta.geojson_file &&
                minervaMeta.geojson_file.feature_type === 'points');
    },

    createGeojsonDataset: function (params) {
        girder.restRequest({
            path: '/minerva_dataset_geojson',
            type: 'POST',
            data: params,
            error: null // ignore default error behavior (validation may fail)
        }).done(_.bind(function (resp) {
            this.set(resp);
            this.trigger('m:wmsDatasetAdded');
        }, this)).error(_.bind(function (err) {
            this.trigger('m:error', err);
        }, this));

        return this;
    },

    loadData: function () {
        if (this.fileData) {
            this.trigger('m:dataLoaded', this.get('_id'));
        } else {
            var minervaMeta = this.getMinervaMetadata();
            // Download geojson file.
            $.ajax({
                url: girder.apiRoot + '/file/' + minervaMeta.geojson_file._id + '/download',
                contentType: 'application/json',
                success: _.bind(function (data) {
                    this.fileData = data;
                    this.geoFileReader = 'jsonReader';
                }, this),
                complete: _.bind(function () {
                    this.trigger('m:dataLoaded', this.get('_id'));
                }, this)
            });
        }
    }
});
