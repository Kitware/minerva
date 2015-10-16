/**
* This widget displays a form for adding an Postgres source.
*/
minerva.views.AddPostgresSourceWidget = minerva.View.extend({

    events: {
        'submit #m-add-postgres-source-form': function (e) {
            e.preventDefault();
            var params = {
                name:     this.$('#m-postgres-name').val(),
                baseURL:  this.$('#m-postgres-uri').val(),
                dbname:  this.$('#m-postgres-dbname').val(),
                username: this.$('#m-postgres-username').val(),
                password: this.$('#m-postgres-password').val()
            };
            var postgresSource = new minerva.models.PostgresSourceModel({});
            postgresSource.on('m:sourceReceived', function () {
                this.$el.modal('hide');
                this.collection.add(postgresSource);
            }, this).createSource(params);
        }
    },

    initialize: function (settings) {
        this.collection = settings.collection;
    },

    render: function () {
        var modal = this.$el.html(minerva.templates.addPostgresSourceWidget({}));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
        return this;
    }

});
