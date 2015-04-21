minerva.views.DataPanel = minerva.View.extend({

    initialize: function () {
        console.log('datapanel init');//
    },

    render: function () {
        this.$el.html(minerva.templates.dataPanel({}));

        // TODO use a modal uploader

/**        new minerva.views.UploadShapefileView({
            el: this.$('.loadData'),
            parentView: this
        }).render();*/

        // get the list of available datasets
        girder.restRequest({
            path: 'user/' + girder.currentUser.get('_id') + '/minervadatasets',
            type: 'GET'
        }).done(_.bind(function (resp) {
            console.log(resp);
            //TODO attach as li to ul.datasets
        }, this)).error(_.bind(function (err) {
            console.error('error getting minervadatasets');
            console.error(err);
            girder.events.trigger('g:alert', {
                icon: 'cancel',
                text: 'Could not get minerva datasets.',
                type: 'error',
                timeout: 4000
            });
        }, this));



        return this;
    }
});


