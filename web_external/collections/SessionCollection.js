import { getCurrentUser } from 'girder/auth';
import MinervaCollection from '../MinervaCollection';
import SessionModel from '../models/SessionModel';

const SessionCollection = MinervaCollection.extend({
    model: SessionModel,
    path: 'minerva_session',
    getInitData: function () {
        var initData = { userId: getCurrentUser().get('_id') };
        return initData;
    }

});
export default SessionCollection;
