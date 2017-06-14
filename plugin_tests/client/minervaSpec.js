girderTest.importStylesheet(
    '/static/built/plugins/minerva/plugin.min.css'
);

girderTest.addCoveredScripts([
    '/plugins/minerva/plugin_tests/client/mockVGL.js'
]);

$(function () {

    girder.login('minerva-admin', 'minerva-password!').then(function () {
        window.setTimeout(function () {
            girderTest.shimBlobBuilder();
            minerva.events.trigger('g:appload.before');
            minerva.mainApp = new minerva.App({
                el: 'body',
                parentView: null
            });
            minerva.events.trigger('g:appload.after');
        }, 1000);
    });
});

describe('Main view', function () {

    var _map;
    beforeEach(function () {
        // disable the ui slider because it doesn't work on phantomjs
        _map = geo.map;
        geo.map = function () {
            var m = _map.apply(this, arguments);
            var c = m.createLayer;
            m.createLayer = function (type) {
                if (type === 'ui') {
                    return {
                        createWidget: function () {
                            return {};
                        }
                    };
                }
                return c.apply(this, arguments);
            };
            return m;
        };
        waitsFor(function () {
            return $('.m-sessions-search-container:visible').length === 1;
        }, 'the main panel to be visible');
    });

    afterEach(function () {
        geo.map = _map;
    });

    it('contains the minerva app body', function () {
        waitsFor(function () {
            return $('.m-sessions-search-container:visible').length === 1;
        }, 'the main panel to be visible');

        runs(function () {
            expect($('#g-app-body-container').length).toBe(1);
        });
    });

    it('create a new session', function () {
        runs(function () {
            $('.m-session-create-button').click();
        });

        waitsFor(function () {
            return !!$('.m-save-session').length;
        });

        runs(function () {
            $('#m-session-name').val('Test session');
            $('#m-session-description').val('A session created during a client test.');
            $('.m-save-session').click();
        });

        waitsFor(function () {
            return !!$('#m-panel-groups').length;
        });

        runs(function () {
            var panels = $('#m-panel-groups');
            expect(panels.find('#m-analysis-panel').length).toBe(1);
            expect(panels.find('#m-data-panel').length).toBe(1);
            expect(panels.find('#m-layer-panel').length).toBe(1);
            expect(panels.find('#m-jobs-panel').length).toBe(1);
        });
    });
});

describe('Session view', function () {

    layerPanelView = null;
    it('Upload a geojson and a geojson-timeseries files', function () {
        layerPanelView = window.minerva.mainApp.bodyView._childViews[1]._childViews[2];
        var handle = false;
        runs(function () {
            $('.icon-upload').click();
        });

        girderTest.waitForDialog();

        runs(function () {
            handle = false;
            _prepareTestUpload();
            girderTest.sendFile('plugins/minerva/plugin_tests/data/nys_counties.geojson');
            $('#g-files').parent().addClass('hide');
            $('.g-start-upload').click();
        });

        girderTest.waitForLoad();

        runs(function () {
            handle = false;
            $('.icon-upload').click();
        });

        girderTest.waitForDialog();

        runs(function () {
            handle = false;
            _prepareTestUpload();
            girderTest.sendFile('plugins/minerva/plugin_tests/data/geojson-timeseries_1.geojson');
            $('#g-files').parent().addClass('hide');
            $('.g-start-upload').click();
        });

        girderTest.waitForLoad();
    });

    it('Add two datasets to session layer', function () {
        handle = false;
        runs(function () {
            window.mockVGLRenderer(true);

            $('.add-dataset-to-session').click();
            $('.add-dataset-to-session').click();
        });

        waitsFor(function(){
            return layerPanelView.$('.layersList ul.datasets').children().length == 2;
        }, 'layers to be created');

        waitsFor(function(){
            var datasetId = layerPanelView.$('.m-anim-frame').closest('[m-dataset-id]').attr('m-dataset-id');
            var dataset = layerPanelView.collection.get(datasetId);
            return dataset;
        }, 'dataset to populate');
    });

    it('Change animation frames', function () {
        handle = false;
        runs(function () {

            var datasetId = layerPanelView.$('.m-anim-frame').closest('[m-dataset-id]').attr('m-dataset-id');
            var dataset = layerPanelView.collection.get(datasetId);
            var series = dataset.get('geoData').series;

            // all features on the timeseries layer should be hidden except for the features of current frame
            expect(_.every(series, function (series, i) {
                return _.every(series.features, function (feature) {
                    return feature.visible() == (i == 0);
                });
            })).toBe(true);

            var geoJsLayer = dataset.geoJsLayer;
            spyOn(geoJsLayer, 'draw');

            layerPanelView.$('.m-anim-frame').val(30);
            layerPanelView.$('.m-anim-frame').trigger("change");

            expect(_.every(series, function (series, i) {
                return _.every(series.features, function (feature) {
                    return feature.visible() == (i == 30);
                });
            })).toBe(true);

            expect(dataset.get('animationFrame')).toBe(30);
            expect(geoJsLayer.draw.calls.length).toBe(1);

            layerPanelView.$('.m-anim-step').click();
            layerPanelView.$('.m-anim-step').click();

            expect(_.every(series, function (series, i) {
                return _.every(series.features, function (feature) {
                    return feature.visible() == (i == 32);
                });
            })).toBe(true);

            layerPanelView.$('.m-anim-step-back').click();

            expect(_.every(series, function (series, i) {
                return _.every(series.features, function (feature) {
                    return feature.visible() == (i == 31);
                });
            })).toBe(true);

            expect(dataset.get('animationFrame')).toBe(31);
            expect(geoJsLayer.draw.calls.length).toBe(4);

            layerPanelView.$('.m-anim-play').click();

            expect(dataset.get('animationFrame')).not.toBe(31);

            layerPanelView.$('.m-anim-stop').click();

            expect(dataset.get('animationFrame')).toBe(0);

            layerPanelView.$('select[class^="m-cycle-duration"]').val(60).change();
            expect(layerPanelView.$('select[class^="m-cycle-duration"]').find(':selected').text()).toBe('1 minute');
            expect(dataset.get('animationDuration')).toBe(60);
        });
    });
});
