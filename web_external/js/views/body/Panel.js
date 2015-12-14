minerva.views.Panel = minerva.View.extend({
    /**
     * The panel view isn't meant to be instantiated on it's own.
     **/
    events: {
        'click .icon-cancel': 'removePanel',
        'show.bs.collapse': 'expandPanel',
        'hide.bs.collapse': 'collapsePanel'
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
        if (confirm('Are you sure you want to remove this panel?')) {
            this.getSessionView().disablePanel(this.el.id);
            this.getSessionView()._enableSave();
            this.remove();
            minerva.View.prototype.remove.call(this);
        }
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
