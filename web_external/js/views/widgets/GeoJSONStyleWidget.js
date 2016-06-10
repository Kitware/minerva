(function () {

    var radius = {};
    var stroke = {
        enabled: true,
        width: 2,
        color: null,
        opacity: 1
    };
    var fill = {
        enabled: true,
        color: null,
        opacity: 1
    };

    minerva.models.GeoJSONStyle = Backbone.Model.extend({
        defaults: {
            radius: 8,
            stroke: true,
            strokeWidth: 2,
            strokeColor: '#000000',
            strokeOpacity: 1,
            fill: true,
            fillOpacity: 0.75,
            fillColor: '#ff0000'
        }
    });
})();

minerva.views.GeoJSONStyleWidget = minerva.View.extend({
    events: {
        'change .m-toggle-panel': '_updatePanel',
        'click .panel-heading': '_collapsePanel',
        'change input,select': '_updateValue',
        'shown.bs.collapse .collapse': '_fixTooltips'
    },

    initialize: function () {
        this._pointStyle = new minerva.models.GeoJSONStyle();

    },
    render: function (evt) {
        this.$el.html(
            minerva.templates.geoJSONPointStyleWidget(this._pointStyle.attributes)
        );

        this.$('.m-slider').bootstrapSlider({enabled: false});
        this.$('.m-slider[data-slider-enabled]').bootstrapSlider('enable');

        // needed to fix the initial position of tooltips
        $('#g-dialog-container').one('shown.bs.modal', _.bind(this._fixTooltips, this));
        return this;
    },
    _fixTooltips: function () {
        this.$('.m-slider').bootstrapSlider('relayout');
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
