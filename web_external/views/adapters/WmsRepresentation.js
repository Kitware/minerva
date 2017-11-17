import _ from 'underscore';

import MapRepresentation from './MapRepresentation';

var multibandTemplate = _.template('<?xml version="1.0" encoding="UTF-8"?><StyledLayerDescriptor version="1.0.0" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><NamedLayer><Name><%= typeName %></Name><UserStyle><Title>Style</Title><IsDefault>1</IsDefault><FeatureTypeStyle><Rule><RasterSymbolizer><Opacity>1.0</Opacity><ChannelSelection><RedChannel><SourceChannelName><%= redChannel %></SourceChannelName></RedChannel><GreenChannel><SourceChannelName><%= greenChannel %></SourceChannelName></GreenChannel><BlueChannel><SourceChannelName><%= blueChannel %></SourceChannelName></BlueChannel></ChannelSelection></RasterSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>');

var singlebandTemplate = _.template('<?xml version="1.0" encoding="UTF-8"?><StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.0.0" xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd"><NamedLayer><Name><%= typeName %></Name><UserStyle><Title>SLD Single Band</Title><IsDefault>1</IsDefault><FeatureTypeStyle><Rule><RasterSymbolizer><Opacity>1.0</Opacity><ChannelSelection><GrayChannel><SourceChannelName>1</SourceChannelName></GrayChannel></ChannelSelection><ColorMap extended="true"><ColorMapEntry color="#000000" opacity="0" quantity="<%= nodataMin %>" label="0"/><%= colorMapEntry %><ColorMapEntry color="#000000" opacity="0" quantity="<%= nodataMax %>" label="0"/></ColorMap></RasterSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>');

var polygonTemplate = _.template('<?xml version="1.0" encoding="UTF-8"?><StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.0.0" xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd"><NamedLayer><Name><%= typeName %></Name><UserStyle><Title>Polygon</Title><IsDefault>1</IsDefault><FeatureTypeStyle><Rule><PolygonSymbolizer><Fill><CssParameter name="fill"><ogc:Function name="Interpolate"><ogc:PropertyName><%= attribute %></ogc:PropertyName><%= colorValueMapping %><ogc:Literal>color</ogc:Literal></ogc:Function></CssParameter></Fill></PolygonSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>');

var pointTemplate = _.template('<?xml version="1.0" encoding="UTF-8"?><StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.0.0" xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd"><NamedLayer><Name><%= typeName %></Name><UserStyle><Title>Point</Title><IsDefault>1</IsDefault><FeatureTypeStyle><Rule><PointSymbolizer><Graphic><Mark><WellKnownName><%= marker %></WellKnownName><Fill><CssParameter name="fill"><ogc:Function name="Interpolate"><ogc:PropertyName><%= attribute %></ogc:PropertyName><%= colorValueMapping %><ogc:Literal>color</ogc:Literal></ogc:Function></CssParameter></Fill></Mark></Graphic></PointSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>');

var lineTemplate = _.template('<?xml version="1.0" encoding="UTF-8"?><StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.0.0" xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd"><NamedLayer><Name><%= typeName %></Name><UserStyle><Title>Line</Title><IsDefault>1</IsDefault><FeatureTypeStyle><Rule><LineSymbolizer><Stroke><CssParameter name="stroke"><ogc:Function name="Interpolate"><ogc:PropertyName><%= attribute %></ogc:PropertyName><%= colorValueMapping %><ogc:Literal>color</ogc:Literal></ogc:Function></CssParameter></Stroke></LineSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>');

function generateSequence(start, stop, count) {
    // Generates a sequence of numbers with the given
    // start, stop and count variables

    var sequence = [];
    var step = (stop - start) / (count - 1.0);
    for (var i = 0; i < count; i++) {
        sequence.push(parseFloat(start + i * step));
    }
    return sequence;
}

/**
 * GeoJs WMS MapRepresentation definition, with type 'wms'.
 */
class WmsRepresentation extends MapRepresentation {
    /**
     * Async function to define a rendered GeoJs wms layer for the passed in dataset.
     *
     * @param {Object} container - An implementor of the MapContainer interface
     * @param {minerva.models.DatasetModel} dataset - The dataset to be rendered
     * @fires 'm:map_layer_renderable' event upon successful layer render definition
     * @fires 'm:map_layer_error' event upon an error defining the layer rendering
     */
    init(container, dataset) {
        this.geoJsLayer = container.createLayer('osm', {
            attribution: null,
            keepLower: false
        });
        container.addFeatureInfoLayer(this.geoJsLayer);
        var minervaMetadata = dataset.metadata();
        this.geoJsLayer.layerName = minervaMetadata.type_name;
        this.geoJsLayer.baseUrl = '/wms_proxy/' + encodeURIComponent(minervaMetadata.base_url);
        var projection = 'EPSG:3857';

        this.geoJsLayer.url(
            _.bind(function (x, y, zoom) {
                var bb = this.geoJsLayer.gcsTileBounds({ x: x, y: y, level: zoom }, projection);
                var bboxMercator = bb.left + ',' + bb.bottom + ',' + bb.right + ',' + bb.top;
                var params = {
                    SERVICE: 'WMS',
                    VERSION: '1.1.1',
                    REQUEST: 'GetMap',
                    LAYERS: minervaMetadata.type_name,
                    STYLES: '',
                    BBOX: bboxMercator,
                    WIDTH: 256,
                    HEIGHT: 256,
                    FORMAT: 'image/png',
                    TRANSPARENT: true,
                    SRS: projection
                };
                // There is a lot of repeated code here. It can be easily refactored
                // but expecting much more complex vis options so for now keep them
                // separate

                var sldBody = null;
                var min = null;
                var max = null;
                var nodata = null;
                var ramp = null;
                var count = null;
                var seq = null;
                var colorMapTemplate = null;
                var colorValuePairs = null;
                var attribute = null;
                if (minervaMetadata.sld_params) {
                    if (minervaMetadata.sld_params.subType === 'multiband') {
                        sldBody = multibandTemplate({
                            typeName: minervaMetadata.sld_params.typeName,
                            redChannel: minervaMetadata.sld_params.redChannel.split(':')[0].toString(),
                            greenChannel: minervaMetadata.sld_params.greenChannel.split(':')[0].toString(),
                            blueChannel: minervaMetadata.sld_params.blueChannel.split(':')[0].toString()
                        });
                    } else if (minervaMetadata.sld_params.subType === 'singleband') {
                        min = parseFloat(minervaMetadata.sld_params.min);
                        max = parseFloat(minervaMetadata.sld_params.max);
                        nodata = parseFloat(minervaMetadata.sld_params.nodata);
                        // If nodata is greater than max it has to be added
                        // to the end, otherwise it has to be added to the
                        // begining
                        var nodataMin = min - 1;
                        var nodataMax = max + 1;
                        if (nodata > max) {
                            nodataMax = nodata;
                        } else if (nodata < min) {
                            nodataMin = nodata;
                        }
                        ramp = minervaMetadata.sld_params['ramp[]'];
                        count = ramp.length;
                        seq = generateSequence(min, max, count);
                        colorValuePairs = seq.map(function (num, i) {
                            return [num, ramp[i]];
                        });
                        colorMapTemplate = _.template('<ColorMapEntry color="<%= color %>" quantity="<%= value %>" />');
                        var colorMapEntry = _.map(colorValuePairs, function (pair) {
                            return colorMapTemplate({
                                color: pair[1],
                                value: pair[0]
                            });
                        }).join('');
                        sldBody = singlebandTemplate({
                            typeName: minervaMetadata.sld_params.typeName,
                            colorMapEntry: colorMapEntry,
                            nodataMin: nodataMin,
                            nodataMax: nodataMax
                        });
                    } else {
                        min = parseFloat(minervaMetadata.sld_params.min);
                        max = parseFloat(minervaMetadata.sld_params.max);
                        ramp = minervaMetadata.sld_params['ramp[]'];
                        count = ramp.length;
                        attribute = minervaMetadata.sld_params.attribute;
                        seq = generateSequence(min, max, count);
                        colorValuePairs = seq.map(function (num, i) {
                            return [num, ramp[i]];
                        });
                        colorMapTemplate = _.template('<ogc:Literal><%= value %></ogc:Literal><ogc:Literal><%= color %></ogc:Literal>');
                        var colorValueMapping = _.map(colorValuePairs, function (pair) {
                            return colorMapTemplate({
                                color: pair[1],
                                value: pair[0]
                            });
                        }).join('');

                        if (minervaMetadata.sld_params.subType === 'point') {
                            var marker = minervaMetadata.sld_params.marker;
                            sldBody = pointTemplate({
                                typeName: minervaMetadata.sld_params.typeName,
                                colorValueMapping: colorValueMapping,
                                attribute: attribute,
                                marker: marker
                            });
                        } else if (minervaMetadata.sld_params.subType === 'line') {
                            sldBody = lineTemplate({
                                typeName: minervaMetadata.sld_params.typeName,
                                colorValueMapping: colorValueMapping,
                                attribute: attribute
                            });
                        } else {
                            sldBody = polygonTemplate({
                                typeName: minervaMetadata.sld_params.typeName,
                                colorValueMapping: colorValueMapping,
                                attribute: attribute
                            });
                        }
                    }
                    params.SLDBODY = sldBody;
                }
                if (minervaMetadata.hasOwnProperty('credentials')) {
                    params.minerva_credentials = minervaMetadata.credentials;
                }
                return this.geoJsLayer.baseUrl + '?' + $.param(params);
            }, this)
        );
        this.trigger('m:map_layer_renderable', this);
    }
}
export default WmsRepresentation;
