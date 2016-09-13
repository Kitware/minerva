/*
  This widget displays a styling modal for WMS layers.
*/

minerva.views.StyleWmsDatasetWidget = minerva.View.extend({

    initialize: function (settings) {
	this.dataset = settings.dataset;
	var params = {
	    typeName: this.dataset.get('meta').minerva.type_name,
	    baseURL: this.dataset.get('meta').minerva.base_url,
	    datasetId: this.dataset.get('_id')
	}
    },

    _get_geospatial_type: function (dataset) {
	subType = this.dataset.get('meta').minerva.layer_info.subType;
	return subType
    },

    _get_template: function(subType) {
	if (subType === 'multiband') {
	    return minerva.templates.styleMultiBandRasterWidget({});
	} else {
	    return minerva.templates.styleWmsDatasetWidget({});
	}
    },

    render: function () {
	var subType = this._get_geospatial_type(this.dataset);
	var template = this._get_template(subType);
	var modal = this.$el.html(template).girderModal(this);
	modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
	return this;
    }
});
