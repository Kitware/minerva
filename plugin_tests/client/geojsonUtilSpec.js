girderTest.importPlugin('jobs');
girderTest.importPlugin('gravatar');
girderTest.importPlugin('database_assetstore');
girderTest.importPlugin('large_image');
girderTest.importPlugin('minerva');

girderTest.addCoveredScripts([
    '/clients/web/static/built/plugins/minerva/minerva.min.js'
]);

describe('geojson', function () {
    var merge, accumulate, normalize, style;
    beforeEach(function () {
        merge = minerva.geojsonUtil.merge;
        accumulate = minerva.geojsonUtil.accumulate;
        normalize = minerva.geojsonUtil.normalize;
        style = minerva.geojsonUtil.style;
    });
    describe('merge', function () {
        it('string type', function () {
            var accum = merge('value1');

            accum = merge('value2', accum);
            accum = merge('value1', accum);

            expect(accum.values.value1).toBe(2);
            expect(accum.values.value2).toBe(1);
        });

        it('number type', function () {
            var accum = merge(10);
            accum = merge(11, accum);
            accum = merge(-10, accum);
            accum = merge(undefined, accum);
            accum = merge(Number.POSITIVE_INFINITY, accum);
            accum = merge(NaN, accum);

            expect(accum).toEqual({
                count: 6,
                nFinite: 3,
                min: -10,
                max: 11,
                sum: 11,
                sumsq: 321
            });
        });
    });

    it('accumulate', function () {
        var accum = accumulate([
            {
                a: 4,
                b: 'red',
                c: 'bird'
            },
            {
                a: 0,
                b: 'blue',
                c: 'bird'
            },
            {
                a: 10,
                b: 'green',
                c: 'cat'
            },
            {
            }
        ]);

        expect(accum).toEqual({
            a: {
                count: 3,
                nFinite: 3,
                min: 0,
                max: 10,
                sum: 14,
                sumsq: 116
            },
            b: {
                count: 3,
                values: {
                    red: 1,
                    green: 1,
                    blue: 1
                }
            },
            c: {
                count: 3,
                values: {
                    bird: 2,
                    cat: 1
                }
            }
        });
    });

    describe('normalize', function () {
        it('parse string', function () {
            expect(
                minerva.geojsonUtil.normalize(
                    '{"type":"FeatureCollection", "features":[]}'
                )
            ).toEqual({ type: 'FeatureCollection', features: [], summary: {} });
        });

        it('FeatureCollection', function () {
            var spec = {
                type: 'FeatureCollection',
                features: [
                    {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [0, 0]
                        },
                        properties: {
                            a: 1,
                            b: 'red'
                        }
                    }, {
                        type: 'Feature',
                        geometry: {
                            type: 'MultiPoint',
                            coordinates: [[1, 1], [2, 2]]
                        },
                        properties: {
                            a: -1,
                            b: 'red'
                        }
                    }, {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [3, 3]
                        },
                        properties: {
                            c: 0
                        }
                    }
                ]
            };
            var normalized = normalize(spec);

            expect(normalized).toBe(spec);

            var summary = normalized.summary;

            expect(summary.a.count).toBe(2);
            expect(summary.a.nFinite).toBe(2);
            expect(summary.a.min).toBe(-1);
            expect(summary.a.max).toBe(1);

            expect(summary.b.values).toEqual({
                'red': 2
            });

            expect(summary.c.count).toBe(1);
        });

        it('Feature', function () {
            var spec = {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [0, 0]
                },
                properties: { a: 'red' }
            };

            expect(normalize(spec)).toEqual({
                type: 'FeatureCollection',
                features: [spec],
                summary: {
                    a: {
                        count: 1,
                        values: { red: 1 }
                    }
                }
            });
        });

        it('GeometryCollection', function () {
            var spec = {
                type: 'GeometryCollection',
                geometries: [
                    {
                        type: 'Point',
                        coordinates: [0, 0]
                    }
                ]
            };

            expect(normalize(spec)).toEqual({
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    geometry: spec.geometries[0],
                    properties: {}
                }],
                summary: {}
            });
        });

        it('Point', function () {
            var spec = {
                type: 'Point',
                coordinates: [0, 0]
            };

            expect(normalize(spec)).toEqual({
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    geometry: spec,
                    properties: {}
                }],
                summary: {}
            });
        });

        it('Invalid', function () {
            expect(function () {
                normalize({});
            }).toThrow();
        });
    });

    it('style', function () {
        var geojson = normalize({
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [0, 0]
                    },
                    properties: {
                        a: 1,
                        b: 'red'
                    }
                }, {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [1, 1]
                    },
                    properties: {
                        a: -1,
                        b: 'blue'
                    }
                }, {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [3, 3]
                    },
                    properties: {
                        c: 0
                    }
                }
            ]
        });

        var vis = {
            point: {
                fillColor: jasmine.createSpy('fillColor').andReturn('green'),
                strokeWidth: jasmine.createSpy('strokeWidth').andReturn(4)
            }
        };

        var args = [
            {
                'a': 1,
                'b': 'red',
                'fillColor': 'green',
                'strokeWidth': 4
            },
            {
                'a': -1,
                'b': 'blue',
                'fillColor': 'green',
                'strokeWidth': 4
            },
            {
                'c': 0,
                'fillColor': 'green',
                'strokeWidth': 4
            }
        ];
        expect(_.pluck(style(geojson, vis).features, 'properties'))
            .toEqual(args);

        expect(vis.point.fillColor.calls.length).toBe(3);
        expect(vis.point.strokeWidth.calls.length).toBe(3);

        expect(vis.point.fillColor.calls[0].args[0]).toEqual(args[0]);
        expect(vis.point.fillColor.calls[1].args[0]).toEqual(args[1]);
        expect(vis.point.fillColor.calls[2].args[0]).toEqual(args[2]);

        expect(vis.point.strokeWidth.calls[0].args[0]).toEqual(args[0]);
        expect(vis.point.strokeWidth.calls[1].args[0]).toEqual(args[1]);
        expect(vis.point.strokeWidth.calls[2].args[0]).toEqual(args[2]);
    });

    describe('colorScale', function () {
        it('invalid ramp', function () {
            expect(
                minerva.geojsonUtil.colorScale('invalid color ramp', {})()
            ).toBe('#ffffff');
        });
        describe('numeric values', function () {
            it('one value', function () {
                var scale = minerva.geojsonUtil.colorScale('Reds', {
                    min: 0,
                    max: 0
                });

                expect(scale(0)).toBe(colorbrewer.Reds[9][0]);
            });
            it('linear scale', function () {
                var scale = minerva.geojsonUtil.colorScale('Reds', {
                    min: 0,
                    max: 100
                });

                expect(scale(0)).toBe(colorbrewer.Reds[9][0]);
                expect(scale(100)).toBe(colorbrewer.Reds[9][8]);
            });
            it('log scale', function () {
                var scale = minerva.geojsonUtil.colorScale('Reds', {
                    min: 1,
                    max: 100
                }, true, false, false);
                expect(scale(1)).toBe(colorbrewer.Reds[9][0]);
                expect(scale(10)).toBe(colorbrewer.Reds[9][4]);
                expect(scale(100)).toBe(colorbrewer.Reds[9][8]);
            });
            it('linear scale with clamping', function () {
                var scale = minerva.geojsonUtil.colorScale('Reds', {
                    min: 20,
                    max: 80
                }, false, false, true, 20, 80);
                expect(scale(0)).toBe(colorbrewer.Reds[9][0]);
                expect(scale(20)).toBe(colorbrewer.Reds[9][0]);
                expect(scale(80)).toBe(colorbrewer.Reds[9][8]);
                expect(scale(100)).toBe(colorbrewer.Reds[9][8]);
            });
            it('quantile scale', function () {
                var scale = minerva.geojsonUtil.colorScale('Reds', {
                    min: 1,
                    max: 1001
                }, false, true, false, null, null, [1, 2, 3, 4, 5, 6, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 1000, 1001]);
                expect(scale(1)).toBe(colorbrewer.Reds[9][0]);
                expect(scale(2)).toBe(colorbrewer.Reds[9][0]);
                expect(scale(15)).toBe(colorbrewer.Reds[9][7]);
                expect(scale(16)).toBe(colorbrewer.Reds[9][7]);
                expect(scale(1000)).toBe(colorbrewer.Reds[9][8]);
                expect(scale(1001)).toBe(colorbrewer.Reds[9][8]);
            });
        });
        describe('string values', function () {
            it('two categories', function () {
                var scale = minerva.geojsonUtil.colorScale('Reds', {
                    values: {
                        one: null,
                        two: null
                    }
                });

                expect(scale('one')).toBe(colorbrewer.Reds[3][0]);
                expect(scale('two')).toBe(colorbrewer.Reds[3][1]);
            });
            it('three categories', function () {
                var scale = minerva.geojsonUtil.colorScale('Reds', {
                    values: {
                        one: null,
                        two: null,
                        three: null
                    }
                });

                expect(scale('one')).toBe(colorbrewer.Reds[3][0]);
                expect(scale('two')).toBe(colorbrewer.Reds[3][1]);
                expect(scale('three')).toBe(colorbrewer.Reds[3][2]);
            });
        });
    });
    describe('getFeatures', function () {
        it('all', function () {
            expect(
                minerva.geojsonUtil.getFeatures({ type: 'FeatureCollection', features: [{}, {}] })
            ).toEqual([{}, {}]);
        });
        it('Point', function () {
            expect(
                minerva.geojsonUtil.getFeatures({
                    type: 'FeatureCollection',
                    features: [{
                    }, {
                        geometry: {
                            type: 'Point'
                        }
                    }, {
                        geometry: {
                            type: 'MultiPoint'
                        }
                    }]
                }, 'Point')).toEqual([{ geometry: { type: 'Point' } }]);
        });
    });
});
