minerva.views.SessionView = minerva.View.extend({

    events: {
        'click a.m-add-session': function () {
            this._createSession();
        },
        'click a.m-edit-session': function () {
            this._editSession();
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
        },
        'click a.m-session-link': function (event) {
            var cid = $(event.currentTarget).attr('m-session-cid');
            minerva.router.navigate('session/' + this.sessionCollection.get(cid).get('_id'), {trigger: true});
        }
    },

    _createSession: function () {
        new minerva.views.EditSessionWidget({
            el: $('#g-dialog-container'),
            parentView: this,
            parentCollection: this.sessionCollection
        }).on('g:saved', function (session) {
            this.sessionCollection.add(session);
            this._gotoSession(session);
        }, this).render();
    },

    _editSession: function () {
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

    getEnabledPanelGroups: function () {
        if (!_.has(this.model.metadata(), 'layout')) {
            return this.layout.panelGroups;
        }

        return _.filter(this.layout.panelGroups, function (panelGroup) {
            return !(_.has(this.model.metadata().layout, panelGroup.id) &&
                     _.has(this.model.metadata().layout[panelGroup.id], 'disabled') &&
                     this.model.metadata().layout[panelGroup.id].disabled === true);
        }, this);
    },

    getEnabledPanelViews: function (panelGroup) {
        if (!_.has(this.model.metadata(), 'layout')) {
            return panelGroup.panelViews;
        }

        return _.filter(panelGroup.panelViews, function (panelView) {
            return !(_.has(this.model.metadata().layout, panelView.id) &&
                     _.has(this.model.metadata().layout[panelView.id], 'disabled') &&
                     this.model.metadata().layout[panelView.id].disabled === true);
        }, this);
    },

    getPanelGroup: function (id) {
        return _.find(this.layout.panelGroups, function (panelGroup) { // eslint-disable-line underscore/matches-shorthand
            return panelGroup.id === id;
        });
    },

    /**
     * Disables the panel by way of modifying the session json.
     */
    disablePanel: function (id) {
        this.model.addLayoutAttributes(id, {
            disabled: true
        });
    },

    initNewSession: function () {
        console.log("initNewSession");
        var session = new minerva.models.SessionModel();
        var fields = {
            name: 'New Session',
            folderId: settings.sessionCollection.folderId
        };
        //session.set(fields);
        session.on('g:saved', function () {
            console.log('new session saved');
            session.on('m:session_saved', function () {
                girder.events.trigger('m:SessionView_newSessionInited', session);//settings);
                //seconsole.log("created a new session");
                //settings.session = session;
                //girder.events.trigger('g:navigateTo', minerva.views.SessionView, settings);
            }).createSessionMetadata();
        }, this).off('g:error').on('g:error', function (err) {
            console.error(err);
        }, this).save();
    },

    _fetchAndInit: function (sessionId) {
        console.log("fetchAndInit");
        if (girder.currentUser) {
            var sessionCollection = new minerva.collections.SessionCollection();
            sessionCollection.once('g:changed', function () {
                var datasetsCollection = new minerva.collections.DatasetCollection();
                datasetsCollection.once('g:changed', function () {
                    var analysisCollection = new minerva.collections.AnalysisCollection();
                    analysisCollection.once('g:changed', function () {
                        var sourceCollection = new minerva.collections.SourceCollection();
                        sourceCollection.once('g:changed', function () {
                            var settings = {
                                sessionCollection: sessionCollection,
                                analysisCollection: analysisCollection,
                                datasetsCollection: datasetsCollection,
                                sourceCollection: sourceCollection
                            };
                            if (sessionId) {
                                var session = new minerva.models.SessionModel();
                                session.set({
                                    _id: sessionId
                                }).once('g:fetched', function () {
                                    settings.session = session;
                                    girder.events.trigger('g:navigateTo', minerva.views.SessionView, settings);
                                }, this).on('g:error', function () {
                                    console.error('This session could not be fetched');
                                    _createNewSession(settings);
                                }, this).fetch();
                            } else {
                                _createNewSession(settings);
                            }
                        }).fetch();
                    }).fetch();
                }).fetch();
            }).fetch();
        } else {
            girder.events.trigger('g:navigateTo', minerva.views.SessionView, {});
        }
    },

    initialize: function (settings) {
        console.log('initialize');
        girder.cancelRestRequests('fetch');

        girder.events.on('g:login', _fetchAndInit, this);
           //console.log('what is the route?');
         //= function (sessionId) {

                //this.render, this);
        /*function () {
            console.log('g:login event');
            this.render();
        }, this);
*/



        if (girder.currentUser) {
            this.model = settings.session;
            this.datasetsCollection = settings.datasetsCollection;
            this.analysisCollection = settings.analysisCollection;
            _.each(this.datasetsCollection.models, function (dataset) {
                if (this.model.datasetInFeatures(dataset)) {
                    dataset.set('displayed', true);
                }
            }, this);
            this.sourceCollection = settings.sourceCollection;
            this.sessionCollection = settings.sessionCollection;
            this.sessionCollection.on('g:changed', function () {
                this.render();
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
            this.listenTo(this.model, 'm:session_saved', function () {
                this._disableSave();
            });

            this.layout = {
                panelGroups: [
                    {
                        id: 'm-main-panel-group',
                        view: minerva.views.PanelGroup,
                        panelViews: [
                            {
                                id: 'm-map-panel',
                                view: minerva.views.MapPanel
                            }
                        ]
                    },
                    {
                        id: 'm-left-panel-group',
                        view: minerva.views.PanelGroup,
                        panelViews: [
                            {
                                id: 'm-analysis-panel',
                                view: minerva.views.AnalysisPanel
                            },
                            {
                                id: 'm-source-panel',
                                view: minerva.views.SourcePanel
                            },
                            {
                                id: 'm-data-panel',
                                view: minerva.views.DataPanel
                            },
                            {
                                id: 'm-layer-panel',
                                view: minerva.views.LayersPanel
                            },
                            {
                                id: 'm-jobs-panel',
                                view: minerva.views.JobsPanel
                            }
                        ]
                    }
                ]
            };
        }
        this.render();
    },

    render: function () {
        console.log('SessionView render');
        if (girder.currentUser) {
            // TODO different approach could be load the page
            // and adjust whatever is needed after access is loaded
            // just set some minimum default and let the page render
            var sessionsList = _.filter(this.sessionCollection.models, function (model) {
                return this.model.get('_id') !== model.get('_id');
            }, this);

            this.model.getAccessLevel(_.bind(function (accessLevel) {
                this.$el.html(minerva.templates.sessionPage({
                    session: this.model,
                    sessionsList: sessionsList,
                    accessLevel: accessLevel,
                    girder: girder
                }));

                // Render each panel group, which is responsible for rendering
                // each panel view
                girder.events.trigger('m:pre-render-panel-groups', this);
                _.each(this.getEnabledPanelGroups(), function (panelGroupSpec) {
                    var panelGroup = new panelGroupSpec.view({ // eslint-disable-line new-cap
                        parentView: this,
                        session: this.model,
                        panelViews: this.getEnabledPanelViews(panelGroupSpec)
                    });

                    this.$('#m-panel-groups').append('<div id="' + panelGroupSpec.id + '"></div>');
                    panelGroup.setElement(this.$('#' + panelGroupSpec.id)).render();
                }, this);

                // Restore state of collapsed panels
                if (_.has(this.model.metadata(), 'layout')) {
                    _.each(this.model.metadata().layout, function (panelView, panelViewId) {
                        if (_.has(panelView, 'collapsed') && panelView.collapsed === true) {
                            $('#' + panelViewId).find('i.icon-up-open').trigger('click');
                        }
                    }, this);
                }
            }, this));
        } else {
            console.log('no user');
            this.$('g-app-body-container').empty();
        }

        return this;
    }
});

//(function () {
    minerva.router.route('', 'index', function () {
        console.log("root route");
        girder.events.trigger('g:navigateTo', minerva.views.SessionView);//, settings);
        //_fetchAndInit();
    });

    minerva.router.route('session/:id', 'session', function (id) {
        console.log('session route');
        girder.events.trigger('g:navigateTo', minerva.views.SessionView);//, settings);
        //_fetchAndInit(id);
    });
//}());
