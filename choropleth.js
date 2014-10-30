
(function () {
  var svg = null, renderer = null;

  function createChoropleth(myMap, featureLayer) {
    svg = featureLayer.canvas();
    renderer = featureLayer.renderer();

    window.app.util.load(function () {
        var targets = ['Guinea', 'Liberia', 'Sierra Leone', 'Nigeria', 'Senegal'];
        var selection = app.util.drawBorders(targets, svg, renderer);

        selection.style('fill', 'yellow').style('fill-opacity', 0.5);
    });
  }

  function destroyChoropleth() {
    if (svg) {
      svg.selectAll('*').remove();
    }
  }

  window.app.choropleth = {
    create: createChoropleth,
    destroy: destroyChoropleth
  };
})();
