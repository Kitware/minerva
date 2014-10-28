
(function () {
  var countries, svg = null, renderer = null;

  // start getting the country border data
  d3.json('countries.topo.json', function (error, data) {
    if (error) {
      console.log(error);
      countries = null;
      return;
    }

    countries = topojson.feature(data, data.objects.countries);
  });

  function createChoropleth(myMap, featureLayer) {
    svg = featureLayer.canvas();
    renderer = featureLayer.renderer();

    if (countries === undefined) {
      window.setTimeout(function () {
        createChoropleth(myMap, featureLayer);
      },
        100
      );
      return;
    } else if (countries === null) {
      console.log('Could not load country data');
      return;
    }

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

      featureLayer.geoOn(geo.event.d3Rescale, function (arg) {
        // TODO need to unbind on exit
        svg.selectAll('.border')
          .style('stroke-width', 1/arg.scale);
      });
    }

    var targets = ['Guinea', 'Liberia', 'Sierra Leone', 'Nigeria', 'Senegal'];
    targets.forEach(createChoroplethForTarget);
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
