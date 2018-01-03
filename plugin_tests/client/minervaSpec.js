girderTest.importPlugin('jobs');
girderTest.importPlugin('gravatar');
girderTest.importPlugin('database_assetstore');
girderTest.importPlugin('girder_ktile');
girderTest.importPlugin('minerva');

girderTest.importStylesheet('/static/built/plugins/minerva/minerva.min.css');
girderTest.importStylesheet('/static/built/plugins/jobs/plugin.min.css');

girderTest.addScripts([
    '/clients/web/static/built/plugins/minerva/minerva.min.js'
]);

// helper function to make it easy to get Backbone View instance from DOM element
var setElement = Backbone.View.prototype.setElement;
Backbone.View.prototype.setElement = function (element) {
    if (!$(element).data('backboneView')) {
        $(element).data('backboneView', []);
    }
    var views = $(element).data('backboneView');
    if (views) {
        views.push(this);
    }
    return setElement.apply(this, arguments);
};
$(function () {
    girder.auth.login('admin', 'adminpassword!').done(function () {
    });
});

describe('Main view', function () {
    var _map;
    beforeEach(function () {
        // disable the ui slider because it doesn't work on phantomjs
        _map = geo.map;
        geo.map = function () {
            var m = _map.apply(this, arguments);
            var existingCreateLayer = m.createLayer;
            m.createLayer = function (type) {
                var layer = existingCreateLayer.apply(this, arguments);
                if (type === 'ui') {
                    var existingCreateWidget = layer.createWidget;
                    layer.createWidget = function (widgetName) {
                        if (widgetName === 'slider') {
                            return {};
                        } else {
                            return existingCreateWidget.apply(this, arguments);
                        }
                    };
                }
                return layer;
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
    var layerPanelView = null;
    it('Upload a geojson and a geojson-timeseries files', function () {
        layerPanelView = $('#m-layer-panel').data('backboneView')[0];

        runs(function () {
            window.geo.util.mockVGLRenderer();

            $('.icon-upload').click();
        });

        girderTest.waitForDialog();

        runs(function () {
            girderTest._prepareTestUpload();
            girderTest.sendFile('plugins/minerva/plugin_tests/data/nys_counties.geojson');
            $('#g-files').parent().addClass('hide');
            $('.g-start-upload').click();
        });

        girderTest.waitForLoad();

        runs(function () {
            $('.icon-upload').click();
        });

        girderTest.waitForDialog();

        runs(function () {
            girderTest._prepareTestUpload();
            girderTest.sendFile('plugins/minerva/plugin_tests/data/geojson-timeseries_1.geojson');
            $('#g-files').parent().addClass('hide');
            $('.g-start-upload').click();
        });

        girderTest.waitForLoad();
    });

    it('Add two datasets to session layer', function () {
        runs(function () {
            $('.add-dataset-to-session').click();
            $('.add-dataset-to-session').click();
        });

        waitsFor(function () {
            return layerPanelView.$('.layersList ul.datasets').children().length === 2;
        }, 'layers to be created');

        waitsFor(function () {
            var datasetId = layerPanelView.$('.m-anim-frame').closest('[m-dataset-id]').attr('m-dataset-id');
            var dataset = layerPanelView.collection.get(datasetId);
            return dataset;
        }, 'dataset to populate');
    });

    it('Change animation frames', function () {
        runs(function () {
            var datasetId = layerPanelView.$('.m-anim-frame').closest('[m-dataset-id]').attr('m-dataset-id');
            var dataset = layerPanelView.collection.get(datasetId);
            var series = dataset.get('geoData').series;

            // all features on the timeseries layer should be hidden except for the features of current frame
            expect(_.every(series, function (series, i) {
                return _.every(series.features, function (feature) {
                    return feature.visible() === (i === 0);
                });
            })).toBe(true);

            var geoJsLayer = dataset.geoJsLayer;
            spyOn(geoJsLayer, 'draw');

            layerPanelView.$('.m-anim-frame').val(30);
            layerPanelView.$('.m-anim-frame').trigger('change');

            expect(_.every(series, function (series, i) {
                return _.every(series.features, function (feature) {
                    return feature.visible() === (i === 30);
                });
            })).toBe(true);

            expect(dataset.get('animationFrame')).toBe(30);
            expect(geoJsLayer.draw.calls.length).toBe(1);

            layerPanelView.$('.m-anim-step').click();
            layerPanelView.$('.m-anim-step').click();

            expect(_.every(series, function (series, i) {
                return _.every(series.features, function (feature) {
                    return feature.visible() === (i === 32);
                });
            })).toBe(true);

            layerPanelView.$('.m-anim-step-back').click();

            expect(_.every(series, function (series, i) {
                return _.every(series.features, function (feature) {
                    return feature.visible() === (i === 31);
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

describe('Datapanel', function () {
    it('Select and unselect datasets', function () {
        $('.source-title#Tiff').trigger('click');
        $('.source-title#GeoJSON').trigger('click');

        // Test category selection
        $('.source-title#Tiff').next('.m-sub-category').find('.category-title#Other input').trigger('change');
        expect($('#m-data-panel .dataset input:checked').length).toEqual(1);
        $('.source-title#GeoJSON').next('.m-sub-category').find('.category-title#Other input').trigger('change');
        expect($('#m-data-panel .dataset input:checked').length).toEqual(4);
        // unselect checked categories
        $('.source-title#Tiff').next('.m-sub-category').find('.category-title#Other input').trigger('change');
        $('.source-title#GeoJSON').next('.m-sub-category').find('.category-title#Other input').trigger('change');
        expect($('#m-data-panel .dataset input:checked').length).toEqual(0);

        // test individual dataset selection
        $('.source-title#GeoJSON').next('.m-sub-category').find('.dataset input').first().prop('checked', true).trigger('change');
        expect($('#m-data-panel .dataset input:checked').length).toEqual(1);
        $('.source-title#GeoJSON').next('.m-sub-category').find('.dataset input').first().prop('checked', false).trigger('change');
        expect($('#m-data-panel .dataset input:checked').length).toEqual(0);
    });

    it('Show dataset boundaries', function () {
        var mapPanel = $('#m-map-panel').data('backboneView')[0];
        runs(function () {
            $('.source-title#Tiff').next('.m-sub-category').find('.category-title#Other input').trigger('change');
            $('.source-title#GeoJSON').next('.m-sub-category').find('.category-title#Other input').trigger('change');

            $('.icon-button.show-bounds').trigger('click');
        });

        waitsFor(function () {
            return $('.icon-button.remove-bounds').length;
        }, 'boundaries to be drawn');

        runs(function () {
            expect(mapPanel.annotationLayer).not.toBeFalsy();
            expect(mapPanel.annotationLayer.annotations().length).toEqual(4);
        });
    });

    it('Toggle boundary label', function () {
        var mapPanel = $('#m-map-panel').data('backboneView')[0];
        $('.icon-button.toggle-bounds-label').trigger('click');
        expect(mapPanel.annotationLayer.options().showLabels).toEqual(true);
        $('.icon-button.toggle-bounds-label').trigger('click');
        expect(mapPanel.annotationLayer.options().showLabels).toEqual(false);
    });

    it('Hide dataset boundaries', function () {
        var mapPanel = $('#m-map-panel').data('backboneView')[0];
        $('.icon-button.remove-bounds').trigger('click');
        expect(mapPanel.annotationLayer).toBeFalsy();
    });
});
