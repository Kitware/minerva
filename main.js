function main() {
  var mapOptions =
    {
      node: '#map',
      zoom : 0,
      center : [0.0, 0.0]
    }, myMap = null, layer = null;

    /// Resize the canvas to fill browser window dynamically
    window.addEventListener('resize', resizeCanvas, false);

    function updateAndDraw(width, height) {
      if (!myMap) {
        myMap = geo.map(mapOptions);
        layer = myMap.createLayer('osm');
      }
      myMap.resize(0, 0, width, height);
      myMap.draw();
    }

    function resizeCanvas() {
      $('#map').width('75%');
      $('#map').height('75%');
      updateAndDraw($('#map').width(), $('#map').height());
    }

    resizeCanvas();
  }
