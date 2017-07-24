import App from 'girder/views/App';

import LayoutHeaderView from './views/layout/HeaderView';
import template from './templates/layout.pug';
import './stylesheets/layout.styl';

const MinervaApp = App.extend({

    render: function () {
        this.$el.html(template());

        new LayoutHeaderView({
            el: this.$('#m-app-header-container'),
            parentView: this
        }).render();

        return this;
    }

});
export default MinervaApp;
