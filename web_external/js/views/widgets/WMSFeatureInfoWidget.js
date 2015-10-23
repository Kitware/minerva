minerva.views.WmsFeatureInfoWidget = minerva.View.extend({

    callInfo: function (layer_idx, coords) {
        if (this.layers.length > 0) {
            var url = this.getUrl(layer_idx, coords);
            var panel = this;
            $.ajax({
                url: url,
                jsonp: false,
                async: false,
                jsonpCallback: 'getLayerFeatures',
                error: function (a, b, c) {
                    console.log(c);
                }
            }).done(function (data) {
                panel.content += data;

                if (layer_idx < panel.layers.length - 1) {
                    panel.callInfo(layer_idx + 1, coords);
                } else if (panel.content !== '') {
                    $('#wms_info_dialog').html(panel.content);
                    $('#wms_info_dialog').dialog('open');
                }
            });
        }
    },

    initialize: function (settings) {
        this.modal = {};
        this.map = settings.map;
        this.version = settings.version;
        this.layers = settings.layers;
        this.callback = settings.callback;
        this.el = $('.mapPanel');
        this.content = '';
        this.fixedParams = 'REQUEST=GetFeatureInfo&' +
            'EXCEPTIONS=application%2Fvnd.ogc.se_xml&' +
            'SERVICE=WMS&FEATURE_COUNT=50&styles=&' +
            'srs=EPSG:3857&INFO_FORMAT=text/html&format=image%2Fpng';
    },

    getUrl: function (layer_idx, coord) {

        var pnt = this.map.gcsToDisplay(coord);
        var mapBounds = this.map.bounds();

        var ne = mapBounds.upperRight;
        var sw = mapBounds.lowerLeft;

        var neMerc = geo.mercator.ll2m(ne.x, ne.y);
        var swMerc = geo.mercator.ll2m(sw.x, sw.y);
        if (swMerc.x > neMerc.x) {
            neMerc.x = 20037508.34 + (20037508.34 - neMerc.x);
        }
        var bbox = swMerc.x + ',' + swMerc.y + ',' + neMerc.x + ',' + neMerc.y;

        var rUrl = this.layers[layer_idx].baseUrl + '?' + this.fixedParams;
        rUrl += '&version=' + this.version;
        rUrl += '&query_layers=' + this.layers[layer_idx].layerName +
            '&layers=' + this.layers[layer_idx].layerName;
        rUrl += '&bbox=' + bbox;

        rUrl += '&width=' + this.map.node().width() +
            '&height=' + this.map.node().height();

        rUrl += '&x=' + Math.round(pnt.x) + '&y=' + Math.round(pnt.y);
        rUrl += '&format_options=callback:' + this.callback;
        return rUrl;
    },

    render: function () {
        this.$el.append(minerva.templates.wmsFeatureInfoWidget());
    }
});
