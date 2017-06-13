import $ from 'jquery';
import App from './app.js';
import events from './events';
import router from './router';

$(function () {
    events.trigger('g:appload.before');
    var app = new App({
        el: 'body',
        parentView: null,
        start: false
    });
    app.start().then(function () {
        events.trigger('g:appload.ready');
    });
    events.trigger('g:appload.after');
});
