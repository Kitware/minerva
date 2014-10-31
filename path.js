(function () {

  var currentTime = null;
  var playing = false;
  var transitioning = false;
  var transitionNext = false;

  // draw animation icons
  function loadIcons() {
    var body = d3.select('body');
    var buttonBox = body.append('div').attr('class', 'path-buttons').append('div');

    // don't let mousedown on button event propagate the map
    buttonBox.on('mousedown', function () {
      d3.event.stopPropagation();
    });

    buttonBox.append('div').attr('class', 'btn btn-default btn-lg path-first')
      .append('span').attr('class', 'glyphicon glyphicon-fast-backward');
    buttonBox.append('div').attr('class', 'btn btn-default btn-lg path-back')
      .append('div').attr('class', 'glyphicon glyphicon-step-backward');
    buttonBox.append('div').attr('class', 'btn btn-default btn-lg path-pause')
      .append('div').attr('class', 'glyphicon glyphicon-pause');
    buttonBox.append('div').attr('class', 'btn btn-default btn-lg path-play')
      .append('div').attr('class', 'glyphicon glyphicon-play');
    buttonBox.append('div').attr('class', 'btn btn-default btn-lg path-step')
      .append('div').attr('class', 'glyphicon glyphicon-step-forward');
    buttonBox.append('div').attr('class', 'btn btn-default btn-lg path-end')
      .append('div').attr('class', 'glyphicon glyphicon-fast-forward');

    // draw a date box
    body.append('div').attr('class', 'path-date');
  }

  // Data for when the outbreak spread to each country (estimated)
  // obtained from:
  //   http://en.wikipedia.org/wiki/Ebola_virus_epidemic_in_West_Africa
  // and references therein.
  var duration = 500;
  var data = [
    {
      date: new Date('January 1, 2014'),
      country: 'Guinea',
      link: 'http://www.who.int/csr/don/2014_03_23_ebola/en/',
      lon: -9.180,
      lat: 9.344,
      extent: {
        duration: duration,
        center: {x: -12.5, y: 8.4},
        zoom: 3.64
      }
    },
    {
      date: new Date('March 1, 2014'),
      country: 'Liberia',
      source: 'Guinea',
      link: 'http://www.who.int/csr/don/2014_03_27_ebola/en/',
      lon: -10.800,
      lat: 6.317,
      extent: {
        duration: 0,
        center: {x: -12.5, y: 8.4},
        zoom: 3.64
      }
    },
    {
      date: new Date('March 15, 2014'),
      country: 'Sierra Leone',
      source: 'Guinea',
      link: 'http://www.who.int/csr/don/2014_03_27_ebola/en/',
      lon: -13.234,
      lat: 8.484,
      extent: {
        duration: 0,
        center: {x: -12.5, y: 8.4},
        zoom: 3.64
      }
    },
    {
      date: new Date('July 20, 2014'),
      country: 'Nigeria',
      city: 'Lagos',
      link: 'http://www.who.int/csr/don/2014_07_27_ebola/en/',
      lon: 3.396,
      lat: 6.453,
      extent: {
        duration: duration,
        center: {x: -1.85, y: 7.8},
        zoom: 2.66
      }
    },
    {
      date: new Date('August 11, 2014'),
      country: 'Democratic Republic of Congo',
      city: 'Boende',
      link: 'http://www.who.int/csr/don/2014_08_27_ebola/en/',
      lon: 20.876,
      lat: -0.281,
      extent: {
        duration: duration,
        center: {x: -1.85, y: 7.8},
        zoom: 2.66
      }
    },
    {
      date: new Date('August 29, 2014'),
      country: 'Senegal',
      city: 'Dakar',
      source: 'Guinea',
      link: 'http://www.who.int/csr/don/2014_08_30_ebola/en/',
      lon: -17.447,
      lat: 14.693,
      extent: {
        duration: duration,
        center: {x: -1.85, y: 7.8},
        zoom: 2.66
      }
    },
    {
      date: new Date('September 30, 2014'),
      country: 'United States',
      city: 'Dallas',
      source: 'Liberia',
      link: 'http://www.nytimes.com/interactive/2014/10/01/us/retracing-the-steps-of-the-dallas-ebola-patient.html',
      lon: -96.797,
      lat: 32.776,
      extent: {
        duration: duration,
        center: {x: -1.85, y: 7.8},
        zoom: 2.66
      }
    },
    {
      date: new Date('October 6, 2014'),
      country: 'Spain',
      city: 'Madrid',
      source: 'Sierra Leone',
      link: 'http://www.bbc.com/news/world-europe-29516882',
      lon: -3.683,
      lat: 40.400,
      extent: {
        duration: duration,
        center: {x: -1.85, y: 7.8},
        zoom: 2.66
      }
    },
    {
      date: new Date('October 23, 2014'),
      country: 'United States',
      city: 'New York City',
      source: 'Guinea',
      link: 'http://www.nbcnews.com/storyline/ebola-virus-outbreak/new-york-doctor-just-back-africa-has-ebola-n232561',
      lon: -74.006,
      lat: 40.713,
      extent: {
        duration: duration,
        center: {x: -1.85, y: 7.8},
        zoom: 2.66,
      }
    },
    {
      date: new Date('October 23, 2014'),
      country: 'Mali',
      city: 'Kayes',
      source: 'Guinea',
      link: 'http://abcnews.go.com/Health/wireStory/threat-break-isolation-liberia-food-26399022',
      lon: -11.433,
      lat: 14.450,
      extent: {
        duration: duration,
        center: {x: -1.85, y: 7.8},
        zoom: 2.66
      }
    }
    // + medical evacuations: 
    // http://en.wikipedia.org/wiki/Ebola_virus_epidemic_in_West_Africa#Countries_with_medically_evacuated_cases
  ];

  // sort by date
  data = data.sort(function (a, b) {
    return d3.ascending(a.date.valueOf(), b.date.valueOf());
  });

  var color = d3.scale.category10().domain(data.map(function (d) { return d.country; }));
  var svg = null;
  var renderer = null;

  function createPathView(myMap, featureLayer) {
 
    function extentNorm(e) {
      var dx, dy, dz;
      dx = (myMap.center().x - e.center.x);
      dy = (myMap.center().y - e.center.y);
      dz = 10 * (myMap.zoom() - e.zoom);

      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    var _duration;
    loadIcons();
    window.myMap = myMap;
    svg = featureLayer.canvas();
    renderer = featureLayer.renderer();
    var borders = svg.append('g');

    function drawTime(t) {
      if (transitioning) {
        if (!transitionNext) {
          transitionNext = true;
          window.setTimeout(function () {
            transitionNext = false;
            drawTime(t, direction);
          }, 100);
        }
        return;
      }
      d3.select('.path-date').text(t.toDateString());
      var filtered = data.filter(function (d) { return d.date <= t; })
        .map(function (d) { return d.country; });

      var extent = $.extend({}, data[filtered.length - 1]).extent;

      _duration = 0;
      if (extentNorm(extent) > 1) {
        _duration = duration;
      }

      extent.duration = _duration;
      transitioning = true;
      myMap.transition(extent);

      window.setTimeout(function () {
        transitioning = false;
        var selection = app.util.drawBorders(filtered, borders, renderer);
        selection.style('fill', function (d) {
          return color(d.name);
        })
          .style('fill-opacity', 0.5);
      }, _duration * 1.1
      );
    }
    window.app.util.load(function () {
      // for times...
      var now = 0;
      drawTime(data[now].date, -1000);

      d3.select('.path-first').on('click', function () {
        if (now !== 0) {
          now = 0;
          drawTime(data[now].date, -1000);
        }
      });
      d3.select('.path-back').on('click', function () {
        now = (data.length + now - 1) % data.length;
        drawTime(data[now].date, -1);
      });
      d3.select('.path-pause').on('click', function () {
      });
      d3.select('.path-play').on('click', function () {
      });
      d3.select('.path-step').on('click', function () {
        now = (now + 1) % data.length;
        drawTime(data[now].date);
      });
      d3.select('.path-end').on('click', function () {
        if (now !== data.length - 1) {
          now = data.length - 1;
          drawTime(data[now].date);
        }
      });
    });
  }

  function destroyPathView() {
    if (svg) {
      svg.selectAll('*').remove();
    }
    d3.select('.path-buttons').remove();
    d3.select('.path-date').remove();
  }

  window.app.path = {
    create: createPathView,
    destroy: destroyPathView
  };
})();
