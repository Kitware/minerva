import _ from 'underscore';
import { restRequest } from 'girder/rest';

import SourceModel from './SourceModel';

const WmsSourceModel = SourceModel.extend({

    createSource: function (params) {
        restRequest({
            path: '/minerva_datasets_wms',
            type: 'POST',
            data: params,
            error: null // ignore default error behavior (validation may fail)
        }).done(_.bind(function (resp) {
            this.set(resp);
            this.trigger('m:sourceReceived', resp);
        }, this)).fail(_.bind(function (err) {
            this.trigger('m:error', err);
        }, this));

        return this;
    }

});

export default WmsSourceModel;
