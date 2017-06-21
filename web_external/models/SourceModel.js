import MinervaModel from '../MinervaModel';

const SourceModel = MinervaModel.extend({
    getSourceType: function () {
        return this.metadata().source_type;
    }
});
export default SourceModel;
