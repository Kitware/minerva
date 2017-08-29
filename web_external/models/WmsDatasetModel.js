import _ from 'underscore';
import { restRequest } from 'girder/rest';

import DatasetModel from './DatasetModel';

const WmsDatasetModel = DatasetModel.extend({

    isRenderable: function () { // eslint-disable-line underscore/prefer-constant
        return true;
    },

    createWmsDataset: function (params) {
        restRequest({
            url: '/minerva_datasets_wms',
            type: 'POST',
            data: params,
            error: null // ignore default error behavior (validation may fail)
        }).done(_.bind(function (resp) {
            this.set(resp);
            this.trigger('m:wmsDatasetAdded');
        }, this)).fail(_.bind(function (err) {
            this.trigger('m:error', err);
        }, this));

        return this;
    }

});
export default WmsDatasetModel;
