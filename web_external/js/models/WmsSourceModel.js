minerva.models.WmsSourceModel = minerva.models.SourceModel.extend({

    initialize: function () {
        var params = this.attributes.params;
        this.createSource(params);
    },

    isRenderable: function () {
        return true
    },

    loadData: function () {
        // underscore doesn't have a deep has() unction?

        if (this.geoJsonAvailable) {
            this.loadGeoJsonData();
        } else {
            var file_id;
            var minervaMeta = this.getMinervaMetadata();
            // Manage contourJson style files here
            // for now. (will refactor this and loadGeoJsonData later)
            try {
                // need better API here or something -  why doesn't underscore
                // have a recursive _.has()? e.g., _.has(minervaMeta, "original_files", 0, "_id")
                file_id = minervaMeta.original_files[0]._id;
            } catch (e) {
                file_id = false;
            }
            if (file_id) {
                $.ajax({
                    url: girder.apiRoot + '/file/' + minervaMeta.original_files[0]._id + '/download',
                    contentType: 'application/json',
                    success: _.bind(function (data) {
                        this.fileData = data;
                        this.geoFileReader = 'contourJsonReader';
                    }, this),
                    complete: _.bind(function () {
                        this.trigger('m:dataLoaded', this.get('_id'));
                    }, this)
                });
            }
        }
    },

    createSource: function (params) {
        girder.restRequest({
            path: '/minerva_source_wms',
            type: 'POST',
            data: params,
            error: null // ignore default error behavior (validation may fail)
        }).done(_.bind(function (resp) {
            console.log(resp);
            this.set(resp);
            this.trigger('m:saved');
        }, this)).error(_.bind(function (err) {
            this.trigger('m:error', err);
        }, this));

        return this;
    }
});
