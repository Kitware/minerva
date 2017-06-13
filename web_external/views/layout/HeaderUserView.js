import View from '../view';
import events from 'girder/events';
import { restRequest } from 'girder/rest';
import router from '../../router';
import { getCurrentUser, setCurrentUser } from 'girder/auth';
import template from '../../templates/layout/layoutHeaderUser.pug'

export default View.extend({

    events: {
        'click a.g-login': function () {
            events.trigger('g:loginUi');
        },

        'click a.g-register': function () {
            events.trigger('g:registerUi');
        },

        'click a.g-logout': function () {
            restRequest({
                path: 'user/authentication',
                type: 'DELETE'
            }).done(_.bind(function () {
                setCurrentUser(null);
                events.trigger('g:login');
            }, this));
        },

        'click a.g-my-settings': function () {
            router.navigate('useraccount/' + getCurrentUser().get('_id') +
                '/info', { trigger: true });
        }
    },

    initialize: function () {
        events.on('g:login', this.render, this);
    },

    render: function () {
        this.$el.html(template({
            user: getCurrentUser()
        }));

        if (getCurrentUser()) {
            this.$('.m-portrait-wrapper').css(
                'background-image', 'url(' +
                getCurrentUser().getGravatarUrl(36) + ')');
        }
        return this;
    }

});
