minerva.views.FrontPageView = girder.views.FrontPageView.extend({

    initialize: function () {
        girder.cancelRestRequests('fetch');
        this.render();
    },

    renderMap: function () {
        var map,
            layer,
            reader,
            data;

        map = geo.map({
            node: '#m-map',
            center: { x: -125, y: 36.5}
        });
        map.createLayer('osm');

        layer = map.createLayer('feature');
        map.draw();

        //
        reader = geo.createFileReader('jsonReader', {'layer': layer});
        // read a geojson file from a hardcoded server path
        $.ajax({
            url: 'http://localhost:8083/api/v1/file/552ecb6c0640fd0c790abb98/download',
            contentType: 'application/json',
            success: function (_data) {
                data = _data;
                console.log('success');
                console.log(data);
            },
            complete: function () {
                console.log('complete');
                layer.clear();
                reader.read(data, function() { map.draw(); });
            }
        });
    },

    render: function () {
        this.$el.addClass('m-body-nopad');

        this.$el.html(minerva.templates.frontPage({
            apiRoot: girder.apiRoot,
            staticRoot: girder.staticRoot,
            currentUser: girder.currentUser,
            versionInfo: girder.versionInfo
        }));

        this.renderMap();

        return this;
    }
});

minerva.router.route('', 'index', function () {
    girder.events.trigger('g:navigateTo', minerva.views.FrontPageView);
});
