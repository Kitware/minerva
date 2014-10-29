
(function () {
  var svg = null, renderer = null;

  function createChoropleth(myMap, featureLayer) {
    svg = featureLayer.canvas();
    renderer = featureLayer.renderer();

    window.app.loadCountryBorders(function (countries) {
        featureLayer.geoOn(geo.event.d3Rescale, function (arg) {
          svg.selectAll('.border')
            .style('stroke-width', 1/arg.scale);
        });

        function createChoroplethForTarget(target) {

          // find the country data for `target`
          var feature;
          countries.features.forEach(function (f) {
            if (f.properties.name === target) {
              feature = f;
            }
          });

          // draw the border
          var line = d3.geo.path().projection(function (c) {
            var d = renderer.worldToDisplay({
              x: c[0],
              y: c[1]
            });
            return [d.x, d.y];
          });

          svg.append('path')
            .datum(feature)
              .attr('d', line)
              .attr('class', 'border')
              .style('fill', 'yellow')
              .style('fill-opacity', 0.25);

        }

        var targets = ['Guinea', 'Liberia', 'Sierra Leone', 'Nigeria', 'Senegal'];
        targets.forEach(createChoroplethForTarget);
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
