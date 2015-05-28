/**
 * Administrative configuration view for minerva.
 */
girder.views.minerva_ConfigView = girder.View.extend({
    events: {
        'click #g-minerva-submit-button': function (event) {
            var value = this.$('#minerva.geonames_folder').val().trim();

            this.$('#g-minerva-error-message').empty();
            this.$('#minerva-import-button').prop('disabled', 'disabled');
            this._saveSettings([{
                key: 'minerva.geonames_folder',
                value: value
            }]);

            event.preventDefault();
        },
        'click #g-minerva-import-button': function (event) {
            var value = this.$('#minerva.geonames_folder').val().trim();
            event.preventDefault();
        }
    },
    initialize: function () {
        girder.restRequest({
            type: 'GET',
            path: 'system/setting',
            data: {
              list: JSON.stringify(['minerva.geonames_folder'])
            },
            error: null
        }).done(_.bind(function (resp) {
            this.render();
            this.$('#minerva.geonames_folder').val(
                resp['minerva.geonames_folder']
            );
            if (resp['minerva.geonames_folder']) {
                this.$('#minerva-import-button').prop('disabled', null);
            }
        }, this));
    },

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
            this._maybeAllowImport();
        }, this)).error(_.bind(function (resp) {
            this.$('#g-minerva-error-message').text(
                resp.responseJSON.message);
        }, this));
    },

    /**
     * If the given folder is empty then enable the import button.
     */
    _maybeAllowImport: function () {
        var folder = this.$('#minerva.geonames_folder').val().trim();
        girder.restRequest({
            type: 'GET',
            path: 'item',
            data: {
                folderId: folder,
                limit: 1
            }
        }).done(_.bind(function (resp) {
            if (!resp.length) {
                this.$('#minerva-import-button').prop('disabled', null);
            }
        }, this));
    }
});

girder.router.route('plugins/minerva/config', 'minervaConfig', function () {
    girder.events.trigger('g:navigateTo', girder.views.minerva_ConfigView);
});
