/** */
minerva.models.MapLayerModel = Backbone.Model.extend({
    /** */
    initialize: function (settings) {
        this.dataset = settings.dataset;
        this.adapter = settings.adapter;
        // => MapLayerView
        this.geoJsLayer = settings.geoJsLayer;
        var opacity = _.isUndefined(settings.opacity) || _.isNull(settings.opacity) ? 1 : settings.opacity;
        // => MapLayerView
        this.geoJsLayer.opacity(opacity);
    },

    /** */
    renderable: function () {
        this.trigger('m:map_layer_renderError');
    },

    /** */
    deleteLayer: function (geoJsMap) {
        // => MapLayerView
        geoJsMap.deleteLayer(this.geoJsLayer);
    },

    /** */
    setOpacity: function (opacity) {
        this.geoJsLayer.opacity(opacity);
    }
});

/** */
minerva.models.ReaderMapLayerModel = minerva.models.MapLayerModel.extend({
    defaults: {
        readerType: 'jsonReader'
    },

    uponGeoDataLoaded: function () {
        try {
            var reader = geo.createFileReader(this.get('readerType'), {layer: this.geoJsLayer});
            reader.read(this.dataset.get('geoData'), _.bind(function () {
                this.trigger('m:map_layer_renderable');
            }, this));
        } catch (err) {
            console.error('This dataset cannot be rendered to the map');
            console.error(err);
            this.dataset.set('geoError', true);
            // => MapLayerView
            this.geoJsLayer.clear();
            this.trigger('m:map_layer_renderError');
        }
    },

    /** */
    renderable: function () {
        this.dataset.once('m:dataset_geo_dataLoaded', function () {
            this.uponGeoDataLoaded();
        }, this);
        this.dataset.loadGeoData();
    }
});

/** */
minerva.models.GeojsonMapLayerModel = minerva.models.ReaderMapLayerModel.extend({});
/** */
minerva.models.ContourjsonMapLayerModel = minerva.models.ReaderMapLayerModel.extend({
    defaults: {
        readerType: 'contourJsonReader'
    }
});
/** */
minerva.models.ChoroplethMapLayerModel = minerva.models.GeojsonMapLayerModel.extend({
    uponGeoDataLoaded: function () {
        var data = [];
        var colorByValue = this.dataset.getMinervaMetadata().colorByValue;
        var colorScheme = this.dataset.getMinervaMetadata().colorScheme;
//>> => MapLayerView
        var polygon = this.geoJsLayer.createFeature('polygon', {selectionAPI: true});

        // Loop through the data and transform multipolygons into
        // arrays of polygons.  Note: it would also be possible
        // to generate a polygon feature for each polygon/multipolygon
        // geometry in the geojson, but this would (1) inefficient, and
        // (2) make handling mouse events much more difficult.
        JSON.parse(this.dataset.get('geoData')).features.forEach(function (f) {
            if (f.geometry.type === 'Polygon') {
                data.push({
                    outer: f.geometry.coordinates[0],
                    inner: f.geometry.coordinates.slice(1),
                    properties: f.properties
                });
            } else if (f.geometry.type === 'MultiPolygon') {
                f.geometry.coordinates.forEach(function (p) {
                    // all of the split polygons share the same property object
                    data.push({
                        outer: p[0],
                        inner: p.slice(1),
                        properties: f.properties
                    });
                });
            }
        });

        // this is the value accessor for the choropleth
        var value = function (_a, _b, d) {
            return (d || {}).properties[colorByValue] || 0;
        };

        // the data extent
        var extent = d3.extent(data, function (d) {
            return d.properties[colorByValue];
        });

        // generate the color scale
        var domain = [extent[0], 0.5 * (extent[0] + extent[1]), extent[1]];
        var scale = d3.scale.linear()
            .domain(domain)
            .range(colorbrewer[colorScheme][3]);

        polygon.position(function (d) {
            return {
                x: d[0],
                y: d[1],
                z: d[2] || 0
            };
        }).style({
            fillColor: function () {
                var v = value.apply(value, arguments);
                var c = scale(v);
                c = geo.util.convertColor(c);
                return c;
            },
        }).data(data);
//<< => MapLayerView

        this.trigger('m:map_layer_renderable');
    }
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
            // => MapLayerView
            geoJsLayer: geoJsMap.createLayer('feature')
        });
    }
};
/** */
minerva.views.MapAdapter.contour = {
    /** */
    createMapLayer: function (dataset, adapter, geoJsMap) {
        return new minerva.models.ContourjsonMapLayerModel({
            dataset: dataset,
            adapter: adapter,
            // => MapLayerView
            geoJsLayer: geoJsMap.createLayer('feature')
        });
    }
};
/** */
minerva.views.MapAdapter.choropleth = {
    /** */
    createMapLayer: function (dataset, adapter, geoJsMap) {
        var mapLayer = new minerva.models.ChoroplethMapLayerModel({
            dataset: dataset,
            adapter: adapter,
            // => MapLayerView
            geoJsLayer: geoJsMap.createLayer('feature')
        });
        // TODO better place to do this?
        // TODO set slider value.
        mapLayer.setOpacity(0.75);

        return mapLayer;
    }
};
