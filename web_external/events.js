import _ from 'underscore';
import Backbone from 'backbone';

// use events and varaible name will cause eslint-plugin-backbone issue
const evts = _.clone(Backbone.Events);
export default evts;
