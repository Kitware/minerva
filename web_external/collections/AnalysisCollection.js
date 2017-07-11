import MinervaCollection from '../MinervaCollection';
import AnalysisModel from '../models/AnalysisModel';

const AnalysisCollection = MinervaCollection.extend({

    model: AnalysisModel,
    path: 'minerva_analysis'

});
export default AnalysisCollection;

