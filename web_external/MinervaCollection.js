import $ from 'jquery';
import _ from 'underscore';
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

    fetchInit() {
        return restRequest({
            url: this.path + '/folder',
            type: 'GET',
            data: this.getInitData()
        }).then(_.bind(function (resp) {
            if (!resp.folder) {
                return restRequest({
                    url: this.path + '/folder',
                    type: 'POST',
                    data: this.getInitData()
                }).done(_.bind(function (resp) {
                    this.folderId = resp.folder._id;
                }, this));
            } else {
                this.folderId = resp.folder._id;
            }
        }, this));
    },

    fetch: function (params, reset) {
        var p;
        if (!this.folderId) {
            p = this.fetchInit();
        } else {
            p = $.Deferred().resolve();
        }
        return p.then(() => {
            params = _.extend(params || {}, { folderId: this.folderId });
            return Collection.prototype.fetch.call(this, params, reset);
        });
    }

});
export default MinervaCollection;
