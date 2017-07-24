import _ from 'underscore';
import ItemModel from 'girder/models/ItemModel';
import { restRequest } from 'girder/rest';

import events from './events';

const MinervaModel = ItemModel.extend({

    defaults: {},

    initialize: function () {
        var minervaMetadata = this.getMinervaMetadata();
        if (minervaMetadata) {
            this.setMinervaMetadata(minervaMetadata);
        }
    },

    /**
     * Utility method to get this model's current minerva metadata as
     * it exists on the client, updating this model's minerva metadata to the
     * minervaMetadata param if passed, but will not save the update.
     *
     * @param {minervaMetadata} the object to set as this model's minerva metadata if passed.
     * @returns {object} current minerva metadata of this model.
     */
    metadata: function (minervaMetadata) {
        if (minervaMetadata) {
            this.setMinervaMetadata(minervaMetadata);
        } else {
            return this.getMinervaMetadata();
        }
    },

    /**
     * Gets this model's current minerva metadata as it exists on the client.
     *
     * @returns {object} current minerva metadata of this model.
     */
    getMinervaMetadata: function () {
        // for now assume that keys exists and allow exceptions to happen if they don't
        var meta = this.get('meta');
        if (meta) {
            var minervaMetadata = meta.minerva;
            return minervaMetadata;
        } else {
            return false;
        }
    },

    /**
     * Sets this model's minerva metadata to the passed object, but does not save
     * the update.
     *
     * @param {minervaMetadata} the object to set as this model's minerva metadata.
     */
    setMinervaMetadata: function (minervaMetadata) {
        this.set('meta', _.extend(this.get('meta') || {}, { minerva: minervaMetadata }));
        if (minervaMetadata.geojson && minervaMetadata.geojson.data) {
            this.geoJsonAvailable = true;
            this.fileData = minervaMetadata.geojson.data;
        }
        return minervaMetadata;
    },

    /**
     * Async function that saves the metadata on this model, either the current minerva
     * metadata on the model, or if a minervaMetadata param is passed, first updating the
     * minerva metadata on this model to the passed object and then saving.
     *
     * @param {minervaMetadata} the object to set as this model's minerva metadata before saving.
     * @fires 'm:metadata_saved' event upon the metadata being saved.
     */
    saveMinervaMetadata: function (minervaMetadata) {
        if (minervaMetadata) {
            this.setMinervaMetadata(minervaMetadata);
        }
        restRequest({
            path: 'item/' + this.get('_id') + '/metadata',
            type: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(this.get('meta'))
        }).done(_.bind(function () {
            this.trigger('m:metadata_saved', this);
        }, this)).fail(_.bind(function (err) {
            console.error(err);
            events.trigger('g:alert', {
                icon: 'cancel',
                text: 'Could not update Minerva metadata in Item.',
                type: 'error',
                timeout: 4000
            });
        }, this));
    }
});
export default MinervaModel;
