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
        },
        'click a.m-edit-baselayer': function () {
            if (!this.editBaseLayerWidget) {
                this.editBaseLayerWidget = new minerva.views.EditBaseLayerWidget({
                    el: $('#g-dialog-container'),
                    model: this.model,
                    parentView: this
                }).on('g:saved', function () {
                    this.model.trigger('m:mapUpdated');
                }, this);
            }
            this.editBaseLayerWidget.render();
        },
        'click a.m-delete-session': function () {
            var session = this.model;
            girder.confirm({
                text: 'Are you sure you want to delete <b>' + session.escape('name') + '</b>?',
                yestext: 'Delete',
                escapedHtml: true,
                confirmCallback: _.bind(function () {
                    this.model.destroy({
                        progress: true
                    }).on('g:deleted', function () {
                        girder.events.trigger('g:alert', {
                            icon: 'ok',
                            text: 'Session deleted.',
                            type: 'success',
                            timeout: 4000
                        });
                        minerva.router.navigate('/', {trigger: true});
                    });
                }, this)
            });
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
        this.analysisCollection = settings.analysisCollection;
        _.each(this.datasetsCollection.models, function (dataset) {
            if (this.model.datasetInFeatures(dataset)) {
                dataset.set('displayed', true);
            }
        }, this);
        this.sourceCollection = settings.sourceCollection;

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

        this.mapPanel = new minerva.views.MapPanel({
            session: this.model,
            collection: this.datasetsCollection,
            parentView: this
        });

        this.dataPanel = new minerva.views.DataPanel({
            session: this.model,
            collection: this.datasetsCollection,
            parentView: this
        });

        this.layersPanel = new minerva.views.LayersPanel({
            collection: this.datasetsCollection,
            parentView: this
        });

        this.jobsPanel = new minerva.views.JobsPanel({
            parentView: this
        });

        this.analysisPanel = new minerva.views.AnalysisPanel({
            parentView: this,
            collection: this.analysisCollection,
            datasetsCollection: this.datasetsCollection,
            sourceCollection: this.sourceCollection
        });

        this.sourcePanel = new minerva.views.SourcePanel({
            session: this.model,
            sourceCollection: this.sourceCollection,
            datasetCollection: this.datasetsCollection,
            parentView: this
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

            this.$('.gridster > ul').gridster({
                widget_margins: [10, 10],
                widget_base_dimensions: [210, 210],
                draggable: {
                    handle: '.panelTitle'
                },
                resize: {
                    enabled: true,
                    min_size: [1, 1]
                }
            });

            this.dataPanel.setElement(this.$('.dataPanel')).render();
            this.mapPanel.setElement(this.$('.mapPanel')).render();
            this.layersPanel.setElement(this.$('.layersPanel')).render();
            this.jobsPanel.setElement(this.$('.jobsPanel')).render();
            this.analysisPanel.setElement(this.$('.analysisPanel')).render();
            this.sourcePanel.setElement(this.$('.m-source-panel')).render();

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
    }).once('m:fetched', function () {
        var datasetsCollection = new minerva.collections.DatasetCollection();
        datasetsCollection.once('g:changed', function () {
            var analysisCollection = new minerva.collections.AnalysisCollection();
            analysisCollection.once('g:changed', function () {
                var sourceCollection = new minerva.collections.SourceCollection();
                sourceCollection.once('g:changed', function () {
                    girder.events.trigger('g:navigateTo', minerva.views.SessionView, {
                        analysisCollection: analysisCollection,
                        datasetsCollection: datasetsCollection,
                        sourceCollection: sourceCollection,
                        session: session
                    });
                }).fetch();
            }).fetch();
        }).fetch();
    }, this).on('g:error', function () {
        minerva.router.navigate('sessions', {trigger: true});
    }, this).fetch();
});
