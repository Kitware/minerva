$(function () {
    minerva.events.trigger('g:appload.before');
    var app = new minerva.App({
        el: 'body',
        parentView: null
    });
    minerva.events.trigger('g:appload.after');
});
