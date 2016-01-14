minerva.models.ClickInfoModel = Backbone.Model.extend({
    defaults: {
        // geojs layer object
        layer: null,

        // minerva data
        dataset: null,

        // mouse information object from geojs
        mouse: null,

        // the datum of the feature clicked on (if available)
        datum: null
    }
});
