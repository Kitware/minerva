import MinervaCollection from '../MinervaCollection';
import DatasetModel from '../models/DatasetModel';
import WmsDatasetModel from '../models/WmsDatasetModel';
import { getCurrentUser } from 'girder/auth';

export default MinervaCollection.extend({

    model: function (attrs, options) {
        // TODO dataset/source refactor
        if (attrs.meta && ('minerva' in attrs.meta)) {
            if (attrs.meta.minerva.dataset_type === 'wms') {
                return new WmsDatasetModel(attrs, options);
            }
        }
        return new DatasetModel(attrs, options);
    },

    path: 'minerva_dataset',
    getInitData: function () {
        var initData = { userId: getCurrentUser().get('_id') };
        return initData;
    }

});
