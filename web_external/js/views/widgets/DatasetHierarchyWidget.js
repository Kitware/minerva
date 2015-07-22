/**
* This widget is used to diplay minerva metadata for a dataset.
*/
minerva.views.DatasetHierarchyWidget = minerva.View.extend({
    initialize: function (settings) {
        this.dataset = settings.dataset;
    },

    render: function () {
        var modal = this.$el.html(minerva
				  .templates
				  .datasetHierarchyWidget({}))
		.girderModal(this)
		.on('ready.girder.modal',
		    _.bind(function () {
			this.$('#datasetHeirarchy')
			    .text(JSON.stringify(
				this.dataset.get('meta').minerva,
				null, 4));
		    }, this));

	modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

        return this;
    }
});
