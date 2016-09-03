/*
  This widget displays a styling modal for WMS layers.
*/

minerva.views.StyleWmsDatasetWidget = minerva.View.extend({

    render: function () {
	var modal = this.$el.html(minerva.templates.styleWmsDatasetWidget({})).girderModal(this);
	modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
	return this;
    }
});
