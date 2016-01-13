/**
 * This widget displays options for rendering choropleth layers
 */
minerva.views.ChoroplethRenderWidget = minerva.View.extend({
    initialize: function (settings) {
        this.dataset = settings.dataset;
    },

    events: {
        'submit #m-choropleth-render-form': function (e) {
            e.preventDefault();
            this.$('.g-validation-failed-message').text('');

            var minervaMetadata = this.dataset.getMinervaMetadata();
            minervaMetadata.colorByValue = $('#m-choropleth-value-source option:selected').text();
            this.dataset.saveMinervaMetadata(minervaMetadata);
            this.$el.modal('hide');
        }
    },

    render: function () {
        var minervaMetadata = this.dataset.getMinervaMetadata();
        var modal = this.$el.html(minerva.templates.choroplethRenderWidget({
            values: minervaMetadata.values
        })).girderModal(this);
        modal.trigger($.Event('reader.girder.modal', {relatedTarget: modal}));
    },

    setCurrentDataset: function (dataset) {
        this.dataset = dataset;
        this.render();
    }
});
