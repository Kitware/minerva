import { restRequest } from 'girder/rest';
import Collection from 'girder/collections/Collection';
import MinervaModel from './MinervaModel';

const MinervaCollection = Collection.extend({
    // minerva collections are items in a specific folder
    resourceName: 'item',
    model: MinervaModel,
    pageLimit: 100,
    getInitData: function () { return {}; },

    // extending collections should provide

    // model property
    // path property
    // override of getInitData, providing any needed params to initialize fetch

    fetchInit: function () {
        restRequest({
            path: this.path + '/folder',
            type: 'GET',
            data: this.getInitData()
        }).done(_.bind(function (resp) {
            if (!resp.folder) {
                restRequest({
                    path: this.path + '/folder',
                    type: 'POST',
                    data: this.getInitData()
                }).done(_.bind(function (resp) {
                    this.folderId = resp.folder._id;
                    this.trigger('m:fetchInitialized');
                }, this));
            } else {
                this.folderId = resp.folder._id;
                this.trigger('m:fetchInitialized');
            }
        }, this));
    },

    fetch: function (params, reset) {
        if (!this.folderId) {
            this.on('m:fetchInitialized', _.bind(function () {
                params = _.extend(params || {}, { folderId: this.folderId });
                Collection.prototype.fetch.call(this, params, reset);
            }, this)).fetchInit();
        } else {
            params = _.extend(params || {}, { folderId: this.folderId });
            Collection.prototype.fetch.call(this, params, reset);
        }
    }

});
export default MinervaCollection;
