import View from '../view';
import router from '../../router';
import SessionCollection from '../../collections/SessionCollection';
import PaginateWidget from 'girder/views/widgets/PaginateWidget';
import SearchFieldWidget from 'girder/views/widgets/SearchFieldWidget';
import { cancelRestRequests } from 'girder/rest';
import { getCurrentUser } from 'girder/auth';
import sessionListTemplate from '../../templates/body/sessionList.pug';
import EditSessionWidget from '../widgets/EditSessionWidget';
import '../../stylesheets/body/sessionList.styl';

export default View.extend({

    events: {
        'click a.m-session-link': function (event) {
            var cid = $(event.currentTarget).attr('m-session-cid');
            router.navigate('session/' + this.collection.get(cid).get('_id'), {trigger: true});
        },

        'click .m-session-create-button': 'createDialog'
    },

    initialize: function () {
        cancelRestRequests('fetch');

        this.collection = new SessionCollection();
        this.collection.on('g:changed', function () {
            this.render();
        }, this);

        this.paginateWidget = new PaginateWidget({
            collection: this.collection,
            parentView: this
        });

        this.searchWidget = new SearchFieldWidget({
            placeholder: 'Search sessions...',
            types: ['session_session'],
            getInfoCallback: function (type, obj) {
                if (type === 'session_session') {
                    return {
                        text: obj.name,
                        icon: 'flag-checkered'
                    };
                }
            },
            parentView: this
        }).on('g:resultClicked', this._gotoSession, this);

        if (getCurrentUser()) {
            this.collection.fetch();
        } else {
            this.render();
        }
    },

    render: function () {
        this.$el.html(sessionListTemplate({
            sessions: this.collection.models,
            currentUser: !!getCurrentUser()
        }));

        this.paginateWidget.setElement(this.$('.m-session-pagination')).render();
        this.searchWidget.setElement(this.$('.m-sessions-search-container')).render();

        return this;
    },

    createDialog: function () {
        new EditSessionWidget({
            el: $('#g-dialog-container'),
            parentView: this,
            parentCollection: this.collection
        }).on('g:saved', function (session) {
            this.collection.add(session);
            this._gotoSession(session);
        }, this).render();
    },

    _gotoSession: function (session) {
        router.navigate('session/' + session.id, {trigger: true});
    }
});