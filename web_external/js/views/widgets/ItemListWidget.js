
minerva.views.ItemListWidget = girder.views.ItemListWidget.extend({

    initialize: function () {
        girder.views.ItemListWidget.prototype.initialize.apply(this, arguments);
        this.selected = false;
    },

    cidFromId: function () {
        var selected_cid;

        if (this.collection.get(this.selected)) {
            selected_cid = this.collection.get(this.selected).cid;
        }

        return selected_cid;
    },

    render: function () {
        this.checked = [];

        this.$el.html(minerva.templates.itemList({
            items: this.collection.models,
            hasMore: this.collection.hasNextPage(),
            girder: girder,
            // the selected item may be in a different folder
            // this indicates if anything has been selected
            selected: this.selected,

            // this indicates the cid of the item that may or
            // may not be in the current folder
            cid: this.cidFromId(this.selected),

            checkboxes: this._checkboxes
        }));

        var view = this;
        this.$('.g-list-checkbox').change(function () {
            var cid = $(this).attr('g-item-cid');
            if (this.checked) {
                view.checked.push(cid);
            } else {
                var idx = view.checked.indexOf(cid);
                if (idx !== -1) {
                    view.checked.splice(idx, 1);
                }
            }
            view.trigger('g:checkboxesChanged');
        });
        return this;
    }


});
