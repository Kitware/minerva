/** */
minerva.models.MapLayerModel = Backbone.Model.extend({
    /** */
    initialize: function (settings) {
        this.dataset = settings.dataset;
        this.adapter = settings.adapter;
        this.geoJsLayer = settings.geoJsLayer;
        var opacity = _.isUndefined(settings.opacity) || _.isNull(settings.opacity) ? 1 : settings.opacity;
        this.geoJsLayer.opacity(opacity);
    },

    /** */
    renderable: function () {
        this.trigger('m:map_layer_renderError');
    },

    /** */
    deleteLayer: function (geoJsMap) {
        geoJsMap.deleteLayer(this.geoJsLayer);
    },

    /** */
    setOpacity: function (opacity) {
        this.geoJsLayer.opacity(opacity);
    }
});

/** */
minerva.models.GeojsonMapLayerModel = minerva.models.MapLayerModel.extend({
    /** */
    renderable: function () {
        this.dataset.once('m:dataset_geo_dataLoaded', function () {
            try {
                var reader = geo.createFileReader('jsonReader', {layer: this.geoJsLayer});
                reader.read(this.dataset.get('geoData'), _.bind(function () {
                    this.trigger('m:map_layer_renderable');
                }, this));
            } catch (err) {
                console.error('This dataset cannot be rendered to the map');
                console.error(err);
                this.dataset.set('geoError', true);
                this.geoJsLayer.clear();
                this.trigger('m:map_layer_renderError');
            }
        }, this);
        this.dataset.loadGeoData();
    },
});

/** */
minerva.views.MapAdapter = {};

/** */
minerva.views.MapAdapter.geojson = {
    /** */
    createMapLayer: function (dataset, adapter, geoJsMap) {
        return new minerva.models.GeojsonMapLayerModel({
            dataset: dataset,
            adapter: adapter,
            geoJsLayer: geoJsMap.createLayer('feature')
        });
    }
};
