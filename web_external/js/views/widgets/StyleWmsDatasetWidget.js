/*
  This widget displays a styling modal for WMS layers.
*/

minerva.views.StyleWmsDatasetWidget = minerva.View.extend({

    _get_style: function (params) {
	girder.restRequest({
	    path: '/minerva_wms_style',
	    type: 'POST',
	    data: params,
	    error: null
	}).done(_.bind(function (resp) {
	    this.dataset.set({'wmsStyle': resp});
	}, this)).error(_.bind(function (err) {
	    this.trigger('m:error', err);
	}, this));
	return this;
    },

    initialize: function (settings) {
	this.dataset = settings.dataset;
	var params = {
	    layerName: this.dataset.get('meta').minerva.type_name,
	    baseURL: this.dataset.get('meta').minerva.base_url,
	    datasetId: this.dataset.get('_id')
	}
	this._get_style(params);
    },

    render: function () {
	var modal = this.$el.html(minerva.templates.styleWmsDatasetWidget({})).girderModal(this);
	modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
	return this;
    }
});
