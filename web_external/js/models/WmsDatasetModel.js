minerva.models.WmsDatasetModel = minerva.models.DatasetModel.extend({

    // TODO possibly can be removed after dataset/source refactor
    isRenderable: function () {
        return true;
    }
});
