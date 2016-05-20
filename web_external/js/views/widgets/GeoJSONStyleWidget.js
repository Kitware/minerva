minerva.views.GeoJSONStyleWidget = minerva.View.extend({
    initialize: function () {
        this.collection = this.collection || new minerva.collections.GeoJSONStyle();

        this.listenTo(this.collection, 'add', this.addOne);
        this.listenTo(this.collection, 'reset', this.render);
        this.listenTo(this.collection, 'remove', this.removeElement);
    },
    render: function (evt) {
        if (evt && evt.norender) {
            return;
        }

        this.addAll();
        return this;
    },

    /**
     * Add a style element to the widget.
     */
    addOne: function (model) {
        var view = new minerva.views.GeoJSONStyleElement({
            model: model,
            parentView: this
        });
        this.$el.append(view.render().el);
    },

    /**
     * Reset the view and add all style elements from the collection to the widget.
     */
    addAll: function () {
        this.$el.empty();
        this.collection.each(this.addOne, this);
    },

    /**
     * Remove the style element from the widget.
     */
    removeElement: function (model) {
        model.destroy();
    }
});
