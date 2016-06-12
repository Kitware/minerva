(function () {

    minerva.models.GeoJSONStyle = Backbone.Model.extend({
        defaults: {
            radius: 8,
            stroke: true,
            strokeWidth: 2,
            strokeColor: '#000000',
            strokeOpacity: 1,
            fill: true,
            fillOpacity: 0.75,
            fillColor: '#ff0000',
            strokeColorKey: null,
            fillColorKey: null
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
        }, {}))[0]
    });
})();

minerva.views.GeoJSONStyleWidget = minerva.View.extend({
    events: {
        'change .m-toggle-panel': '_updatePanel',
        'click .panel-heading': '_collapsePanel',
        'change input,select': '_updateValue',
        'shown.bs.collapse .collapse': '_fixTooltips',
        'shown.bs.tab .m-style-tab': '_fixTooltips',
        'click .m-style-tab': '_activateTab'
    },

    initialize: function () {
        this._pointStyle = new minerva.models.GeoJSONStyle();
        this._lineStyle = new minerva.models.GeoJSONStyle();
        this._polygonStyle = new minerva.models.GeoJSONStyle();
        this._activeTab = 'point'

    },
    render: function (evt) {
        this.$el.html(
            minerva.templates.geoJSONStyleWidget({
                point: this._pointStyle.attributes,
                line: this._lineStyle.attributes,
                polygon: this._polygonStyle.attributes,
                activeTab: this._activeTab,
                ramps: this._pointStyle.ramps,
                summary: {}
            })
        );

        this.$('.m-slider').bootstrapSlider({enabled: false});
        this.$('.m-slider[data-slider-enabled]').bootstrapSlider('enable');
        this.$('select.m-select-ramp').selectpicker({width: '100%'});

        // needed to fix the initial position of tooltips
        $('#g-dialog-container').one('shown.bs.modal', _.bind(this._fixTooltips, this));
        return this;
    },
    _fixTooltips: function () {
        this.$('.m-slider').bootstrapSlider('relayout');
    },
    _activateTab: function (evt) {
        var $el = $(evt.currentTarget);
        this.$($el.data('target')).tab('show');
        this._activeTab = $el.data('tab');
    },
    _updatePanel: function (evt) {
        var $el = $(evt.currentTarget);
        var val = $el.is(':checked');
        var panel = $el.closest('.panel');
        var controls = $el.closest('.panel').find('.panel-body input,select');
        var sliders = $el.closest('.panel').find('.panel-body .m-slider');
        if (val) {
            panel.removeClass('panel-default')
                .addClass('panel-primary');
            controls.prop('disabled', false);
            sliders.bootstrapSlider('enable');
        } else {
            panel.addClass('panel-default')
                .removeClass('panel-primary');
            controls.prop('disabled', true);
            sliders.bootstrapSlider('disable');
        }
    },
    _collapsePanel: function (evt) {
        evt.stopPropagation();
        var $el = $(evt.target);
        var target = $el.data('target');
        if (!$el.is('.m-toggle-panel')) {
            this.$(target).collapse('toggle');
        }
    },
    _updateValue: function (evt) {
        var $el = $(evt.target);
        var prop = $el.data('property');
        var val = $el.val();
        switch($el.prop('type')) {
            case 'number':
            case 'range':
                val = parseFloat(val);
                break;
            case 'checkbox':
                val = $el.is(':checked');
                break;
        }
        this._pointStyle.set(prop, val);
    }
});
