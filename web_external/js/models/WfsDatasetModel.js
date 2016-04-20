minerva.models.WfsDatasetModel = minerva.models.DatasetModel.extend({

    isRenderable: function () { // eslint-disable-line underscore/prefer-constant
        return true;
    },

    createWfsDataset: function (params) {
        girder.restRequest({
            path: '/minerva_dataset_wfs',
            type: 'POST',
            data: params,
            error: null // ignore default error behavior (validation may fail)
        }).done(_.bind(function (resp) {
            this.set(resp);
            this.trigger('m:wfsDatasetAdded');
        }, this)).error(_.bind(function (err) {
            this.trigger('m:error', err);
        }, this));

        return this;
    },

    /*
     * Async function that loads any data needed by this dataset to render in GeoJs,
     * setting that data as an attribute on this dataset named 'geoData'.
     *
     * @fires 'm:dataset_geo_dataLoaded' event upon the geo data being loaded.
     */
    loadGeoData: function () {
        if (this.get('geoData') !== null) {
            this.trigger('m:dataset_geo_dataLoaded', this);
        } else {
            // Get the Auth Header from the Minerva Server.
            girder.restRequest({
                path: '/minerva_dataset_wfs/bsve_auth',
                type: 'GET',
                error: null // ignore default error behavior (validation may fail)
            }).done(_.bind(function (auth) {
                var mm = this.metadata();
                //var url = mm.base_url + 'api/data/v2/sources/wfs/data?$filter=name+eq+' + mm.type_name + '&$format=json';
                var url = mm.base_url + 'api/data/v2/sources/wfs/data?$filter=name+eq+' + mm.type_name.split(':')[1] + '.1&$format=json';
                $.ajax({
                    url: url,
                    contentType: 'application/json',
                    // Set this to text to prevent json parsing.
                    dataType: 'text',
                    beforeSend: function (xhr) { xhr.setRequestHeader('harbinger-authentication', auth['harbinger-authentication']); },
                    success: _.bind(function (data) {
                        data = JSON.parse(data);
                        this.set('geoData', data.result);
                        this.trigger('m:dataset_geo_dataLoaded', this);
                    }, this),
                    error: function (a, b, c) {
                        console.error(b);
                        console.error(c);
                    }
                });
            }, this)).error(_.bind(function (err) {
                this.trigger('m:error', err);
            }, this));
        }
    }
});
