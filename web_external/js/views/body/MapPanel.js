minerva.views.MapPanel = minerva.View.extend({

    initialize: function () {
        console.log('mappanel init');//
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

        /*reader = geo.createFileReader('jsonReader', {layer: layer});
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
        });*/
    },

    render: function () {
        this.$el.html(minerva.templates.mapPanel());
        this.renderMap();
        return this;
    }
});
