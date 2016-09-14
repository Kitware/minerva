/*
  This widget displays a styling modal for WMS layers.
*/

minerva.views.StyleWmsDatasetWidget = minerva.View.extend({

    events: {
	'submit #m-wms-multiband-style-form': function (e) {
	    e.preventDefault();
	    var params = {
		subType: this._get_geospatial_type(),
		_id: this.dataset.id,
		typeName: this.dataset.get('meta').minerva.type_name,
		redChannel: this.$('#m-red-channel').val(),
		greenChannel: this.$('#m-green-channel').val(),
		blueChannel: this.$('#m-blue-channel').val()
	    };

	    girder.restRequest({
		path: '/minerva_style_wms',
		type: 'POST',
		data: params,
		error: null
	    });
	}

    },

    initialize: function (settings) {
	this.dataset = settings.dataset;
    },

    _get_geospatial_type: function () {
	subType = this.dataset.get('meta').minerva.layer_info.subType;
	return subType
    },

    _get_bands: function () {
	bands = this.dataset.get('meta').minerva.layer_info.bands;
	return bands
    },

    _get_template: function (subType) {
	if (subType === 'multiband') {
	    var bands = this._get_bands();
	    return minerva.templates.styleMultiBandRasterWidget({
		bands: bands});
	} else {
	    return minerva.templates.styleWmsDatasetWidget({});
	}
    },

    render: function () {
	var subType = this._get_geospatial_type();
	var template = this._get_template(subType);
	var modal = this.$el.html(template).girderModal(this);
	modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
	return this;
    }
});
