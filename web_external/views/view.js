import $ from 'jquery';
import reconcile from 'reconcile.js';
import View from 'girder/views/View';

const MinervaView = View.extend({
    update(template) {
        var $new = $(template);
        var changes = reconcile.diff($new[0], this.$el.children(0)[0]);
        reconcile.apply(changes, this.$el.children(0)[0]);
    }
});
export default MinervaView;
