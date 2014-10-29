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

  window.app.loadCountryBorders = function (callback) {
    if (countries === undefined) {
      window.setTimeout(function () {
        window.app.loadCountryBorders(callback);
      }, 100);
      return;
    }
    callback(countries);
  };

})();
