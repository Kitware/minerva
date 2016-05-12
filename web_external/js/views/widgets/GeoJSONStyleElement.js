minerva.models.GeoJSONProperty = Backbone.Model.extend({
    defaults: {
        key: null,
        values: {},
        min: null,
        max: null
    }
});

/* GeoJSON property accumulation object:
 *
 *  {
 *    <key>: {
 *      // for numeric values:
 *      min: <minimum>,
 *      max: <maximum>,
 *
 *      // for other value types:
 *      values: {
 *        <value>: <count>
 *      }
 *    }
 *  }
 *
 */

minerva.models.GeoJSONStyle = Backbone.Model.extend({
    defaults: {
        // how is the style generated
        scale: 'constant',   // 'constant' | 'continuous' | 'categorical'

        // what type is the range
        type: 'number',     // 'number' | 'color'

        // for color values, what color color ramp is selected
        ramp: 'Reds',

        // which style attribute does it represent
        name: null,         // 'fillColor' | 'fillOpacity' | etc...

        // which property key is the scale applied to
        key: null,

        // the geojson summary object
        summary: {},

        // for continuous scales
        domain: [],         // numeric extent of the domain
        range: [],          // numeric or color extent of the range

        // for categorical scales
        values: {},         // value -> (number | color) mapping

        // for constant scales and default value
        value: null
    },

    /**
     * Custom set method that ignore undefined values.
     */
    set: function (hash, options) {
        var key, value, filtered = {};

        // handle set(key, value) calling
        if (_.isString(hash)) {
            key = hash;
            value = options;
            options = arguments[2];
            hash = {};
            hash[key] = value;
        }

        // remove keys with undefined values
        _.each(hash, function (value, key) {
            if (value !== undefined) {
                filtered[key] = value;
            }
        });

        // call super method
        return Backbone.Model.prototype.set.call(this, filtered, options);
    },

    /**
     * Return a d3 scale object that performs the style mapping indicated
     * by this model's attributes.
     */
    scale: function () {
        var scale, value, pairs;

        switch (this.get('type')) {
            case 'constant':
                value = this.get('value');
                scale = function () { return value; };
                break;

            case 'continuous':
                scale = d3.scale.linear()
                    .domain(this.get('domain'))
                    .range(this.get('range'));
                break;

            case 'categorical':
                pairs = _.pairs(this.get('values'));
                scale = d3.scale.ordinal()
                    .domain(pairs.map(_.first))
                    .range(pairs.map(_.last));
                break;

            default:
                throw new Error('Invalid style type');
        }
        return scale;
    },

    scales: ['constant', 'continuous', 'categorical'],
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

minerva.collections.GeoJSONStyle = Backbone.Collection.extend({
    model: minerva.models.GeoJSONStyle
});

minerva.views.GeoJSONStyleElement = minerva.View.extend({
    events: {
        'change input,select': 'read'
    },
    initialize: function () {
        this.listenTo(this.model, 'change', this.render);
        this.listenTo(this.model, 'destroy', this.remove);
    },
    render: function (evt) {

        // when responding to an input element change event, don't re-render
        if (evt && evt.norender) {
            return;
        }

        this.$el.html(minerva.templates.geoJSONStyleElement({
            style: this.model.attributes,
            ramps: this.model.ramps,
            scales: this.model.scales
        }));

        // initialize bootstrap select elements
        this.$el.find('select.m-select-ramp').selectpicker({width: '100%'});
        return this;
    },

    remove: function () {
        this.$('select.m-select-ramp').selectpicker('destroy');
        this.$el.empty();
        return this;
    },

    /**
     * Read the value of the DOM element and set the model.
     */
    read: function () {
        var $el = this.$el;
        var attrs = {
            scale: $el.find('.m-scale-type').val(),
            key: $el.find('.m-scale-by').val(),
            value: $el.find('.m-constant-value').val(),
            range: [$el.find('.m-scale-min').val(), $el.find('.m-scale-max').val()],
            ramp: $el.find('select.m-select-ramp').val()
        };

        this.model.set(attrs, {norender: true});
        return this;
    }
});
