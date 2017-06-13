import Backbone from 'backbone';
import colorbrewer from 'colorbrewer';

export default Backbone.Model.extend({
    defaults: {
        cluster: false,
        clusterDistance: 0.25,
        clusterFillColor: '#000000',
        clusterStrokeColor: '#000000',
        clusterRadius: 15,
        radius: 8,
        stroke: true,
        strokeWidth: 2,
        strokeColor: '#000000',
        strokeOpacity: 1,
        fill: true,
        fillOpacity: 0.75,
        fillColor: '#ff0000',
        strokeRamp: 'Blues',
        strokeColorKey: null,
        fillRamp: 'Reds',
        fillColorKey: null,
        logFlag: false,
        linearFlag: true,
        clampingFlag: false,
        quantileFlag: false,
        minClamp: 0,
        maxClamp: 100000
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