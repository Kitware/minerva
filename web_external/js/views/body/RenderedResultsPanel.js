minerva.views.RenderedResultsPanel = minerva.View.extend({
    initialize: function (options) {
        minerva.events.on('m:terra-data-rendered', _.bind(this.render, this));
    },

    render: function () {
        if (_.has(minerva_map, 'data') &&
            _.has(minerva_map.data, 'features')) {
            var numDataPoints = _.size(minerva_map.data.features),
                // @todo Wasteful way of counting
                numLocs = _.size(_.countBy(minerva_map.data.features, function(o) {
                    return o.properties.latitude + o.properties.longitude;
                }));
        } else {
            var numDataPoints = 0,
                numLocs = 0;
        }

        this.$el.html(minerva.templates.renderedResultsPanel({
            numDataPoints: numDataPoints,
            numLocs: numLocs
        }));
        this.$el.show();
    }
});
