minerva.views.SessionsView = minerva.View.extend({

    events: {
        'click a.m-session-link': function (event) {
            var cid = $(event.currentTarget).attr('m-session-cid');
            minerva.router.navigate('session/' + this.collection.get(cid).get('_id'), {trigger: true});
        },

        'click .m-session-create-button': 'createDialog'
    },

    initialize: function () {
        girder.cancelRestRequests('fetch');

        this.collection = new minerva.collections.SessionCollection();

        this.collection.on('g:changed', function () {
            // Utility to Create a session with a randomish name, for now we'll go with a 'default' session.
            // name: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5) + Date.now()//

            // Look for a default session, if it doesn't exist, create it.
            var defaultSessions = _.filter(this.collection.models, function (session) {
                return session.attributes.name == 'default';
            });
            if (defaultSessions.length > 0) {
                this._gotoSession(defaultSessions[0]);
            } else {
                var session = new minerva.models.SessionModel();
                session.set({
                    folderId: this.collection.folderId,
                    name: 'default'
                });
                session.on('g:saved', function () {
                    session.on('m:metadata_saved', function () {
                        this.collection.add(session);
                        this._gotoSession(session);
                    }, this);
                    session.createSessionMetadata();
                }, this).save();
            }
        }, this);

        this.paginateWidget = new girder.views.PaginateWidget({
            collection: this.collection,
            parentView: this
        });

        this.searchWidget = new girder.views.SearchFieldWidget({
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

        if (girder.currentUser) {
            this.collection.fetch();
        } else {
            this.render();
        }
    },

    render: function () {
        this.$el.html(minerva.templates.sessionList({
            sessions: this.collection.models,
            currentUser: !!girder.currentUser
        }));

        this.paginateWidget.setElement(this.$('.m-session-pagination')).render();
        this.searchWidget.setElement(this.$('.m-sessions-search-container')).render();

        return this;
    },

    createDialog: function () {
        new minerva.views.EditSessionWidget({
            el: $('#g-dialog-container'),
            parentView: this,
            parentCollection: this.collection
        }).on('g:saved', function (session) {
            this.collection.add(session);
            this._gotoSession(session);
        }, this).render();
    },

    _gotoSession: function (session) {
        minerva.router.navigate('session/' + session.id, {trigger: true});
    }
});

function _loginOrCreateBsveUser() {
    var email = window.girder_bsve_user;
    // Set all names and password to the email, without punctuation.
    var name = email.replace(/\./g, '');
    name = name.replace(/@/g, '');
    // Get the list of users based on this email.
    girder.restRequest({
        type: 'GET',
        path: 'user',
        data: {
            text: name
        }
    }).done(_.bind(function (users) {
        users = _.filter(users, function (user) {
            return user.firstName === name;
        });
        if (users.length > 0) {
            // User found, so login.
            var theUser = users[0];
            girder.login(theUser.firstName, theUser.firstName);
        } else {
            // No user found, create a user, then login.
            girder.restRequest({
                type: 'POST',
                path: 'user',
                data: {
                    login: name,
                    email: email,
                    firstName: name,
                    lastName: name,
                    password: name
                }
            }).done(_.bind(function (user) {
                girder.login(name, name);
            }, this));
         }
    }, this));
}

minerva.router.route('', 'index', function () {
    if (girder.currentUser) {
        girder.events.trigger('g:navigateTo', minerva.views.SessionsView);
    } else {
        _loginOrCreateBsveUser();
    }
});
minerva.router.route('sessions', 'sessions', function () {
    girder.events.trigger('g:navigateTo', minerva.views.SessionsView);
});

girder.events.on('g:login', function () {
    if (girder.currentUser) {
        girder.events.trigger('g:navigateTo', minerva.views.SessionsView);
    } else {
        _loginOrCreateBsveUser();
    }
});
