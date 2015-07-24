/**
 * This widget is used to navigate the data hierarchy of folders and items.
 * With only readonly data. 
 */
minerva.views.ReadOnlyHierarchyWidget = girder.views.HierarchyWidget.extend({


    initialize: function (settings) {
        girder.views.HierarchyWidget.prototype.initialize.apply(this, arguments);

    },

    
    _fetchToRoot: function (folder) {
        var parentId = folder.get('parentId');
        var parentType = folder.get('parentCollection');
        var parent = new girder.models[girder.getModelClassByName(parentType)]();
        
        parent.set({
            _id: parentId
        }).on('g:fetched', function () {
            this.breadcrumbs.push(parent);

            if (parentType === 'folder' && parent.get("name") !== folder.get("minerva").bucket) {
                this._fetchToRoot(parent);
            } else {
                this.breadcrumbs.reverse();
                this.render();
            }
        }, this).fetch();
    },

        
    render: function () {
        this.folderCount = null;
        this.itemCount = null;

        this.$el.html(minerva.templates.readOnlyHierarchyWidget({
            type: this.parentModel.resourceName,
            model: this.parentModel,
            // force 'level'  to be READ
            level: girder.AccessType.READ,
            AccessType: girder.AccessType,
            showActions: this._showActions,
            checkboxes: this._checkboxes
        }));

        if (this.$('.g-folder-actions-menu>li>a').length === 0) {
            // Disable the actions button if actions list is empty
            this.$('.g-folder-actions-button').attr('disabled', 'disabled');
        }

        this.breadcrumbView.setElement(this.$('.g-hierarchy-breadcrumb-bar>ol')).render();
        this.checkedMenuWidget.dropdownToggle = this.$('.g-checked-actions-button');
        this.checkedMenuWidget.setElement(this.$('.g-checked-actions-menu')).render();
        this.folderListView.setElement(this.$('.g-folder-list-container')).render();

        if (this.parentModel.resourceName === 'folder' && this._showItems) {
            this.itemListView.setElement(this.$('.g-item-list-container')).render();
        }

        this.$('.g-folder-info-button,.g-folder-access-button,.g-select-all,' +
            '.g-upload-here-button,.g-checked-actions-button').tooltip({
                container: this.$el,
                animation: false,
                delay: {
                    show: 100
                }
            });
        this.$('.g-folder-actions-button,.g-hierarchy-level-up').tooltip({
            container: this.$el,
            placement: 'left',
            animation: false,
            delay: {
                show: 100
            }
        });

        return this;
    },

    /**
     * When any of the checkboxes is changed, this will be called to update
     * the checked menu state.
     */
    updateChecked: function () {
        var folders = this.folderListView.checked,
            items = [];

        var minFolderLevel = girder.AccessType.ADMIN;
        _.every(folders, function (cid) {
            var folder = this.folderListView.collection.get(cid);
            minFolderLevel = Math.min(minFolderLevel, folder.getAccessLevel());
            return minFolderLevel > girder.AccessType.READ; // acts as 'break'
        }, this);

        var minItemLevel = girder.AccessType.ADMIN;
        if (this.itemListView) {
            items = this.itemListView.checked;
            if (items.length) {
                minItemLevel = Math.min(minItemLevel, this.parentModel.getAccessLevel());
            }
        }

        // switch to use-selected button instead of item action dropdown
        if (folders.length + items.length) {
            this.parentView.$('.m-use-selected-button').removeClass('disabled');

            // DEMO - only allow one item to be selected for the demo
            this.parentView.$(".g-list-checkbox:not(:checked)").attr("disabled", true);
        } else {
            this.parentView.$('.m-use-selected-button').addClass('disabled', 'disabled');

            // DEMO - on uncheck allow any other checkbox to be checked
            this.parentView.$(".g-list-checkbox:not(:checked)").removeAttr("disabled");
        }

    }

    
});
