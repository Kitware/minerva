import { staticRoot } from 'girder/rest';

import View from '../view';
import LayoutHeaderUserView from './HeaderUserView';
import template from '../../templates/layout/layoutHeader.pug';
import '../../stylesheets/layout.styl';
import logoImage from '../../assets/Minerva_Logo.png';

const HeaderView = View.extend({
    events: {
    },
    render: function () {
        this.$el.html(template({
            staticRoot: staticRoot,
            logoImage: logoImage
        }));
        new LayoutHeaderUserView({
            el: this.$('.m-current-user-wrapper'),
            parentView: this
        }).render();
    }
});
export default HeaderView;
