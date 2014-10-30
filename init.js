var app = {};

(function () {
  var countries;

  // start getting the country border data
  d3.json('countries.topo.json', function (error, data) {
    if (error) {
      console.log(error);
      countries = null;
      return;
    }

    countries = topojson.feature(data, data.objects.countries);
  });


  // Load the border dataset and call callback when done
  var loadCountryBorders = function (callback) {
    if (countries === undefined) {
      window.setTimeout(function () {
        loadCountryBorders(callback);
      }, 100);
      return;
    }

    // This function is not exposed until after the data is loaded.
    if (countries) {
      window.app.util.drawBorders = drawBorders;
    }

    callback({
      countries: countries
    });
  };

  // Draw a list of countries into the context, svg,
  // returning a d3 selection of paths.
  var drawBorders = function (countryList, svg, renderer) {
    if (!Array.isArray(countryList)) {
      countryList = [countryList];
    }
    var line = d3.geo.path().projection(function (c) {
      var d = renderer.worldToDisplay({
        x: c[0],
        y: c[1],
        z: 0
      });
      return [d.x, d.y];
    });

    var selectedCountries = countries.features.filter(function (c) {
      return countryList.indexOf(c.properties.name) >= 0;
    });

    var width = 1;// The stroke width can't be set from css...

    var selection = svg.selectAll('path')
      .data(selectedCountries)
      .enter()
        .append('path')
          .attr('d', line)
          .classed('border', true)
          .style('stroke-width', width);

    renderer.layer().geoOn(geo.event.d3Rescale, function (arg) {
      arg = arg || {};
      arg.scale = arg.scale || 1;
      selection.style('stroke-width', width/arg.scale);
    });
    return selection;
  };

  window.app.util = {
    load: loadCountryBorders
  };

})();
