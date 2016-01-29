minerva.views.WmsFeatureInfoWidget = minerva.View.extend({

    callInfo: function (layer_idx, coords) {
        if (this.layers.length > 0) {
            var url = this.getUrl(layer_idx, coords);
            var layer_name = this.layers[layer_idx].layerName;
            var panel = this;
            $.ajax({
                url: url,
                jsonp: false,
                async: true
            }).done(function (data) {
                if ('features' in data && data.features.length > 0) {
                    var layer_div = document.createElement('div');
                    layer_div.className = 'accordion';
                    var layer_header = document.createElement('h3');
                    layer_header.innerHTML = layer_name;
                    layer_div.appendChild(layer_header);
                    var tbl_div = document.createElement('div');
                    var tbl_body = document.createElement('table');
                    var odd_even = false;
                    var header = false;
                    $.each(data.features, function () {
                        var tbl_row;
                        if (!header) {
                            tbl_row = tbl_body.insertRow();
                            tbl_row.className = 'header';
                            $.each(this.properties, function (k) {
                                var cell = tbl_row.insertCell();
                                cell.appendChild(document.createTextNode(k ? k.toString() : ''));
                            });
                            header = true;
                        }
                        tbl_row = tbl_body.insertRow();
                        tbl_row.className = odd_even ? 'odd' : 'even';
                        $.each(this.properties, function (k, v) {
                            var cell = tbl_row.insertCell();
                            cell.appendChild(document.createTextNode(v ? v.toString() : ''));
                        });
                        odd_even = !odd_even;
                    });
                    tbl_div.appendChild(tbl_body);
                    layer_div.appendChild(tbl_div);
                    panel.content = panel.content + layer_div.outerHTML;
                }
                if (layer_idx < panel.layers.length - 1) {
                    panel.callInfo(layer_idx + 1, coords);
                } else if (panel.content !== '') {
                    $('#m-wms-info-dialog').html(panel.content);
                    $('#m-wms-info-dialog').dialog('open');
                    $('.accordion').accordion({collapsible: true});
                } else {
                    $('#m-wms-info-dialog').dialog('close');
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
        this.el = $('#m-map-panel');
        this.content = '';
        this.fixedParams = 'REQUEST=GetFeatureInfo&' +
            'EXCEPTIONS=application%2Fvnd.ogc.se_xml&' +
            'SERVICE=WMS&FEATURE_COUNT=50&styles=&' +
            'srs=EPSG:3857&INFO_FORMAT=application/json&format=image%2Fpng';
    },

    getUrl: function (layer_idx, coord) {
        var pnt = this.map.gcsToDisplay(coord);
        // Spherical Mercator projection.
        var mapBounds = this.map.bounds(undefined, 'EPSG:3857');

        if (mapBounds.left > mapBounds.right) {
            // 20037508.34 is the maximum extent of the Spherical Mercator projection.
            mapBounds.right = 20037508.34 + (20037508.34 - mapBounds.right);
        }
        var bbox = mapBounds.left + ',' + mapBounds.bottom + ',' + mapBounds.right + ',' + mapBounds.top;

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
