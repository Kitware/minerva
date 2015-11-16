/**
* This widget displays a form for adding a CSV file.
*/
minerva.views.AddCSVSourceWidget = minerva.View.extend({

    events: {
        'submit #m-add-csv-dataset-form': function (e) {
            e.preventDefault();
            var params = {

            };
            var csvSource = new minerva.models.CSVSourceModel({});
            csvSource.on('m:csvSourceReceived', function () {
                this.$el.modal('hide');
                // TODO: might need to be added to a new panel/data sources ?
                console.log('source', csvSource);
                // this.collection.add(csvSource);
            }, this).createSource(params);
        }
    },

    initialize: function (settings) {
        this.collection = settings.collection;
        this.title = 'Enter CSV Source details';
    },

    render: function () {
        var modal = this.$el.html(minerva.templates.addCSVSourceWidget({}));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
        return this;
    }

});
