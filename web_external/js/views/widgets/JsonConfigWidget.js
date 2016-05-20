/**
 * This widget displays options for rendering json datasets.
 */
minerva.views.JsonConfigWidget = minerva.View.extend({
    initialize: function (settings) {
        var summary = this.summary = {};
        var pointStyle = new minerva.collections.GeoJSONStyle([
            {
                name: 'radius',
                type: 'number',
                value: 8,
                scale: 'constant',
                summary: summary
            }, {
                name: 'strokeWidth',
                type: 'number',
                value: 1,
                scale: 'constant',
                summary: summary
            }, {
                name: 'strokeColor',
                type: 'color',
                value: '#000000',
                scale: 'constant'
            }, {
                name: 'strokeOpacity',
                type: 'number',
                value: 1,
                scale: 'constant'
            }, {
                name: 'fillColor',
                type: 'color',
                value: '#ff0000',
                scale: 'constant'
            }, {
                name: 'fillOpacity',
                type: 'number',
                value: 0.75,
                scale: 'constant'
            }
        ]);

        this.dataset = settings.dataset;
        this.pointStyleWidget = new minerva.views.GeoJSONStyleWidget({
            collection: pointStyle,
            parentView: this
        });
    },

    events: {
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
    }
});
