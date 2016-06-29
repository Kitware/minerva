/**
 * Administrative configuration view for minerva.
 */
girder.views.minerva_ConfigView = girder.View.extend({

    render: function () {
        this.$el.html(girder.templates.minerva_config());
        if (!this.breadcrumb) {
            this.breadcrumb = new girder.views.PluginConfigBreadcrumbWidget({
                pluginName: 'Minerva Geospatial Application',
                el: this.$('.g-config-breadcrumb-container'),
                parentView: this
            }).render();
        }

        return this;
    },

    _saveSettings: function (settings) {
        girder.restRequest({
            type: 'PUT',
            path: 'system/setting',
            data: {
                list: JSON.stringify(settings)
            },
            error: null
        }).done(_.bind(function (resp) {
            girder.events.trigger('g:alert', {
                icon: 'ok',
                text: 'Settings saved.',
                type: 'success',
                timeout: 4000
            });
        }, this)).error(_.bind(function (resp) {
            this.$('#g-minerva-error-message').text(
                resp.responseJSON.message);
        }, this));
    }
});

girder.router.route('plugins/minerva/config', 'minervaConfig', function () {
    girder.events.trigger('g:navigateTo', girder.views.minerva_ConfigView);
});
