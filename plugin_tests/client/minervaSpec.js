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
        expect($('#g-app-body-container').length).toBe(1);
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
