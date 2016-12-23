/**
* This widget displays a form for adding a Postgresql database source.
 */
minerva.views.AddPostgresWidget = minerva.View.extend({

    addPostgresAssetstore: function (e, error, params) {
        var assetstore = new girder.views.NewAssetstoreWidget();
        // construct the uri here
        var uri = 'postgresql://' + params.username +
                ':' + params.password + '@' + params.server +
                ':' + params.port + '/' + params.dbname;
        assetstore.createAssetstore(e,
                                    error,
                                    {type: girder.AssetstoreType.DATABASE,
                                     name: params.dbname,
                                     dbtype: params.dbtype,
                                     dburi: uri});
    },
    events: {
        'submit #m-add-postgres-db-form': function (e) {
            var params = {
                username: this.$('#m-db-username').val(),
                password: this.$('#m-db-password').val(),
                server: this.$('#m-db-server').val(),
                port: this.$('#m-db-port').val(),
                dbname: this.$('#m-db-name').val(),
                dbtype: 'sqlalchemy_postgres'
            };
            this.addPostgresAssetstore(e, this.$('#m-add-postgres-db-error'), params);
        }
    },
    render: function () {
        var modal = this.$el.html(minerva.templates.addPostgresWidget({})).girderModal(this);
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
        return this;
    }
});
