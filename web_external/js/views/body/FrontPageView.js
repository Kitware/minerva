minerva.views.FrontPageView = girder.views.FrontPageView.extend({

    initialize: function () {
        girder.cancelRestRequests('fetch');
        girder.events.on('m:renderMap', this.renderMap);
        this.render();
    },

    renderMap: function (geojsonFile) {
        var map,
            layer,
            reader,
            data;

        map = geo.map({
            node: '.m-map',
            center: { x: -125, y: 36.5}
        });
        map.createLayer('osm');

        layer = map.createLayer('feature');
        map.draw();

        reader = geo.createFileReader('jsonReader', {layer: layer});
        // load a geojson file on top of the map
        $.ajax({
            url: girder.apiRoot + '/file/' + geojsonFile._id + '/download',
            contentType: 'application/json',
            success: function (_data) {
                data = _data;
            },
            complete: function () {
                layer.clear();
                reader.read(data, function () { map.draw(); });
            }
        });
    },

    render: function () {
        this.$el.html(minerva.templates.frontPage({
            apiRoot: girder.apiRoot,
            staticRoot: girder.staticRoot,
            currentUser: girder.currentUser,
            versionInfo: girder.versionInfo
        }));

        new minerva.views.UploadShapefileView({
            el: this.$('.m-upload-shapefile'),
            parentView: this
        }).render();

        return this;
    }
});

minerva.router.route('', 'index', function () {
    girder.events.trigger('g:navigateTo', minerva.views.FrontPageView);
});
