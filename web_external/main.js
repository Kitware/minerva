import $ from 'jquery';
import { registerPluginNamespace } from 'girder/pluginUtils';
import App from './App.js';
import events from './events';
import router from './router';
import * as index from './index';
import contourJsonReader from './contourJsonReader';

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

registerPluginNamespace('minerva', index);
