import _ from 'underscore';
import events from 'girder/events';
import { cancelRestRequests } from 'girder/rest';
import { getCurrentUser } from 'girder/auth';
import { confirm } from 'girder/dialog';
import { AccessType } from 'girder/constants';

import View from '../view';
import router from '../../router';
import EditBaseLayerWidget from '../widgets/EditBaseLayerWidget';
import EditSessionWidget from '../widgets/EditSessionWidget';
import SessionCollection from '../../collections/SessionCollection';
import PanelGroup from './PanelGroup';
import MapPanel from '../map/MapPanel';
import AnalysisPanel from './AnalysisPanel';
import DataPanel from './DataPanel';
import LayersPanel from './LayersPanel';
import JobsPanel from './JobsPanel';
import template from '../../templates/body/sessionPage.pug';
import '../../stylesheets/body/sessionPage.styl';
import '../../stylesheets/body/panelGroups.styl';

const SessionView = View.extend({
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
                this.editBaseLayerWidget = new EditBaseLayerWidget({
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
            confirm({
                text: 'Are you sure you want to delete <b>' + session.escape('name') + '</b>?',
                yestext: 'Delete',
                escapedHtml: true,
                confirmCallback: () => {
                    this.model.destroy({
                        progress: true
                    }).done(() => {
                        events.trigger('g:alert', {
                            icon: 'ok',
                            text: 'Session deleted.',
                            type: 'success',
                            timeout: 4000
                        });
                        router.navigate('/', { trigger: true });
                    });
                }
            });
        },
        'click a.m-session-link': function (event) {
            var cid = $(event.currentTarget).attr('m-session-cid');
            router.navigate('session/' + this.collection.get(cid).get('_id'), { trigger: true });
        }
    },

    initialize: function (settings) {
        cancelRestRequests('fetch');
        this.collection = new SessionCollection();
        if (getCurrentUser()) {
            this.collection.fetch();
        } else {
            this.render();
        }
        this.collection.on('g:changed', function () {
            this.render();
        }, this);
        this.model = settings.session;
        this.datasetCollection = settings.datasetCollection;
        this.analysisCollection = settings.analysisCollection;
        _.each(this.datasetCollection.models, function (dataset) {
            if (this.model.datasetInFeatures(dataset)) {
                dataset.set('displayed', true);
            }
        }, this);

        // listen for a change on a dataset being displayed
        // this should add or remove it from the current session
        this.listenTo(this.datasetCollection, 'change:displayed', function (dataset) {
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
                    view: PanelGroup,
                    panelViews: [
                        {
                            id: 'm-map-panel',
                            view: MapPanel
                        }
                    ]
                },
                {
                    id: 'm-left-panel-group',
                    view: PanelGroup,
                    panelViews: [
                        {
                            id: 'm-analysis-panel',
                            view: AnalysisPanel
                        },
                        {
                            id: 'm-data-panel',
                            view: DataPanel
                        },
                        {
                            id: 'm-layer-panel',
                            view: LayersPanel
                        },
                        {
                            id: 'm-jobs-panel',
                            view: JobsPanel
                        }
                    ]
                }
            ]
        };
    },

    _createNewSession: function () {
        new EditSessionWidget({
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
            this.editSessionWidget = new EditSessionWidget({
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
        router.navigate('session/' + session.id, {trigger: true});
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

    render: function () {
        // TODO different approach could be load the page
        // and adjust whatever is needed after access is loaded
        // just set some minimum default and let the page render
        var sessionsList = this.collection.filter(function (model) {
            return this.model.get('_id') !== model.get('_id');
        }, this);

        this.model.getAccessLevel(_.bind(function (accessLevel) {
            this.$el.html(template({
                session: this.model,
                sessionsList: sessionsList,
                accessLevel: accessLevel,
                AccessType: AccessType
            }));

            // Render each panel group, which is responsible for rendering
            // each panel view
            events.trigger('m:pre-render-panel-groups', this);
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
export default SessionView;
