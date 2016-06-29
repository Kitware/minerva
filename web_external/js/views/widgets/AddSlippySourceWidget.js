/**
* This widget displays a form for adding a slippy source.
*/
minerva.views.AddSlippySourceWidget = minerva.View.extend({

    events: {
        'submit #m-add-slippy-source-form': function (e) {
            e.preventDefault();
            var params = {
                name: this.$('#m-slippy-name').val(),
                baseURL: this.$('#m-slippy-uri').val(),
            };
            var slippySource = new minerva.models.SlippySourceModel({});
            slippySource.on('m:sourceReceived', function () {
                this.$el.modal('hide');
                // TODO: might need to be added to a new panel/data sources ?
                this.collection.add(slippySource);
            }, this).createSource(params);
        }
    },

    initialize: function (settings) {
        this.collection = settings.collection;
        this.title = 'Enter Slippy Source details';
    },

    render: function () {
        var modal = this.$el.html(minerva.templates.addSlippySourceWidget({}));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
        return this;
    }
});
