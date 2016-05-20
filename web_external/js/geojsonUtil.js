minerva.geojson = {};

/**
 * Merge a new value into an accumulation object.
 * The result depends on the value type:
 *
 * 1. string: stores a values object that maps
 *            the values encountered to the total
 *            number of occurences.
 *
 * 2. number: stores the minimum and maximum values
 *            encountered
 */
minerva.geojson.merge = function merge(value, accumulated) {
    accumulated = accumulated || {count: 0};
    accumulated.count += 1;
    switch (typeof value) {
        case 'string':
            accumulated.values = accumulated.values || {};
            accumulated.values[value] = (accumulated.values[value] || 0) + 1;
            break;

        case 'number':
            if (isFinite(value)) {
                accumulated.nFinite = (accumulated.nFinite || 0) + 1;
                accumulated.min = Math.min(
                    accumulated.min !== undefined ? accumulated.min : Number.POSITIVE_INFINITY,
                    value
                );
                accumulated.max = Math.max(
                    accumulated.max !== undefined ? accumulated.max : Number.NEGATIVE_INFINITY,
                    value
                );
                accumulated.sum = (accumulated.sum || 0) + value;
                accumulated.sumsq = (accumulated.sumsq || 0) + value * value;
            }
            break;
    }
    return accumulated;
};

/**
 * Accumulate property values into a summary object.  The
 * output object will have keys encountered in the feature
 * array mapped to an object that summarizes the values
 * encountered.
 *
 * @param {object[]} features An array of "property" objects
 * @returns {object}
 */
minerva.geojson.accumulate = function accumulate(features) {
    var feature, i, accumulated = {}, key;

    for (i = 0; i < features.length; i += 1) {
        feature = features[i];
        for (key in feature) {
            if (feature.hasOwnProperty(key)) {
                accumulated[key] = minerva.geojson.merge(feature[key], accumulated[key]);
            }
        }
    }

    return accumulated;
};

/**
 * Normalize a geojson object turning geometries into features and
 * returning a feature collection.  The returned feature collection
 * is processed to provide a summary object containing accumulated
 * property statistics that can be used to generate numeric/color
 * scales for visualization.
 */
minerva.geojson.normalize = function normalize(geojson) {
    var normalized;

    switch (geojson.type) {
        case 'FeatureCollection':
            normalized = geojson;
            break;

        case 'Feature':
            normalized = {
                type: 'FeatureCollection',
                features: [geojson]
            };
            break;

        case 'GeometryCollection':
            normalized = {
                type: 'FeatureCollection',
                features: geojson.geometries.map(function (g) {
                    return {
                        type: 'Feature',
                        geometry: g,
                        properties: {}
                    };
                })
            };
            break;

        case 'Point':
        case 'LineString':
        case 'Polygon':
        case 'MultiPoint':
        case 'MultiLineString':
        case 'MultiPolygon':
            normalized = {
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    geometry: geojson,
                    properties: {}
                }]
            };
            break;

        default:
            throw new Error('Invalid json type');
    }

    // generate property summary
    normalized.summary = minerva.geojson.accumulate(
        normalized.features.map(function (f) { return f.properties; })
    );

    return normalized;
};

/**
 * Set style properties in the geojson according to the
 * `visProperties` mapping.  This will loop through all
 * of the contained features and append "property"
 * key -> value pairs for each vis property.
 *
 * This method mutates the geojson object.
 *
 * @note assumes the geojson object is normalized
 */
minerva.geojson.style = function style(geojson, visProperties) {
    _.each(geojson.features || [], function (feature) {
        var properties = feature.properties || {};
        var geometry = feature.geometry || {};

        _.each(visProperties, function (scale, key) {
            properties[key] = scale(properties, key, geometry);
        });

        feature.properties = properties;
    });

    return geojson;
};
