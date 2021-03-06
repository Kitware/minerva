girderTest.importPlugin('jobs');
girderTest.importPlugin('gravatar');
girderTest.importPlugin('database_assetstore');
girderTest.importPlugin('large_image');
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
            $('.add-dataset-to-session').click();
        });

        waitsFor(function () {
            return layerPanelView.$('.layersList ul.datasets').children().length === 3;
        }, 'layers to be created');

        waitsFor(function () {
            var datasetId = layerPanelView.$('.m-anim-frame').closest('[m-dataset-id]').attr('m-dataset-id');
            var dataset = layerPanelView.collection.get(datasetId);
            return dataset && dataset.geoJsLayer;
        }, 'datasets be visualized');
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
    var mapPanel;
    it('Select and unselect datasets', function () {
        $('.source-title#Tiff').trigger('click');
        $('.source-title#GeoJSON').trigger('click');

        // Test category selection
        $('.source-title#Tiff').next('.m-sub-category').find('.category-title#Other input').trigger('change');
        expect($('#m-data-panel .dataset input:checked').length).toEqual(1);
        $('.source-title#GeoJSON').next('.m-sub-category').find('.category-title#Other input').trigger('change');
        expect($('#m-data-panel .dataset input:checked').length).toEqual(5);
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

    it('Infoviz widget', function () {
        $($('.dataset').filter(function () { return $(this).children('.m-name:contains("four_states.geojson")').length; })[0]).find('input').first().prop('checked', true).trigger('change');
        $('.show-infoviz').click();
        waitsFor(function () {
            return $('.ui-dialog.m-infoviz-widget-dialog').length;
        }, 'infoviz widget to be rendered');
        runs(function () {
            expect($('.m-infoviz-widget .chart-container .mark-rect path').length).toBe(4);
            $('.m-infoviz-widget .xlabel-selector ul.dropdown-menu li:eq(1) input').trigger('click');
            expect($('.m-infoviz-widget .chart-container .role-axis-title text').first().text()).toEqual('name, population');
        });
    });

    it('Show dataset boundaries', function () {
        mapPanel = $('#m-map-panel').data('backboneView')[0];
        runs(function () {
            $('.source-title#Tiff').next('.m-sub-category').find('.category-title#Other input').trigger('change');
            $('.source-title#GeoJSON').next('.m-sub-category').find('.category-title#Other input').trigger('change');

            $('.icon-button.show-bounds').trigger('click');
        });

        waitsFor(function () {
            return $('.icon-button.remove-bounds').length;
        }, 'boundaries to be drawn');

        runs(function () {
            expect(mapPanel.boundariesAnnotationLayer).not.toBeFalsy();
            expect(mapPanel.boundariesAnnotationLayer.annotations().length).toEqual(5);
        });
    });

    it('Toggle boundary label', function () {
        $('.icon-button.toggle-bounds-label').trigger('click');
        expect(mapPanel.boundariesAnnotationLayer.options().showLabels).toEqual(true);
        $('.icon-button.toggle-bounds-label').trigger('click');
        expect(mapPanel.boundariesAnnotationLayer.options().showLabels).toEqual(false);
    });

    it('Hide dataset boundaries', function () {
        $('.icon-button.remove-bounds').trigger('click');
        expect(mapPanel.boundariesAnnotationLayer).toBeFalsy();
    });

    it('Create boundary dataset with drawing', function () {
        $('.icon-button.m-boundary-dataset').trigger('click');
        mapPanel.drawDatasetLayer.geojson({ 'type': 'FeatureCollection', 'features': [{ 'type': 'Feature', 'geometry': { 'type': 'Polygon', 'coordinates': [[[-123.774414, 32.887971], [-123.774414, 39.748663], [-104.721679, 39.748663], [-104.721679, 32.887971], [-123.774414, 32.887971]]] }, 'properties': { 'annotationType': 'rectangle', 'name': 'Rectangle 1', 'annotationId': 1, 'fill': true, 'fillColor': '#00ff00', 'fillOpacity': 0.25, 'stroke': true, 'strokeColor': '#000000', 'strokeOpacity': 1, 'strokeWidth': 3 } }] });
        mapPanel.drawDatasetLayer.geoTrigger(geo.event.annotation.state, {});
        waitsFor(function () {
            return $('.bootbox-prompt .modal-footer .btn-primary').length;
        }, 'confirm modal to show');
        runs(function () {
            $('.bootbox-prompt .modal-footer .btn-primary').trigger('click');
        });
        waitsFor(function () {
            return $('.m-datasets[data-category=Boundary] .dataset .m-name:contains(Boundary)').length &&
                !$('.modal-backdrop').length;
        }, 'Boundary dataset to be created');
    });

    it('Filter datasets by intersecting', function () {
        $('.m-datasets[data-category=Boundary] .dataset .m-name:contains(Boundary)').first().parent().find('input').trigger('click');
        $('.icon-button.intersect-filter').trigger('click');
        waitsFor(function () {
            return $('.icon-button.clear-filters').length;
        }, 'dataset to be filtered');
        runs(function () {
            expect($('.m-datasets .dataset').length).toBe(5);
            $('.icon-button.clear-filters').trigger('click');
            expect($('.m-datasets .dataset').length).not.toBe(4);
        });
    });

    it('Filter datasets by dataset name', function () {
        $('#m-data-panel .search-bar input').val('geojson').trigger('keyup');
        waitsFor(function () {
            return $('.icon-button.clear-filters').length;
        }, 'dataset to be filtered');
        runs(function () {
            expect($('.m-datasets .dataset').length).toBe(4);
            $('.icon-button.clear-filters').trigger('click');
            expect($('.m-datasets .dataset').length).not.toBe(4);
            $('#m-data-panel .search-bar input').val('raster').trigger('keyup');
        });
        waitsFor(function () {
            return $('.icon-button.clear-filters').length;
        }, 'dataset to be filtered');
        runs(function () {
            expect($('.m-datasets .dataset').length).toBe(1);
            $('.icon-button.clear-filters').trigger('click');
        });
    });

    it('Rename dataset', function () {
        $($('.dataset').filter(function () { return $(this).children('.m-name:contains("three_states.geojson")').length; })[0]).find('.dataset-info').click();
        waitsFor(function () {
            return $('.m-dataset-info-widget').length;
        }, 'Dataset info modal to be created');
        runs(function () {
            $('.m-dataset-info-widget .edit-name').click();
            // canceling edit with esc key
            $('.m-dataset-info-widget .dataset-name input').val('abc');
            var e = $.Event('keydown', { keyCode: 27 });
            $('.m-dataset-info-widget .dataset-name input').trigger(e);
            $('.m-dataset-info-widget .edit-name').click();
            expect($('.m-dataset-info-widget .dataset-name input').val()).toBe('three_states.geojson');
            // Test change dataset name
            $('.m-dataset-info-widget .dataset-name input').val('Three states');
            $('.m-dataset-info-widget .dataset-name input').trigger('change');
            $('.m-dataset-info-widget .dataset-name button.commit-name').click();
            waitsFor(function () {
                return $('.dataset .m-name:contains("Three states")').length;
            }, 'dataset name change on dataset panel');
        });
    });

    it('Persist in memory dataset', function () {
        minerva.events.trigger('m:addExternalGeoJSON', {
            name: 'In memory dataset',
            data: { 'type': 'FeatureCollection', 'features': [{ 'type': 'Feature', 'properties': {}, 'geometry': { 'type': 'Point', 'coordinates': [-91.7578125, 41.244772343082076] } }] }
        });
        $($('.dataset').filter(function () { return $(this).children('.m-name:contains("In memory dataset")').length; })[0]).find('.persist-dataset').click();
        waitsFor(function () {
            var datasetElement = $($('.dataset').filter(function () { return $(this).children('.m-name:contains("In memory dataset")').length; })[0]);
            return datasetElement.length === 1 && datasetElement.find('.persist-dataset').length === 0;
        }, 'In memory dataset be persisted');
    });
});

describe('Layerpanel', function () {
    it('Zoom to dataset', function () {
        var mapPanel = $('#m-map-panel').data('backboneView')[0];
        var zoom = mapPanel.map.zoom();
        $('.layersList .dataset').first().find('.m-zoom-to').trigger('click');
        expect(zoom).not.toEqual(mapPanel.map.zoom());
    });
});

describe('Mappanel', function () {
    it('Take screenshot', function () {
        $('button.m-screenshot').click();
        waitsFor(function () {
            return $('.m-screenshot-result').length;
        }, 'screenshot be taken and shown');
        runs(function () {
            var screenshotResult = $('.m-screenshot-result');
            var image = screenshotResult.find('img').attr('src');
            var image2 = screenshotResult.find('a.save').attr('href');
            expect(image).toEqual(image2);
            expect(image.startsWith('data:image/png;base64,')).toBe(true);
        });
    });
});
