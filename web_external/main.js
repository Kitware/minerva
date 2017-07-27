import $ from 'jquery';
import { registerPluginNamespace } from 'girder/pluginUtils';

import App from './App.js';
import events from './events';
import * as index from './index';

$(function () {
    events.trigger('g:appload.before');
    var app = new App({
        el: 'body',
        parentView: null,
        start: false
    });
    app.start().done(function () {
        events.trigger('g:appload.ready');
    });
    events.trigger('g:appload.after');
});

registerPluginNamespace('minerva', index);
