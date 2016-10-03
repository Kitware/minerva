/**
* This widget is used to diplay minerva metadata for a dataset.
*/
minerva.views.DatasetInfoWidget = minerva.View.extend({
    initialize: function (settings) {
        this.dataset = settings.dataset;
    },

    render: function () {
        var modal = this.$el.html(minerva
                                  .templates
                                  .datasetInfoWidget({}))
		.girderModal(this)
		.on('ready.girder.modal',
                    _.bind(function () {
                        this.$('#datasetInfo')
                            .text(JSON.stringify(
                                this.dataset.get('meta').minerva,
                                null, 4));
                    }, this));

        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

        return this;
    }
});
