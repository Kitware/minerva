minerva.models.WmsDatasetModel = minerva.models.DatasetModel.extend({

    isRenderable: function () {
        return true;
    },

    createWmsDataset: function (params) {
        girder.restRequest({
            path: '/minerva_dataset_wms',
            type: 'POST',
            data: params,
            error: null // ignore default error behavior (validation may fail)
        }).done(_.bind(function (resp) {
            this.set(resp);
            this.trigger('m:wmsDatasetAdded');
        }, this)).error(_.bind(function (err) {
            this.trigger('m:error', err);
        }, this));

        return this;
    },

    specifyTileLayer: function (mapLayer) {
        var minervaMetadata = this.getMinervaMetadata();
        var baseUrl = minervaMetadata.base_url;
        // WMS returns lists of layers prefixed with 'geonode:'.
        var wmsPrefix = 'geonode:';
        var wmsParams = JSON.parse(minervaMetadata.wms_params);
        var layer = wmsParams.typeName.slice(wmsPrefix.length);
        // TODO: inclued projection in params ??
        var projection = 'EPSG:3857';
        mapLayer.gcs(projection);
        mapLayer.tileUrl(
            function (zoom, x, y) {
                var xLowerLeft = geo.mercator.tilex2long(x, zoom);
                var yLowerLeft = geo.mercator.tiley2lat(y + 1, zoom);
                var xUpperRight = geo.mercator.tilex2long(x + 1, zoom);
                var yUpperRight = geo.mercator.tiley2lat(y, zoom);

                var sw = geo.mercator.ll2m(xLowerLeft, yLowerLeft, true);
                var ne = geo.mercator.ll2m(xUpperRight, yUpperRight, true);
                var bbox_mercator = sw.x + ',' + sw.y + ',' + ne.x + ',' + ne.y;
                var params = {
                    SERVICE: 'WMS',
                    VERSION: '1.3.0',
                    REQUEST: 'GetMap',
                    LAYERS: layer,
                    STYLES: '',
                    BBOX: bbox_mercator,
                    WIDTH: 256,
                    HEIGHT: 256,
                    FORMAT: 'image/png',
                    TRANSPARENT: true,
                    SRS: projection,
                    TILED: true
                };
                return baseUrl + '?' + $.param(params);
            }
        );
    },

    getLegend: function () {
        return 'data:image/png;base64,' + this.getMinervaMetadata().legend;
    }

});
