$(function () {
    minerva.events.trigger('g:appload.before');
    minerva.mainApp = new minerva.App({
        el: 'body',
        parentView: null
    });
    minerva.events.trigger('g:appload.after');
});

describe('a test for the minerva plugin application', function () {

    it('displays the minerva app', function () {
        waitsFor(function () {
            return $('.m-sessions-search-container:visible').length === 1;
        }, 'the main panel to be visible');
    });

});
