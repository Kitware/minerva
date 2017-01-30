minerva.views.ListPostgresLayersWidget = minerva.View.extend({
    getAssetstoreId: function (name) {
        // Gets assetstore id from assetstore name
        return girder.restRequest({
            path: '/assetstore',
            type: 'GET',
            data: {limit: 50, offset: 0, sort: 'name', sortdir: 1},
            error: null
        }).then(function (resp) {
            var dbAssetstore = _.filter(resp, function (assetstore) {
                return assetstore['name'] === name;
            });
            console.log(dbAssetstore[0]['_id'])
            return dbAssetstore[0]['_id'];
        });

    },
    getMinervaDatasetFolderId: function (userId) {
        return girder.restRequest({
            path: '/minerva_dataset/folder',
            type: 'GET',
            data: {userId: userId},
            error: null
        }).then(function (resp) {
            console.log(resp['folder']['_id'])
            return resp['folder']['_id'];
        });
    },
    importGeojson: function (assetstoreId, parentId) {
        var limit = this.$('#m-num-features').val();
        var layer = this.$('#g-postgres-layer-list').val().split(':');
        var layerName = layer[1];
        var path = '/database_assetstore/' + assetstoreId + '/import';
        girder.restRequest({
            path: path,
            type: 'PUT',
            data: {
                table: layerName,
                sort: '',
                fields: "[{'func': 'ST_AsGeoJSON', 'param': [{'func': 'st_transform', 'param': [{'field': 'geom'}, 4326]}]}]",
                filters: '',
                limit: limit,
                format: 'geojson',
                parentType: 'folder',
                parentId: parentId,
                progress:true
            },
            error: null
        });
    },
    events: {
        'submit #m-add-postgres-layers-form': function (e) {
            var userId = girder.currentUser.get('_id');
            var layer = this.$('#g-postgres-layer-list').val().split(':');
            var database = layer[0];
            var that = this;
            e.preventDefault();
            $.when(
                this.getAssetstoreId(database),
                this.getMinervaDatasetFolderId(userId)
            ).then(function(assetstoreId, parentId){
                that.importGeojson(assetstoreId, parentId);
            });
        }
    },
    render: function (layerArray) {
        var modal = this.$el.html(minerva.templates.listPostgresLayersWidget({
            layerArray: layerArray})).girderModal(this);
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
        return this;
    }
});
