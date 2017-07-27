import _ from 'underscore';
import 'bootstrap-slider';
import 'bootstrap-slider/dist/css/bootstrap-slider.css';
import 'bootstrap-select';
import 'bootstrap-select/dist/css/bootstrap-select.css';

import View from '../view';
import GeoJSONStyle from '../../models/GeoJSONStyle';
import geojsonUtil from '../../geojsonUtil';
import template from '../../templates/widgets/geoJSONStyleWidget.pug';

function _updateClampingPanel(radio) {
    var radioChecked = radio.is(':checked');
    var panel = $('#m-clamping-panel');
    var controls = panel.find('.panel-body input');
    var check = $('#m-enable-linear-scale-clamping');
    if (radioChecked) {
        if (radio.is('#m-enable-linear-scale') && check.is(':checked')) {
            panel.removeClass('panel-default')
                .addClass('panel-primary');
            controls.prop('disabled', false);
        } else {
            panel.addClass('panel-default')
                .removeClass('panel-primary');
            controls.prop('disabled', true);
        }
    }
}

function _setScaleFlags(feature, prop, val) {
    if (prop === 'linearFlag') {
        feature.set('logFlag', false);
        feature.set('quantileFlag', false);
    } else if (prop === 'logFlag') {
        feature.set('linearFlag', false);
        feature.set('quantileFlag', false);
    } else if (prop === 'quantileFlag') {
        feature.set('linearFlag', false);
        feature.set('logFlag', false);
    }
    feature.set(prop, val);
}

const GeoJSONStyleWidget = View.extend({
    events: {
        'change .m-toggle-panel': '_updatePanel',
        'click .panel-heading': '_collapsePanel',
        'change input,select': '_updateValue',
        'shown.bs.collapse .collapse': '_fixTooltips',
        'shown.bs.tab .m-style-tab': '_fixTooltips',
        'click .m-style-tab': '_activateTab',
        'change .m-color-by': 'render'
    },

    initialize: function (settings) {
        this._activeTab = 'point';
        this.load(settings.dataset);
    },
    render: function (evt) {
        var geoData = this._dataset.get('geoData') || {};
        var tabs = this._getTabs(geoData);

        // noop if there are no points, lines, or polygons
        if (this._activeTab === null) {
            this.$el.empty().text('No renderable features');
            return this;
        }

        this.$el.html(template({
            point: this._pointStyle.attributes,
            line: this._lineStyle.attributes,
            polygon: this._polygonStyle.attributes,
            tabs: tabs,
            ramps: this._pointStyle.ramps,
            summary: geoData.summary || {}
        })
        );

        this.$('.m-slider').bootstrapSlider({ enabled: false });
        this.$('.m-slider[data-slider-enabled]').bootstrapSlider('enable');
        this.$('select.m-select-ramp').selectpicker({ width: '100%' });

        // needed to fix the initial position of tooltips
        $('#g-dialog-container').one('shown.bs.modal', _.bind(this._fixTooltips, this));
        return this;
    },

    /**
     * Load user selected values from the dataset.
     */
    load: function (dataset) {
        this._dataset = dataset;
        this._pointStyle = new GeoJSONStyle();
        this._lineStyle = new GeoJSONStyle();
        this._polygonStyle = new GeoJSONStyle();
        var mm = this._dataset.getMinervaMetadata() || {};
        var vis = mm.visProperties || {};
        this._pointStyle.set(vis.point || {});
        this._lineStyle.set(vis.line || {});
        this._polygonStyle.set(vis.polygon || {});
    },

    /**
     * Save the user selected values into the geojson object.
     */
    save: function () {
        var props = {
            point: this._pointStyle.attributes,
            line: this._lineStyle.attributes,
            polygon: this._polygonStyle.attributes
        };
        var mm = this._dataset.getMinervaMetadata();
        mm.visProperties = props;
        this._dataset.saveMinervaMetadata(mm);
    },

    _fixTooltips: function () {
        this.$('.m-slider').bootstrapSlider('relayout');
    },
    _activateTab: function (evt) {
        var $el = $(evt.currentTarget);
        if ($el.parent().hasClass('disabled')) {
            evt.stopPropagation();
            return;
        }
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
    _getFeature: function (featureString) {
        switch (featureString) {
            case 'point':
                return this._pointStyle;
            case 'line':
                return this._lineStyle;
            case 'polygon':
                return this._polygonStyle;
            default:
                throw new Error('Invalid feature type in UI');
        }
    },
    _updateValue: function (evt) {
        var $el = $(evt.target);
        var prop = $el.data('property');
        var val = $el.val();
        var feature;
        switch ($el.prop('type')) {
            case 'number':
            case 'range':
                val = parseFloat(val);
                break;
            case 'checkbox':
            case 'radio':
                val = $el.is(':checked');
                break;
        }
        feature = this._getFeature($el.data('feature'));
        if (prop === 'strokeColorKey' || prop === 'fillColorKey') {
            if (val === 'Constant') {
                val = null;
            }
            feature.set(prop, val);
            this.render();
        } else if (prop === 'linearFlag' ||
            prop === 'logFlag' || prop === 'quantileFlag') {
            _setScaleFlags(feature, prop, val);
            _updateClampingPanel($el);
        } else {
            feature.set(prop, val);
        }
    },
    _getTabs: function (data) {
        var points = !!geojsonUtil.getFeatures(data, 'Point', 'MultiPoint').length;
        var lines = !!geojsonUtil.getFeatures(data, 'LineString', 'MultiLineString').length;
        var polygons = !!geojsonUtil.getFeatures(data, 'Polygon', 'MultiPolygon').length;
        var tabs = {};

        if (!points && !lines && !polygons) {
            this._activeTab = null;
        }

        if (this._activeTab === 'point' && !points) {
            this._activeTab = 'line';
        }
        if (this._activeTab === 'line' && !lines) {
            this._activeTab = 'polygon';
        }

        tabs.point = {
            enabled: points,
            active: this._activeTab === 'point'
        };
        tabs.line = {
            enabled: lines,
            active: this._activeTab === 'line'
        };
        tabs.polygon = {
            enabled: polygons,
            active: this._activeTab === 'polygon'
        };
        return tabs;
    }
});
export default GeoJSONStyleWidget;
