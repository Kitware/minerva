/**
 * This widget displays options for rendering json datasets.
 */
minerva.views.JsonConfigWidget = minerva.View.extend({
    initialize: function (settings) {
        this.dataset = settings.dataset;
        this.jsonStyleWidget = new minerva.views.GeoJSONStyleWidget({
            parentView: this,
            dataset: this.dataset
        });
    },

    events: {
        'click .m-load-data-button': '_loadDataset',
        'submit #m-json-geo-render-form': function (e) {
            e.preventDefault();
            this.$('.g-validation-failed-message').text('');

            var overrideGeoRenderType = this.$('#m-geo-render-type option:selected').text();
            if (overrideGeoRenderType === 'geojson') {
                this.jsonStyleWidget.save();
            }
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

        this.jsonStyleWidget.setElement(modal.find('.m-geojson-style')).render();
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
