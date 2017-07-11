import View from '../view';
import Panel from '../body/Panel';
import { confirm } from 'girder/dialog';

const MinervaPanel = View.extend({
    /**
     * The panel view isn't meant to be instantiated on its own.
     **/
    events: {
        'click .m-remove-panel': 'removePanel',
        'show.bs.collapse': 'expandPanel',
        'hide.bs.collapse': 'collapsePanel'
    },

    initialize: function () {
        _.extend(this.events, Panel.prototype.events);
    },

    getSessionView: function () {
        return this.parentView.parentView;
    },

    getSessionModel: function () {
        return this.getSessionView().model;
    },

    /**
     * Upon confirmation, physically removes the DOM element while
     * storing the change in the session attributes. This also
     * enables the save button.
     **/
    removePanel: function () {
        confirm({
            text: 'Are you sure you want to remove this panel?',
            confirmCallback: _.bind(function () {
                this.getSessionView().disablePanel(this.el.id);
                this.getSessionView()._enableSave();
                this.remove();
                View.prototype.remove.call(this);
            }, this)
        });
    },

    /**
     * Handles the aftermath of a panel being expanded. Meaning it changes the
     * expand/collapse icon, marks the state of the panel in the session attributes,
     * and enables the user to save the change.
     **/
    expandPanel: function (e) {
        $(e.currentTarget).find('i.icon-down-open').attr('class', 'icon-up-open');
        this.getSessionModel().addLayoutAttributes(this.el.id, {
            collapsed: false
        });
        this.getSessionView()._enableSave();
    },

    collapsePanel: function (e) {
        $(e.currentTarget).find('i.icon-up-open').attr('class', 'icon-down-open');
        this.getSessionModel().addLayoutAttributes(this.el.id, {
            collapsed: true
        });
        this.getSessionView()._enableSave();
    }
});
export default MinervaPanel;
