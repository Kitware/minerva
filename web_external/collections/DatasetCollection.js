import { getCurrentUser } from 'girder/auth';

import MinervaCollection from '../MinervaCollection';
import DatasetModel from '../models/DatasetModel';
import WmsDatasetModel from '../models/WmsDatasetModel';

const DatasetCollection = MinervaCollection.extend({

    model: function (attrs, options) {
        // TODO dataset/source refactor
        if (attrs.meta && ('minerva' in attrs.meta)) {
            if (attrs.meta.minerva.dataset_type === 'wms') {
                return new WmsDatasetModel(attrs, options);
            }
        }
        return new DatasetModel(attrs, options);
    },

    modelId: function (attrs) {
        return attrs._id;
    },

    path: 'minerva_dataset',
    getInitData: function () {
        var initData = { userId: getCurrentUser().get('_id') };
        return initData;
    }

});
export default DatasetCollection;