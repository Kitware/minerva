minerva.models.DatasetModel = girder.models.ItemModel.extend({

    getFullDataset: function () {
        // TODO
        // get the full item
        console.log('DatasetModel.getFullDataset, no implementation');
    },

    getGeoJson: function () {
        // TODO
        // only get the geojson file, or whatever is the output of processing
        // possibly rename to generalize
        console.log('DatasetModel.getGeoJson, no implementation');
    },

    createGeoJson: function () {
        // TODO
        // tell the server to process the file and create geojson
        // or process more generally
        console.log('DatasetModel.createGeoJson, no implementation');
    },
});
