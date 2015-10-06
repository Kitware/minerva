/**
* This widget displays options to render geojson points.
*/
minerva.views.PointRenderWidget = minerva.View.extend({

    events: {
        'submit #m-point-render-form': function (e) {
            e.preventDefault();

            // TODO technical debt
            // really should be interacting with some rendering api on the geojson dataset
            var minervaMetadata = this.dataset.getMinervaMetadata();
            var renderMode = $('input:radio:checked.m-points-render-mode').attr('id');
            if (renderMode === 'm-display-points-separate') {
                minervaMetadata.geojson_file.render_type = 'point';
            } else {
                minervaMetadata.geojson_file.render_type = 'cluster';
                var colorScheme = $('input:radio:checked.m-cluster-color-scheme').attr('id');
                var colorSchemeParts = colorScheme.split('-');
                minervaMetadata.geojson_file.color_scheme = colorSchemeParts[colorSchemeParts.length - 1];
            }
            this.dataset.saveMinervaMetadata(minervaMetadata);
            this.$el.modal('hide');
        },

        'change .m-points-render-mode': function () {
            var renderMode = $('input:radio:checked.m-points-render-mode').attr('id');
            if (renderMode === 'm-display-points-separate') {
                this.$('#m-cluster-colors').hide();
            } else {
                this.$('#m-cluster-colors').show();
            }
        }
    },

    initialize: function (settings) {
        this.dataset = settings.dataset;
    },

    render: function () {
        var minervaMetadata = this.dataset.getMinervaMetadata();

        // TODO technical debt centralize color schemes
        // YlGnBu
        var colorRange = ['#a1dab4', '#41b6c4', '#2c7fb8', '#253494'];
        // YlGn
        var colorRange2 = ['#c2e699', '#78c679', '#31a354', '#006837'];
        // YlOrBr
        var colorRange3 = ['#fed98e', '#fe9929', '#d95f0e', '#993404'];
        var colorRanges = {
            '#m-colorRange-YlGnBu': colorRange,
            '#m-colorRange-YlGn': colorRange2,
            '#m-colorRange-YlOrBr': colorRange3
        };

        var cluster = true;
        var clusterColor = '#m-colorRange-YlGnBu';
        if (!minervaMetadata.geojson_file.render_type ||
            minervaMetadata.geojson_file.render_type === 'point') {
            cluster = false;
        } else {
            if (minervaMetadata.geojson_file.color_scheme) {
                clusterColor = '#m-colorRange-' + minervaMetadata.geojson_file.color_scheme;
            }
        }

        var modal = this.$el.html(minerva.templates.pointRenderWidget({
            cluster: cluster,
            clusterColor: clusterColor,
            colorRanges: colorRanges
        })).girderModal(this)
        .on('ready.girder.modal', _.bind(function () {
            if (cluster) {
                this.$('#m-cluster-colors').show();
            } else {
                this.$('#m-cluster-colors').hide();
            }
        }, this));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
        return this;
    },

    /**
     * Change the current dataset, and render.
     *
     * @param  dataset  The dataset to display rendering options for.
     */
    setCurrentDataset: function (dataset) {
        this.dataset = dataset;
        this.render();
    }

});
