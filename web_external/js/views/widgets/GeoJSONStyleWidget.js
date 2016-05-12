minerva.views.GeoJSONStyleWidget = minerva.View.extend({
    initialize: function () {

        var props = {
            county: {
                values: {
                    'a': 2,
                    'b': 1
                }
            },
            count: {
                min: 0,
                max: 75
            }
        };

        this.collection = new minerva.collections.GeoJSONStyle([{
            name: 'radius',
            type: 'number',
            value: 5,
            scale: 'constant',
            summary: props
        }, {
            name: 'strokeWidth',
            type: 'number',
            value: 0,
            scale: 'continuous',
            key: 'count',
            summary: props
        }, {
            name: 'strokeColor',
            type: 'color',
            scale: 'continuous',
            key: 'count',
            ramp: 'Accent',
            summary: props
        }, {
            name: 'fillColor',
            type: 'color',
            value: '#ff0000',
            scale: 'constant',
            summary: props
        }]);
        window.collection = this.collection;

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
