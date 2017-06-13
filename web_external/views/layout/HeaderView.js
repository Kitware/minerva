import View from '../view';
import { staticRoot } from 'girder/rest';
import template from '../../templates/layout/layoutHeader.pug';
import LayoutHeaderUserView from './HeaderUserView';
import '../../stylesheets/layout.styl';
import logoImage from '../../assets/Minerva_Logo.png';

export default View.extend({
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
