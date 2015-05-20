minerva.views.SessionView = minerva.View.extend({

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
        },
        'click button.m-save-session-button': function () {
            this.model.saveSession();
        }
    },

    _gotoSession: function (session) {
        minerva.router.navigate('session/' + session.id, {trigger: true});
    },

    _enableSave: function () {
        this.$('.m-save-session-button').prop('disabled', false);
        this.$('.m-save-session-button').addClass('btn-success');
    },

    _disableSave: function () {
        this.$('.m-save-session-button').prop('disabled', 'disabled');
        this.$('.m-save-session-button').removeClass('btn-success');
    },

    initialize: function (settings) {
        this.model = settings.session;
        this.datasetsCollection = settings.datasetsCollection;
        _.each(this.datasetsCollection.models, function (dataset) {
            if (this.model.datasetInFeatures(dataset)) {
                dataset.set('displayed', true);
            }
        }, this);

        // listen for a change on a dataset being displayed
        // this should add or remove it from the current session
        this.listenTo(this.datasetsCollection, 'change:displayed', function (dataset) {
            this._enableSave();
            if (dataset.get('displayed')) {
                this.model.addDataset(dataset);
            } else {
                this.model.removeDataset(dataset);
            }
        });
        this.listenTo(this.model, 'change', function () {
            this._enableSave();
        });
        this.listenTo(this.model, 'm:saved', function () {
            this._disableSave();
        });

        this.render();
    },

    render: function () {
        // TODO different approach could be load the page
        // and adjust whatever is needed after access is loaded
        // just set some minimum default and let the page render
        this.model.getAccessLevel(_.bind(function (accessLevel) {
            this.$el.html(minerva.templates.sessionPage({
                session: this.model,
                accessLevel: accessLevel,
                girder: girder
            }));
            //TODO we have the collection of datasets and also the session data
            //use the session data to show which dataset is displayed

            this.dataPanel = new minerva.views.DataPanel({
                el: this.$('.dataPanel'),
                session: this.model,
                collection: this.datasetsCollection,
                parentView: this
            });
            // TODO pass session to layers
            // TODO save session with every +/- to layers
            this.layersPanel = new minerva.views.LayersPanel({
                el: this.$('.layersPanel'),
                collection: this.datasetsCollection,
                parentView: this
            });

            var mapSettings = {
                basemap: this.model.sessionJsonContents.basemap,
                center: this.model.sessionJsonContents.center
            };
            this.mapPanel = new minerva.views.MapPanel({
                el: this.$('.mapPanel'),
                mapSettings: mapSettings,
                collection: this.datasetsCollection,
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

            this.$('.gridster > ul').gridster({
                widget_margins: [10, 10],
                widget_base_dimensions: [210, 210]
            });

        }, this));

        return this;
    }
});

minerva.router.route('maps', 'maps', function () {
    girder.events.trigger('g:navigateTo', minerva.views.SessionView);
});

minerva.router.route('session/:id', 'session', function (id) {
    // fetch the session and render it
    var session = new minerva.models.SessionModel();
    session.set({
        _id: id
    }).on('m:fetched', function () {
        var datasetsCollection = new minerva.collections.DatasetCollection();
        datasetsCollection.on('g:changed', function () {
            girder.events.trigger('g:navigateTo', minerva.views.SessionView, {
                datasetsCollection: datasetsCollection,
                session: session
            });
        }).fetch();
    }, this).on('g:error', function () {
        minerva.router.navigate('sessions', {trigger: true});
    }, this).fetch();
});
