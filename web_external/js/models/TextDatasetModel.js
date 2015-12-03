minerva.models.TextDatasetModel = minerva.models.DatasetModel.extend({

    isRenderable: function () {
        return false;
    },

    isDownloadable: function () {
        return true;
    },

});
