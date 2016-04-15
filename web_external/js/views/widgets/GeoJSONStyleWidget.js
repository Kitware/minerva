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

        // which style attribute does it represent
        name: null,         // 'fillColor' | 'fillOpacity' | etc...

        // which property key is the scale applied to
        key: null,

        // for continuous scales
        domain: [],         // numeric extent of the domain
        range: [],          // numeric or color extent of the range

        // for categorical scales
        values: {},         // value -> (number | color) mapping

        // for constant scales and default value
        value: null
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
    }
});

minerva.views.GeoJSONStyleWidget = minerva.View.extend({
    initialize: function () {
        this._ramps = {};

        _.each(colorbrewer, _.bind(function (ramp, name) {
            var n = "<ul class='m-color-ramp'>";
            _.each(ramp[6], function (color, i) {
                n += "<li style='background-color: " + color + "'/>";
            });
            n += '</ul>';
            this._ramps[name] = {
                value: ramp[6],
                display: n
            };
        }, this));
        console.log(this._ramps);
    },
    render: function () {
        var styles = [{
            name: 'radius',
            type: 'number',
            value: 5,
            scale: 'constant'
        }, {
            name: 'strokeWidth',
            type: 'number',
            value: 0,
            scale: 'continuous',
            key: 'count'
        }, {
            name: 'strokeColor',
            type: 'color',
            scale: 'continuous',
            key: 'count'
        }, {
            name: 'fillColor',
            type: 'color',
            value: '#ff0000',
            scale: 'constant'
        }];
        var props = {
            county: {
                values: {
                    'a': 2,
                    'b': 1
                }
            },
            count: {
                min: 0,
                max: 75
            }
        };
        var modal = this.$el.html(minerva.templates.geoJSONStyleWidget({
            styles: styles,
            properties: props,
            ramps: this._ramps
        })).girderModal(this).trigger(
            $.Event('ready.girder.modal', {relatedTarget: modal})
        ).find('select').selectpicker({width: '100%'});
    }
});
