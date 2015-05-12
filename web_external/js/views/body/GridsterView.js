minerva.views.GridsterView = minerva.View.extend({

    events: {
        'click a.m-edit-session': function () {
            if (!this.editSessionWidget) {
                this.editSessionWidget = new minerva.views.EditSessionWidget({
                    el: $('#g-dialog-container'),
                    model: this.model,
                    parentView: this
                }).on('g:saved', function () {
                    this.render();
                }, this);
            }
            this.editSessionWidget.render();
        }
    },

    _gotoSession: function (session) {
        minerva.router.navigate('session/' + session.id, {trigger: true});
    },

    initialize: function (settings) {
        this.model = settings.session || {};
        girder.cancelRestRequests('fetch');
        this.collection = new minerva.collections.DatasetCollection();
        this.collection.fetch();
        this.render();
    },

    render: function () {
        // TODO different approach could be load the page
        // and adjust whatever is needed after access is loaded
        // just set some minimum default and let the page render
        this.model.getAccessLevel(_.bind(function (accessLevel) {
            this.$el.html(minerva.templates.gridsterPage({
                session: this.model,
                accessLevel: accessLevel,
                girder: girder
            }));
            console.log(this.model);
            //TODO we have the collection of datasets and also the session data
            //use the session data to show which dataset is displayed

            this.dataPanel = new minerva.views.DataPanel({
                el: this.$('.dataPanel'),
                collection: this.collection,
                parentView: this
            });
            // TODO pass session to layers
            // TODO pass session to map
            // TODO save session with every +/- to layers
            this.layersPanel = new minerva.views.LayersPanel({
                el: this.$('.layersPanel'),
                collection: this.collection,
                parentView: this
            }).render();

            this.mapPanel = new minerva.views.MapPanel({
                el: this.$('.mapPanel'),
                session: this.model,
                collection: this.collection,
                parentView: this
            }).render();

            this.geometryPanel = new minerva.views.GeometryPanel({
                el: this.$('.geometryPanel'),
                parentView: this
            }).render();

            this.analysisPanel = new minerva.views.AnalysisPanel({
                el: this.$('.analysisPanel'),
                parentView: this
            }).render();

            this.$('.gridster ul').gridster({
                widget_margins: [10, 10],
                widget_base_dimensions: [210, 210]
            });

        }, this));

        return this;
    }
});

minerva.router.route('maps', 'maps', function () {
    girder.events.trigger('g:navigateTo', minerva.views.GridsterView);
});

minerva.router.route('session/:id', 'session', function (id, params) {
    // fetch the session and render it
    var session = new minerva.models.SessionModel();
    session.set({
        _id: id
    }).on('m:fetched', function () {
        girder.events.trigger('g:navigateTo', minerva.views.GridsterView, {
            session: session
        });
    }, this).on('g:error', function () {
        minerva.router.navigate('sessions', {trigger: true});
    }, this).fetch();
});
