minerva.views.SessionView = minerva.View.extend({

    events: {
        'click a.m-add-session': function () {
            this._createNewSession();
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
            minerva.router.navigate('session/' + this.collection.get(cid).get('_id'), {trigger: true});
        }
    },

    _createNewSession: function () {
        new minerva.views.EditSessionWidget({
            el: $('#g-dialog-container'),
            parentView: this,
            parentCollection: this.collection
        }).on('g:saved', function (session) {
            this.collection.add(session);
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

    initialize: function (settings) {
        girder.cancelRestRequests('fetch');
        this.collection = new minerva.collections.SessionCollection();
        if (girder.currentUser) {
            this.collection.fetch();
        } else {
            this.render();
        }
        this.model = settings.session;
        this.datasetsCollection = settings.datasetsCollection;
        this.analysisCollection = settings.analysisCollection;
        _.each(this.datasetsCollection.models, function (dataset) {
            if (this.model.datasetInFeatures(dataset)) {
                dataset.set('displayed', true);
            }
        }, this);
        this.sourceCollection = settings.sourceCollection;

        this.collection.on('g:changed', function () {
            // Look for a BSVE Reference source in Source Collection.
            // Create it if it doesn't exist.
            // Add all of its layers.
            var bsveReferenceSources = _.filter(this.sourceCollection.models, function (source) {
                return source.attributes.name == 'BSVE Reference';
            });
            if (bsveReferenceSources.length > 0) {
                var bsveRef = bsveReferenceSources[0];
                _.each(bsveRef.metadata().layers, function (layer) {
                    var found = _.find(this.datasetsCollection.models, function (dataset) {
                        return dataset.attributes.name === layer.layer_title;
                    }, this);
                    if (!found) {
                        var params = {
                            typeName: layer.layer_type,
                            name: layer.layer_title,
                            wfsSourceId: bsveRef.get('_id')
                        };
                        var wfsDataset = new minerva.models.WfsDatasetModel({});
                        wfsDataset.once('m:wfsDatasetAdded', function () {
                            this.$el.modal('hide');
                            this.datasetsCollection.add(wfsDataset);
                        }, this).createWfsDataset(params);
                    }
                }, this);
                this.render();
            } else {
                var params = {
                    name: 'BSVE Reference',
                    baseURL: 'https://api-dev.bsvecosystem.net'
                };
                var bsveRef = new minerva.models.WfsSourceModel({});
                bsveRef.on('m:sourceReceived', function () {
                    this.sourceCollection.add(bsveRef);
                    _.each(bsveRef.metadata().layers, function (layer) {
                        var found = _.find(this.datasetsCollection.models, function (dataset) {
                            return dataset.attributes.name === layer.layer_title;
                        }, this);
                        if (!found) {
                            var params = {
                                typeName: layer.layer_type,
                                name: layer.layer_title,
                                wfsSourceId: bsveRef.get('_id')
                            };
                            var wfsDataset = new minerva.models.WfsDatasetModel({});
                            wfsDataset.once('m:wfsDatasetAdded', function () {
                                this.$el.modal('hide');
                                this.datasetsCollection.add(wfsDataset);
                            }, this).createWfsDataset(params);
                        }
                    }, this);
                        this.render();
                }, this).createSource(params);
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
                            id: 'm-data-panel',
                            view: minerva.views.DataPanel
                        },
                        {
                            id: 'm-layer-panel',
                            view: minerva.views.LayersPanel
                        }
                    ]
                }
            ]
        };
    },

    render: function () {
        // TODO different approach could be load the page
        // and adjust whatever is needed after access is loaded
        // just set some minimum default and let the page render
        var sessionsList = _.filter(this.collection.models, function (model) {
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
    }).once('g:fetched', function () {
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
