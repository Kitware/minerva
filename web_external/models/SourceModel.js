import MinervaModel from '../MinervaModel';

export default MinervaModel.extend({
    getSourceType: function () {
        return this.metadata().source_type;
    }
});
