$(function () {
    minerva.events.trigger('g:appload.before');
    minerva.mainApp = new minerva.App({
        el: 'body',
        parentView: null
    });
    minerva.mainApp.start().then(function () {
        minerva.events.trigger('g:appload.ready');
    });
    minerva.events.trigger('g:appload.after');
});
