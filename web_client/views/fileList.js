import _ from 'underscore';
import { wrap } from 'girder/utilities/PluginUtils';
import { AccessType } from 'girder/constants';
import { restRequest } from 'girder/rest';
import events from 'girder/events';
import FileListWidget from 'girder/views/widgets/FileListWidget';

import template from '../templates/minerva_fileAction.pug';
import '../stylesheets/fileList.styl';

wrap(FileListWidget, 'render', function (render) {
    render.call(this);
    if (!this.parentItem || !this.parentItem.get('_id')) {
        return this;
    }
    if (this.parentItem.getAccessLevel() < AccessType.WRITE) {
        return this;
    }
    var minerva = (this.parentItem.get('meta') || {}).minerva;
    var files = this.collection.toArray();
    _.each(files, (file) => {
        var isMinervaGeojson = ((minerva || {}).geojson_file || {})._id === file.id;
        if (!minerva && $.inArray(file.get('mimeType'), ['application/json', 'application/vnd.geo+json']) < 0 && !file.get('name').match(/\.(geojson|json)(\.|$)/i)) {
            return;
        }
        var actions = this.$('.g-file-list-link[cid="' + file.cid + '"]',
            this.$el).closest('.g-file-list-entry').children(
            '.g-file-actions-container');
        if (!actions.length) {
            return;
        }
        var fileAction = template({
            file: file, minerva: minerva, geojson: isMinervaGeojson
        });
        if (fileAction) {
            actions.prepend(fileAction);
        }
    });
    this.$('.g-minerva-geojson-remove', this.$el).on('click', _.bind(function () {
        this.parentItem.removeMetadata('minerva', _.bind(function () {
            this.parentItem.unset('meta');
            this.parentItem.fetch();
        }, this), null, {});
    }, this));
    this.$('.g-minerva-geojson-create', this.$el).on('click', _.bind(function (e) {
        restRequest({
            type: 'POST',
            path: 'minerva_dataset_geojson',
            data: { itemId: this.parentItem.id },
            error: function (error) {
                if (error.status !== 0) {
                    events.trigger('g:alert', {
                        text: error.responseJSON.message,
                        type: 'info',
                        timeout: 5000,
                        icon: 'info'
                    });
                }
            }
        }).done(_.bind(function () {
            this.parentItem.unset('meta');
            this.parentItem.fetch();
        }, this));
    }, this));
    return this;
});
