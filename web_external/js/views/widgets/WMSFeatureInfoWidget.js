minerva.views.WmsFeatureInfoWidget = minerva.View.extend({

    callInfo: function (event) {
        // Query layers with given coordinates
        var displayedDatasets = _.chain(this.parentView.collection.models)
            .filter(function (set) { return set.get('displayed'); })
            .map(function (dataset) { return dataset.get('_id'); })
            .value();

        var coord = event.geo;
        var pnt = this.map.gcsToDisplay(coord);

        // Spherical Mercator projection.
        var mapBounds = this.map.bounds(undefined, 'EPSG:3857');

        if (mapBounds.left > mapBounds.right) {
            // 20037508.34 is the maximum extent of the Spherical Mercator projection.
            mapBounds.right = 20037508.34 + (20037508.34 - mapBounds.right);
        }
        var bbox = mapBounds.left + ',' + mapBounds.bottom + ',' + mapBounds.right + ',' + mapBounds.top;
        var width = this.map.node().width();
        var height = this.map.node().height();
        var x = Math.round(pnt.x);
        var y = Math.round(pnt.y);

        var panel = this;

        if (displayedDatasets.length > 0) {
            girder.restRequest({
                path: '/minerva_get_feature_info',
                type: 'GET',
                data: {
                    'activeLayers': displayedDatasets,
                    'bbox': bbox,
                    'x': x,
                    'y': y,
                    'width': width,
                    'height': height}
            }).done(function (data) {
                var layer_div = document.createElement('div');
                layer_div.className = 'accordion';
                var tbl_div = document.createElement('div');
                var tbl_body = document.createElement('table');
                var odd_even = false;
                var header = false;
                var obj = JSON.parse(data);
                $.each(obj.features, function () {
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
                $('#m-wms-info-dialog').html(panel.content);
                $('#m-wms-info-dialog').dialog('open');
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

    render: function () {
        this.$el.append(minerva.templates.wmsFeatureInfoWidget());
    }
});
