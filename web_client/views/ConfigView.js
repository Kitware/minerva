import _ from 'underscore';
import View from 'girder/views/View';
import PluginConfigBreadcrumbWidget from 'girder/views/widgets/PluginConfigBreadcrumbWidget';
import { restRequest } from 'girder/rest';
import events from 'girder/events';

import template from '../templates/config.pug';

/**
 * Administrative configuration view for minerva.
 */
export default View.extend({
    render: function () {
        this.$el.html(template());
        if (!this.breadcrumb) {
            this.breadcrumb = new PluginConfigBreadcrumbWidget({
                pluginName: 'Minerva Geospatial Application',
                el: this.$('.g-config-breadcrumb-container'),
                parentView: this
            }).render();
        }

        return this;
    },

    _saveSettings: function (settings) {
        restRequest({
            type: 'PUT',
            path: 'system/setting',
            data: {
                list: JSON.stringify(settings)
            },
            error: null
        }).done(_.bind(function (resp) {
            events.trigger('g:alert', {
                icon: 'ok',
                text: 'Settings saved.',
                type: 'success',
                timeout: 4000
            });
        }, this)).fail(_.bind(function (resp) {
            this.$('#g-minerva-error-message').text(
                resp.responseJSON.message);
        }, this));
    }
});
