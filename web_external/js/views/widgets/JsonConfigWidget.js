/**
 * This widget displays options for rendering json datasets.
 */
minerva.views.JsonConfigWidget = minerva.View.extend({
    initialize: function (settings) {
        var summary = this.summary = {};

        this.dataset = settings.dataset;
        this.pointStyleWidget = new minerva.views.GeoJSONStyleWidget({
            parentView: this
        });
    },

    events: {
        'click .m-load-data-button': '_loadDataset',
        'submit #m-json-geo-render-form': function (e) {
            e.preventDefault();
            this.$('.g-validation-failed-message').text('');

            var overrideGeoRenderType = this.$('#m-geo-render-type option:selected').text();
            this.dataset._initGeoRender(overrideGeoRenderType);
            this.$el.modal('hide');
        },
        'change #m-geo-render-type': function () {
            if (this.$('#m-geo-render-type').val() === 'geojson') {
                this.$('.m-geojson-style').removeClass('hidden');
            } else {
                this.$('.m-geojson-style').addClass('hidden');
            }
        }
    },

    render: function () {
        window.dataset = this.dataset;
        var geoData = this.dataset.get('geoData');
        if (geoData) {
            _.extend(this.summary, geoData.summary || {});
        }
        var currentGeoRenderType = this.dataset.getGeoRenderType();
        var options = ['geojson', 'contour'];
        if (currentGeoRenderType === null || !_.contains(options, currentGeoRenderType)) {
            currentGeoRenderType = options[0];
        } else {
            currentGeoRenderType = currentGeoRenderType;
        }
        var modal = this.$el.html(minerva.templates.jsonConfigWidget({
            values: options,
            currentGeoRenderType: currentGeoRenderType
        })).girderModal(this);

        this.pointStyleWidget.setElement(modal.find('.m-geojson-style')).render();
        modal.trigger($.Event('reader.girder.modal', {relatedTarget: modal}));
    },

    setCurrentDataset: function (dataset) {
        this.dataset = dataset;
        this.render();
    },

    _loadDataset: function (evt) {
        evt.preventDefault();
        this.dataset
            .once('m:dataset_geo_dataLoaded', this.render, this)
            .loadGeoData()
    }
});
