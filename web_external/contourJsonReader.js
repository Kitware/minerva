/* global File */
/**
 * Create a new instance of class contourJsonReader
 *
 * @class
 * @extends geo.fileReader
 * @returns {geo.contourJsonReader}
 */
import geo from 'geojs';
import _ from 'underscore';
window.geo = geo;

geo.contourJsonReader = function (arg) {
    'use strict';
    if (!(this instanceof geo.contourJsonReader)) {
        return new geo.contourJsonReader(arg); // eslint-disable-line new-cap
    }

    var that = this;

    geo.fileReader.call(this, arg);

    this.canRead = function (file) {
        if (file instanceof File) {
            return (file.type === 'application/json' || file.name.match(/\.json$/));
        } else if (_.isString(file)) {
            try {
                JSON.parse(file);
            } catch (e) {
                return false;
            }
            return true;
        }
        try {
            if (Array.isArray(that._featureArray(file))) {
                return true;
            }
        } catch (e) {}
        return false;
    };

    this._readObject = function (file, done, progress) {
        var object;
        function onDone(fileString) {
            if (!_.isString(fileString)) {
                done(false);
            }

            // We have two possibilities here:
            // 1) fileString is a JSON string or is
            // a URL.
            try {
                object = JSON.parse(fileString);
                done(object);
            } catch (e) {
                if (!object) {
                    $.ajax({
                        type: 'GET',
                        url: fileString,
                        dataType: 'text'
                    }).done(function (data) {
                        object = JSON.parse(data);
                        done(object);
                    }).fail(function () {
                        done(false);
                    });
                }
            }
        }

        if (file instanceof File) {
            that._getString(file, onDone, progress);
        } else if (_.isString(file)) {
            onDone(file);
        } else {
            done(file);
        }
    };

    this._getStyle = function (spec) {
        return spec.properties;
    };

    this.read = function (file, done, progress) {
        function _done(data) {
            var contour = that.layer().createFeature('contour')
                .data(data.position || data.values)
                .style({
                    opacity: 0.75
                })
                .contour({
                    gridWidth: data.gridWidth,
                    gridHeight: data.gridHeight,
                    /* The color range doesn't have to be linear:
                         rangeValues: [0, 25, 50, 75, 100, 125, 250, 500, 750, 2000],
                         */
                    /* Or, you could plot iso-contour lines using a varying opacity:
                         rangeValues: [100, 100, 200, 200, 300, 300, 400, 400, 500, 500],
                         opacityRange: [1, 0, 1, 0, 1, 0, 1, 0, 1],
                         */
                    /* You can make smooth contours instead of stepped contours:
                         stepped: false,
                         */
                    min: 0
                });
            if (data.position) {
                contour
                    .position(function (d) { return {x: d.x, y: d.y, z: d.z}; })
                    .style({
                        value: function (d) { return d.z > -9999 ? d.z : null; }
                        /* You can get better contours if you set a minimum value and set
                         * sea locations to a small negative number:
                         value: function (d) { return d.z > -9999 ? d.z : -10; }
                         */
                    });
            } else {
                contour
                    .style({
                        value: function (d) { return d > -9999 ? d : null; }
                    })
                    .contour({
                        /* The geometry can be specified using 0-point coordinates and deltas
                         * since it is a regular grid. */
                        x0: data.x0, y0: data.y0, dx: data.dx, dy: data.dy
                    });
            }

            if (done) {
                done(contour);
            }
        }

        that._readObject(file, _done, progress);
    };
};

geo.inherit(geo.contourJsonReader, geo.fileReader);

geo.registerFileReader('contourJsonReader', geo.contourJsonReader);
