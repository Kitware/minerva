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
	},
	'submit #m-wms-singleband-style-form': function (e) {
	    e.preventDefault();
	    var params = {
		subType: this._get_geospatial_type(),
		_id: this.dataset.id,
		typeName: this.dataset.get('meta').minerva.type_name,
		min: this.$('#m-min-value').val(),
		max: this.$('#m-max-value').val(),
		ramp: this.ramps[this.$('#m-color-ramp').val()].value,
		ramp_name: this.$('#m-color-ramp').val()
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

    ramps: _.map(colorbrewer, _.bind(function (ramp, name) {
            var n = "<ul class='m-color-ramp'>";
            _.each(ramp[6], function (color, i) {
                n += "<li style='background-color: " + color + "'/>";
            });
            n += '</ul>';
            this[name] = {
                value: ramp[6],
                display: n
            };
            return this;
    }, {}))[0],

    _get_template: function (subType) {
	var subType = this._get_geospatial_type();
	if (subType === 'multiband') {
	    var bands = this._get_bands();
	    return minerva.templates.styleMultiBandRasterWidget({
		bands: bands});
	} else if (subType === 'singleband') {
	    var band = this._get_bands();
	    var name = _.keys(band)[0];
	    var minimum = band[name].properties.min
	    var maximum = band[name].properties.max
	    return minerva.templates.styleSingleBandRasterWidget({
		name: name,
		min: minimum,
		max: maximum,
		ramps: this.ramps
	    });
	}else {
	    return minerva.templates.styleWmsDatasetWidget({});
	}
    },

    render: function () {
	var subType = this._get_geospatial_type();
	var template = this._get_template(subType);
	var modal = this.$el.html(template).girderModal(this);
	this.$('select.m-select-ramp').selectpicker({width: '100%'});

	// Make the forms remember
	if (this.dataset.get('meta').minerva.sld_params) {
	    if (subType === 'multiband') {
		var sldMeta = this.dataset.get('meta').minerva.sld_params;
		this.$('#m-red-channel').val(sldMeta.redChannel)
		this.$('#m-green-channel').val(sldMeta.greenChannel)
		this.$('#m-blue-channel').val(sldMeta.blueChannel)
	    } else if (subType === 'singleband') {
		var sldMeta = this.dataset.get('meta').minerva.sld_params;
		this.$('#m-min-value').val(sldMeta.min);
		this.$('#m-max-value').val(sldMeta.max);
		this.$('#m-color-ramp').val(sldMeta.ramp_name);
	    }
	}
	modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
	return this;
    }
});
