
function createMap() {
  var m = geo.map({
    node: '#map',
    zoom: 0,
    center: {x: 0, y: 0}
  });

  m.createLayer('osm');

  function resize() {
    m.resize(0, 0, m.node().width(), m.node().height());
  }
  $(window).resize(resize);

  resize();

  return {
    map: m,
    gl: m.createLayer('feature'),
    d3: m.createLayer('feature', {'renderer': 'd3Renderer'}),
    ui: m.createLayer('ui').createWidget('slider')
  };
}
