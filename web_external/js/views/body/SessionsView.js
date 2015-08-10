minerva.views.SessionsView = minerva.View.extend({

    events: {
        'click a.m-session-link': function (event) {
            var cid = $(event.currentTarget).attr('m-session-cid');
            minerva.router.navigate('session/' + this.collection.get(cid).id, {trigger: true});
        },

        'click .m-session-create-button': 'createDialog'
    },

    initialize: function () {
        girder.cancelRestRequests('fetch');

        this.collection = new minerva.collections.SessionCollection();
        this.collection.on('g:changed', function () {
            this.render();
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

        girder.events.on('g:login', function () {
            if (girder.currentUser) {
                // unfortunately the underlying girder fetch() logic assumes
                // we're working with a paged collection.  this means on login
                // refresh we will try and grab the next page of session items instead
                // of the current page. We can call fetch a la this.collection.fetch({}, true)
                // to refresh the collection but the girder logic will not accept the folderId
                // params from minerva.collections.SessionCollection() if we are 'reseting' this 
                // means in order to fetch the session items we have to set the offset to 0 before
                // calling the fetch() function.
                this.collection.offset = 0;
                this.collection.fetch();
            } else {
                // this.collection = new minerva.collections.SessionCollection();
                this.collection.set([]);
                this.render();
            }
        }, this);

        if (girder.currentUser) {
            this.collection.fetch();
        } else {
            this.render();
        }
    },

    render: function () {
        this.$el.html(minerva.templates.sessionList({
            sessions: this.collection.models,
            admin: !!(girder.currentUser && girder.currentUser.get('admin'))
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

minerva.router.route('', 'index', function () {
    girder.events.trigger('g:navigateTo', minerva.views.SessionsView);
});
minerva.router.route('sessions', 'sessions', function () {
    girder.events.trigger('g:navigateTo', minerva.views.SessionsView);
});
