/**
* This widget displays a form for adding a Postgresql database source.
 */
minerva.views.AddPostgresWidget = minerva.View.extend({
    events: {
        'submit #m-add-postgres-db-form': function (e) {
            e.preventDefault();
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
    addPostgresAssetstore: function (e, error, params) {
        var that = this;
        e.preventDefault();
        var assetstore = new girder.views.NewAssetstoreWidget({
            parentView: that
        });
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
        assetstore.on('g:created', function (astore) {
            var _id = astore.id;
            girder.restRequest({
                path: '/database_assetstore' + '/' + _id + '/' + 'geo_tables',
                type: 'GET'
            }).done(function (data) {
                var geoList = _.map(data, function (prop) {
                    return prop['f_table_catalog'] + ':' +
                        prop['f_table_name'] + ':' +
                        prop['type'];
                });
                that.$el.girderModal('close');
                var listPostgresLayersWidget = new minerva.views.ListPostgresLayersWidget({
                    el: $('#g-dialog-container'),
                    parentView: that
                });

                listPostgresLayersWidget.render(geoList);
            });
        });

    },
    render: function () {
        var modal = this.$el.html(minerva.templates.addPostgresWidget({})).girderModal(this);
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
        return this;
    }
});
