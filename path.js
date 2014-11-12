(function () {

  // a simple icon shape on a 500x500 canvas
  var airplaneIcn = {
        path: 'M250.2,59.002c11.001,0,20.176,9.165,20.176,20.777v122.24l171.12,95.954v42.779l-171.12-49.501v89.227l40.337,29.946v35.446l-60.52-20.18-60.502,20.166v-35.45l40.341-29.946v-89.227l-171.14,49.51v-42.779l171.14-95.954v-122.24c0-11.612,9.15-20.777,20.16-20.777z',
        rigid: false,
        translate: [-250.0, -250.0],
        scale: 0.08},
      virusIcn = {
        path: 'm 28.428,23.16 c 0.182,-0.803 0.318,-1.638 0.414,-2.496 1.83,0.766 2.896,1.711 3.211,2.652 C 32.191,23.735 32.582,24 33,24 c 0.105,0 0.211,-0.017 0.316,-0.052 0.523,-0.174 0.807,-0.74 0.633,-1.265 C 33.369,20.942 31.623,19.555 28.98,18.582 28.986,18.388 29,18.197 29,18 c 0,-0.198 -0.014,-0.388 -0.02,-0.583 2.643,-0.973 4.389,-2.36 4.969,-4.101 0.174,-0.524 -0.109,-1.091 -0.633,-1.265 -0.529,-0.174 -1.09,0.109 -1.264,0.632 -0.314,0.942 -1.381,1.887 -3.211,2.653 C 28.745,14.476 28.609,13.642 28.427,12.84 31.832,10.453 34,6.931 34,3 34,2.447 33.553,2 33,2 32.447,2 32,2.447 32,3 32,6.048 30.412,8.811 27.852,10.805 26.07,5.547 22.377,2 18,2 13.625,2 9.932,5.547 8.148,10.805 5.59,8.812 4,6.048 4,3 4,2.447 3.553,2 3,2 2.447,2 2,2.447 2,3 2,6.931 4.168,10.453 7.574,12.84 7.391,13.642 7.254,14.476 7.158,15.336 5.328,14.57 4.264,13.625 3.949,12.683 3.775,12.16 3.211,11.877 2.684,12.051 2.16,12.225 1.877,12.792 2.053,13.316 2.633,15.057 4.379,16.444 7.02,17.417 7.016,17.612 7,17.802 7,18 c 0,0.197 0.016,0.388 0.02,0.583 -2.641,0.973 -4.387,2.359 -4.967,4.101 -0.176,0.524 0.107,1.091 0.631,1.265 0.527,0.176 1.091,-0.108 1.265,-0.632 0.315,-0.941 1.379,-1.887 3.209,-2.652 0.096,0.858 0.233,1.693 0.416,2.496 C 4.168,25.547 2,29.068 2,33 2,33.553 2.447,34 3,34 3.553,34 4,33.553 4,33 4,29.951 5.59,27.188 8.148,25.194 9.932,30.453 13.625,34 18,34 22.377,34 26.07,30.453 27.852,25.194 30.412,27.188 32,29.951 32,33 c 0,0.553 0.447,1 1,1 0.553,0 1,-0.447 1,-1 0,-3.932 -2.168,-7.453 -5.572,-9.84 M 11.303,8.673 C 11.676,8.025 12.086,7.433 12.529,6.903 12.602,6.816 12.676,6.73 12.75,6.647 12.867,6.515 12.984,6.384 13.107,6.261 13.228,6.138 13.352,6.025 13.477,5.912 13.625,5.777 13.773,5.649 13.928,5.528 14.072,5.414 14.217,5.302 14.365,5.2 14.461,5.133 14.559,5.072 14.654,5.01 14.82,4.907 14.988,4.812 15.158,4.724 15.234,4.685 15.307,4.642 15.383,4.606 15.627,4.491 15.873,4.392 16.125,4.309 16.193,4.287 16.264,4.269 16.334,4.25 16.535,4.19 16.738,4.142 16.943,4.104 17.021,4.09 17.1,4.075 17.18,4.064 17.449,4.026 17.723,4 18,4 c 0.277,0 0.551,0.026 0.822,0.064 0.078,0.011 0.156,0.026 0.234,0.04 0.205,0.038 0.408,0.086 0.609,0.145 0.07,0.02 0.141,0.038 0.211,0.06 0.25,0.083 0.498,0.182 0.738,0.296 0.08,0.037 0.156,0.082 0.232,0.122 0.168,0.087 0.332,0.18 0.494,0.281 0.1,0.063 0.199,0.126 0.297,0.194 0.145,0.099 0.285,0.208 0.426,0.319 0.164,0.129 0.322,0.266 0.48,0.41 0.117,0.107 0.232,0.212 0.346,0.327 0.125,0.125 0.244,0.259 0.365,0.394 0.07,0.08 0.141,0.162 0.211,0.246 0.447,0.533 0.859,1.129 1.234,1.78 0.014,0.024 0.027,0.046 0.041,0.07 0.131,0.232 0.25,0.482 0.371,0.727 C 23.547,12.587 20.895,14.5 18,14.5 15.115,14.5 12.453,12.583 10.889,9.473 11.01,9.23 11.127,8.981 11.258,8.75 11.273,8.724 11.289,8.699 11.303,8.673 m 5.031,23.077 c -0.07,-0.02 -0.141,-0.037 -0.209,-0.06 -0.252,-0.083 -0.498,-0.183 -0.742,-0.297 -0.076,-0.036 -0.149,-0.079 -0.225,-0.118 -0.17,-0.088 -0.338,-0.183 -0.504,-0.286 -0.095,-0.062 -0.193,-0.123 -0.289,-0.19 -0.148,-0.102 -0.293,-0.213 -0.437,-0.327 -0.155,-0.121 -0.303,-0.249 -0.451,-0.384 -0.125,-0.113 -0.249,-0.227 -0.37,-0.35 -0.123,-0.123 -0.24,-0.254 -0.357,-0.386 -0.074,-0.083 -0.148,-0.169 -0.221,-0.256 -0.443,-0.53 -0.853,-1.122 -1.226,-1.771 C 11.289,27.3 11.273,27.274 11.258,27.249 10.414,25.764 9.768,24.005 9.389,22.061 9.367,21.955 9.354,21.843 9.334,21.736 9.123,20.545 9,19.296 9,18 9,16.704 9.123,15.455 9.334,14.263 9.354,14.156 9.367,14.045 9.389,13.938 9.617,12.76 9.955,11.663 10.365,10.64 11.945,13.335 14.35,15.06 17,15.414 V 31.905 C 16.982,31.901 16.963,31.898 16.943,31.895 16.738,31.857 16.535,31.81 16.334,31.75 M 26.666,21.736 c -0.018,0.107 -0.033,0.219 -0.053,0.325 -0.379,1.945 -1.027,3.704 -1.871,5.19 -0.014,0.023 -0.027,0.046 -0.041,0.069 -0.375,0.651 -0.787,1.247 -1.234,1.78 -0.07,0.084 -0.141,0.166 -0.211,0.246 -0.121,0.135 -0.24,0.269 -0.365,0.394 -0.113,0.115 -0.229,0.221 -0.346,0.327 -0.158,0.145 -0.316,0.281 -0.48,0.41 -0.141,0.111 -0.281,0.22 -0.426,0.319 -0.098,0.067 -0.197,0.131 -0.297,0.193 -0.162,0.102 -0.326,0.194 -0.494,0.281 -0.076,0.04 -0.152,0.085 -0.232,0.122 -0.24,0.113 -0.488,0.213 -0.738,0.296 -0.07,0.022 -0.141,0.04 -0.211,0.061 -0.201,0.059 -0.404,0.106 -0.609,0.145 -0.018,0.003 -0.037,0.006 -0.057,0.01 V 15.426 c 2.658,-0.351 5.055,-2.086 6.635,-4.785 0.41,1.022 0.748,2.12 0.979,3.297 0.02,0.107 0.035,0.218 0.053,0.325 C 26.879,15.455 27,16.704 27,18 c 0,1.296 -0.121,2.545 -0.334,3.736',
        rigid: true,
        translate: [-18, -18],
        scale: 0.05};

  function createIcon(icn, node, ang) {
    var group = node.append('g').classed('path-icon', true);

    ang = ang || 0;
    ang = 180 - ang * 180 / Math.PI;
    group.append('g')
        .attr('transform', 'rotate(' + ang + ')')
      .append('path')
        .attr('d', icn.path)
        .attr('transform', 'scale('+icn.scale+') translate('+icn.translate[0]+','+icn.translate[1]+')');

    return group;
  }

  var currentTime = null;
  var playing = false;
  var animating = false;
  var transitioning = false;
  var transitionNext = false;
  var now, nData, drawTime;

  function createTimeline(data) {
    var scl, dates, axis, timeline_bar;

    dates = data.map(function (d) { return d.date; });
    scl = d3.time.scale()
      .domain([new Date('November 15, 2013'), new Date('November 15, 2014')])
      .range([10, $('.path-timeline-svg').width() - 10]);

    timeline_bar = d3.select('.path-timeline-svg').append('rect')
      .attr('width', 0)
      .attr('height', 10)
      .attr('x', 5)
      .attr('y', 5)
      .attr('rx', 10)
      .attr('ry', 10)
      .style({
        'fill': 'yellow',
        'stroke': 'none',
      });

    d3.select('.path-timeline-svg').append('rect')
      .attr('width', Number($('.path-timeline-svg').width()) - 10)
      .attr('height', 10)
      .attr('x', 5)
      .attr('y', 5)
      .attr('rx', 10)
      .attr('ry', 10)
      .style({
        'fill': 'white',
        'stroke-width': 2,
        'stroke': 'black',
        'fill-opacity': 1e-6
      });

    axis = d3.svg.axis()
      .scale(scl)
      .orient('bottom');

    d3.select('.path-timeline-svg')
      .append('g')
        .attr('class', 'axis')
        .attr('transform', 'translate(0, 15)')
        .call(axis);

    var showDescription = {};

    d3.select('body').selectAll('.path-description-container').data(data).enter()
      .append('div')
        .attr('class', 'path-description-container')
      .each(function (d) {
        var delta, x, w, off;

        w = $('body').width();
        x = scl(d.date) - 120;
        off = Math.max(10, Math.min(w - 160, x));
        delta = x - off;

        console.log(delta);
        var desc= d3.select(this).append('div')
          .attr('class', 'path-description')
          .style('left', off + 'px')
          .style('transform-origin', (150 + delta) + 'px bottom')
          .html(function (d) { return d.description; });

        showDescription[d.date] = function () {
          d3.selectAll('.path-description-container')
            .classed('active', false);
          d3.select(desc.node().parentElement)
            .classed('active', true);
        };

        d3.select(this).append('div')
          .attr('class', 'path-icon')
          .on('click', function () {
            if (playing) {
              return;
            }
            showDescription[d.date]();
            drawTime(d.date);
            d3.event.stopPropagation();
          })
          .style('left', (scl(d.date) + 30) + 'px')
          .append('span')
          .attr('class', 'glyphicon glyphicon-comment');
      })
      .on('mouseover', function (d) {
        d3.selectAll('path.border').each(function (e) {
          if (e.name === d.country ||
              (d.country === 'United States (no match)' &&
               e.name === 'United States')
            ) {
            d3.select(this).classed('hovered', true);
          }
        });
      })
      .on('mouseout', function (d) {
        d3.selectAll('path.border').each(function (e) {
          if (e.name === d.country ||
              (d.country === 'United States (no match)' &&
               e.name === 'United States')
            ) {
            d3.select(this).classed('hovered', false);
          }
        });
      });

    return function (d) {
      timeline_bar.transition()
        .duration(500)
        .attr('width', scl(d));
      showDescription[d]();
    };
  }

  // draw animation icons
  function loadIcons() {
    var body = d3.select('body');
    var buttonBox = body.append('div').attr('class', 'path-buttons').append('div');

    // don't let mousedown on button event propagate the map
    buttonBox.on('mousedown', function () {
      d3.event.stopPropagation();
    });

    buttonBox.append('div').attr('class', 'btn btn-default btn-lg path-play')
      .append('div').attr('class', 'glyphicon glyphicon-play');

    // draw a date box
    //body.append('div').attr('class', 'path-date');

    // draw an info box
    /*
    body.append('div').attr('class', 'path-description')
      .on('click', function () {
        d3.event.stopPropagation();
      });
    */

    // draw a legend box
    body.append('div')
        .attr('class', 'path-legend')
        .style('pointer-events', 'none');


    // draw a timeline
    body.append('div')
        .attr('class', 'path-timeline')
      .append('svg')
        .attr('class', 'path-timeline-svg')
        .attr('width', '100%')
        .attr('height', '100%');
  }

  // Data for when the outbreak spread to each country (estimated)
  // obtained from:
  //   http://en.wikipedia.org/wiki/Ebola_virus_epidemic_in_West_Africa
  // and references therein.
  var duration = 1000;
  var data = [
    {
      date: new Date('December 6, 2013'),
      country: 'Guinea',
      link: 'http://edition.cnn.com/2014/10/28/health/ebola-patient-zero/index.html',
      lon: -9.180,
      lat: 9.344,
      icon: virusIcn,
      extent: {
        duration: duration,
        center: {x: -12.5, y: 8.4},
        zoom: 3.64
      },
      description: [
        'The ongoing Ebola outbreak in West Africa is believed to have ',
        '<a href="http://edition.cnn.com/2014/10/28/health/ebola-patient-zero/index.html" ',
        'target="path">started</a> ',
        'on December 6, 2013, in southern Guinea when a 2-year-old boy died of ',
        'the disease.  A short time later, several members of his family, as ',
        'well as the doctor treating him, also fell ill.'
      ].join('')
    },
    {
      date: new Date('March 1, 2014'),
      country: 'Liberia',
      source: 'Guinea',
      link: 'http://www.who.int/csr/don/2014_03_27_ebola/en/',
      lon: -10.800,
      lat: 6.317,
      icon: virusIcn,
      extent: {
        duration: 0,
        center: {x: -12.5, y: 8.4},
        zoom: 3.64
      },
      description: [
        'By late April of 2014, the outbreak had spread into Liberia from ',
        'Guinea.  A ',
        '<a href="http://www.who.int/csr/don/2014_03_27_ebola/en/" ',
        'target="path">WHO report</a> on March 1st stated that the outbreak ',
        'in Guinea had increased to 103 including 66 deaths.'
      ].join('')
    },
    {
      date: new Date('May 15, 2014'),
      country: 'Sierra Leone',
      source: 'Guinea',
      link: 'http://www.who.int/csr/don/2014_03_27_ebola/en/',
      lon: -13.234,
      lat: 8.484,
      icon: virusIcn,
      extent: {
        duration: 0,
        center: {x: -12.5, y: 8.4},
        zoom: 3.64
      },
      description: [
        'Around the same time, the WHO reported that the epidemic had also ',
        'spread into Sierra Leone; however, the government of Sierra Leone  ',
        '<a href="http://news.sl/drwebsite/publish/article_200525069.shtml" ',
        'target="path">reported</a> no cases had yet been found.  By late May, ',
        'the outbreak in Sierra Leone was confirmed when ',
        '<a href="http://www.reuters.com/article/2014/05/26/us-ebola-leone-idUSKBN0E614G20140526" ',
        'target="path">5 deaths</a> were reported.'
      ].join('')
    },
    {
      date: new Date('July 20, 2014'),
      country: 'Nigeria',
      city: 'Lagos',
      source: 'Liberia',
      link: 'http://www.who.int/csr/don/2014_07_27_ebola/en/',
      lon: 3.396,
      lat: 6.453,
      icon: airplaneIcn,
      extent: {
        duration: duration,
        center: {x: -1.85, y: 7.8},
        zoom: 2.66
      },
      description: [
        'On <a href="http://www.who.int/csr/don/2014_07_27_ebola/en/" target="path">July 20th',
        '</a>, an infected man flew from Liberia to Lagos, Nigeria, ',
        'and died a few days later.  By September 22nd, the ',
        '<a href="http://apps.who.int/iris/bitstream/10665/134449/1/roadmapupdate22sept14_eng.pdf" ',
        'target="path">WHO reported</a> 20 confirmed cases in Nigeria.'
      ].join('')
    },
    {
      date: new Date('August 11, 2014'),
      country: "Dem. Rep. Congo",
      city: 'Boende',
      link: 'http://www.who.int/csr/don/2014_08_27_ebola/en/',
      lon: 20.876,
      lat: -0.281,
      icon: virusIcn,
      extent: {
        duration: duration,
        center: {x: 6.23, y: 1.02},
        zoom: 2.18
      },
      description: [
        'The WHO reported that on <a href="http://www.who.int/csr/don/2014_08_27_ebola/en/" target="path">',
        'August 11, 2014,</a> a woman in the Democratic Republic of Congo had died of Ebola.  It ',
        'is believed that she had contracted the illness from an animal, and it was unrelated to the ',
        'outbreak in Guinea.'
      ].join('')
    },
    {
      date: new Date('August 29, 2014'),
      country: 'Senegal',
      city: 'Dakar',
      source: 'Guinea',
      link: 'http://www.who.int/csr/don/2014_08_30_ebola/en/',
      lon: -17.447,
      lat: 14.693,
      icon: virusIcn,
      extent: {
        duration: duration,
        center: {x: -11.6, y: 9.89},
        zoom: 3.53
      },
      description: [
        'On <a src="http://www.who.int/csr/don/2014_08_30_ebola/en/" target="path">',
        'August 29th</a>, a resident of Guinea arrived in Dakar, Senegal.  Several ',
        'days later, he began showing signs of Ebola and sought medical care.  The ',
        'man eventually recovered and no further incidents have occured.'
      ].join('')
    },
    {
      date: new Date('September 22, 2014'),
      country: 'Spain',
      city: 'Madrid',
      source: 'Sierra Leone',
      link: 'http://www.bbc.com/news/world-europe-29516882',
      lon: -3.683,
      lat: 40.400,
      icon: airplaneIcn,
      extent: {
        duration: duration,
        center: {x: -43.5, y: 26.4},
        zoom: 0.435
      },
      description: [
        'In <a href="http://www.bbc.com/news/world-europe-29516882" target="path">',
        'September 2014</a>, a spanish missionary who had been evacuated from Sierra ',
        'Leone died in a Madrid hospital.  A nurse who had treated him was confirmed ',
        'to have contracted the disease on October 7.'
      ].join('')
    },
    {
      date: new Date('October 2, 2014'),
      country: 'United States',
      city: 'Dallas',
      source: 'Liberia',
      link: 'http://www.nytimes.com/interactive/2014/10/01/us/retracing-the-steps-of-the-dallas-ebola-patient.html',
      lon: -96.797,
      lat: 32.776,
      icon: airplaneIcn,
      extent: {
        duration: duration,
        center: {x: -43.5, y: 26.4},
        zoom: 0.435
      },
      description: [
        'On <a href="http://www.nytimes.com/interactive/2014/10/01/us/retracing-the-steps-of-the-dallas-ebola-patient.html" target="path">',
        'September 19, 2014,</a> a man arrived in Dallas from Monrovia, Liberia.  His initial screening prior to bording the ',
        'flight showed no signs of illness.  On September 24, he fell ill and sought care at a nearby ',
        'hospital, but was sent home.  After his conditioned worsened, he returned to the hospital several ',
        'days later.  On September 30th, blood tests confirmed that he had contracted Ebola.'
      ].join('')
    },
    {
      date: new Date('October 20, 2014'),
      country: 'United States (no match)',
      city: 'New York City',
      source: 'Guinea',
      link: 'http://www.nbcnews.com/storyline/ebola-virus-outbreak/new-york-doctor-just-back-africa-has-ebola-n232561',
      lon: -74.006,
      lat: 40.713,
      icon: airplaneIcn,
      extent: {
        duration: duration,
        center: {x: -43.5, y: 26.4},
        zoom: 0.435
      },
      description: [
        'On <a href="http://www.nbcnews.com/storyline/ebola-virus-outbreak/new-york-doctor-just-back-africa-has-ebola-n232561" ',
        'target="path">October 23,</a>, a doctor from Doctors without Borders tested positive for Ebola in ',
        'New York City after returning from Guinea several days prior.'
      ].join('')
    },
    {
      date: new Date('October 28, 2014'),
      country: 'Mali',
      city: 'Kayes',
      source: 'Guinea',
      link: 'http://abcnews.go.com/Health/wireStory/threat-break-isolation-liberia-food-26399022',
      lon: -11.433,
      lat: 14.450,
      icon: virusIcn,
      extent: {
        duration: duration,
        center: {x: -4.72, y: 14.56},
        zoom: 2.66
      },
      description: [
        'On <a href="http://abcnews.go.com/Health/wireStory/threat-break-isolation-liberia-food-26399022" ',
        'target="path">October 23</a> an official from Mali confirmed that a 2-year-old girl from Guinea ',
        'had tested positive for Ebola in the Malian town of Keyes.'
      ].join('')
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

      return Math.sqrt((dx * dx + dy * dy) * Math.pow(2, myMap.zoom()) + dz * dz);
    }

    var _duration;
    loadIcons();

    // create the legend
    var legend = d3.select('.path-legend').append('table');
    data.forEach(function (d) {
      var row;
      if (!d.country.match(/no match/)) {
        row = legend.append('tr');
        row.append('td').append('div').attr('class', 'path-legend-color').style('background-color', color(d.country));
        row.append('td').append('div').attr('class', 'path-levend-label').text(d.country);
      }
    });

    window.myMap = myMap;
    svg = featureLayer.canvas();
    renderer = featureLayer.renderer();
    var borders = svg.append('g');

    var tbar = createTimeline(data);

    drawTime = function (t) {
      if (transitioning) {
        if (!transitionNext) {
          transitionNext = true;
          window.setTimeout(function () {
            transitionNext = false;
            drawTime(t);
          }, 100);
        }
        return;
      }

      tbar(t);
      d3.selectAll('.trail').remove();
      d3.selectAll('.path-icon').remove();
      //d3.select('.path-date').text(t.toDateString());
      //d3.select('.path-description').style('display', 'none');
      var filtered = data.filter(function (d) { return d.date <= t; })
        .map(function (d) { return d.country; });

      now = filtered.length - 1;
      var extent = $.extend({}, data[filtered.length - 1]).extent;

      _duration = 0;
      if (extentNorm(extent) > 1) {
        _duration = duration;
      }

      data.forEach(function (d, j) {
        var i = filtered.indexOf(d.country);
        if (d.trail && (i < 0 || j === filtered.length - 1)) {
          d.trail.remove();
        }
        /*
        if (j === filtered.length - 1 && data[j].description) {
          d3.select('.path-description').style('display', null)
            .html(data[j].description);
        }
        */
      });
      //d3.selectAll('line.trail').style('stroke-opacity', 0.5);

      extent.duration = _duration;
      extent.interp = d3.interpolateZoom;
      transitioning = true;
      if (_duration > 0) {
        d3.select('.path-buttons').selectAll('.btn').classed('disabled', true);
        myMap.transition(extent);
      }

      window.setTimeout(function () {

        modifyButtonState(now, nData);
        transitioning = false;
        var selection = app.util.drawBorders(filtered, borders, renderer, true);
        selection
          .style('fill', function (d) {
            return color(d.name);
          })
          .style('stroke-opacity', function (d) {
            if (d.name === filtered[filtered.length - 1]) {
              return 1e-6;
            } else {
              return null;
            }
          })
          .style('fill-opacity', function (d) {
            if (d.name === filtered[filtered.length - 1]) {
              return 1e-6;
            } else {
              return null;
            }
          });

        var current = data[filtered.length - 1];
        var sourceName = current.source;
        var source, interp;
        var pt0, pt1, pt2, pathIcon, trail, t_saved = 0;

        trail = svg.append('line')
          .attr('class', 'trail')
          .attr('stroke', d3.rgb(color(sourceName)).darker())
          .style('stroke-linecap', 'round')
          .style('stroke-opacity', 1);

        function getTransform(t) {
          var scl = renderer.scaleFactor();
          var pt, origin;
          var angle;
          if (t !== undefined) {
            t_saved = t;
            pt0 = interp(t);
          }
          pt = renderer.worldToDisplay({
            x: pt0[0],
            y: pt0[1]
          });
          origin = renderer.worldToDisplay({
            x: pt1[0],
            y: pt1[1]
          });
          trail.attr('x1', origin.x)
            .attr('y1', origin.y)
            .attr('x2', pt.x)
            .attr('y2', pt.y)
            .style('stroke-width', 5/scl);

          if (!current.icon.rigid) {
            return 'translate(' + pt.x + ',' + pt.y + ') scale(' + (1 - 4 * t_saved * (t_saved - 1))/scl + ')';
          } else {
            return 'translate(' + pt.x + ',' + pt.y + ')';
          }
        }

        function scalePathIcon() {
          pathIcon.attr(
            'transform',
            getTransform()
          );
        }

        if (sourceName) {

          data.forEach(function (d) {
            if (d.country === sourceName) {
              source = d;
            }
          });
          pt1 = [source.lon, source.lat];
          pt2 = [current.lon, current.lat];
          pt0 = pt1.slice();
          interp = d3.interpolate(pt1, pt2);

          var v0, v1;
          v0 = renderer.worldToDisplay({
            x: pt1[0],
            y: pt1[1]
          });
          v1 = renderer.worldToDisplay({
            x: pt2[0],
            y: pt2[1]
          });
          angle = Math.atan2(v1.x - v0.x, v1.y - v0.y);
          pathIcon = createIcon(current.icon, svg, angle);
          scalePathIcon();

          pathIcon.transition()
            .duration(3000)
            .attrTween('transform', function () { return getTransform; })
            .each('end', function () {
              svg.selectAll('path.border').style('fill-opacity', null).style('stroke-opacity', null);
            }).remove();
          featureLayer.geoOn(geo.event.d3Rescale, scalePathIcon);

        } else {
          trail.remove();
          svg.selectAll('path.border').style('fill-opacity', null).style('stroke-opacity', null);
        }

      }, _duration * 1.1
      );
    };

    function modifyButtonState(i, n) {
      if (playing) {
        d3.selectAll('.path-buttons .btn').classed({'disabled': true});
        d3.select('.path-play').classed({
          'btn-success': false,
          'btn-danger': true,
          'disabled': false
        })
        .select('div').classed({
          'glyphicon-play': false,
          'glyphicon-pause': true
        });
      } else {
        d3.selectAll('.path-buttons .btn').classed({'disabled': false});
        d3.select('.path-play').classed({
          'btn-success': true,
          'btn-danger': false
        })
        .select('div').classed({
          'glyphicon-play': true,
          'glyphicon-pause': false
        });
      }
      if (i <= 0) {
        d3.select('.path-first').classed({'disabled': true});
        d3.select('.path-back').classed({'disabled': true});
      } else if (i >= n - 1) {
        d3.select('.path-end').classed({'disabled': true});
        d3.select('.path-step').classed({'disabled': true});
      }
    }

    window.app.util.load(function () {
      // for times...
      now = 0;
      nData = data.length;
      var n = nData;
      drawTime(data[now].date);

      function run() {
        if (playing) {
          if (now < n - 1) {
            now = now + 1;
            modifyButtonState(now, n);
            drawTime(data[now].date);
            window.setTimeout(run, 5000);
          } else {
            playing = false;
          }
        }
        modifyButtonState(now, n);
      }

      d3.select('.path-first').on('click', function () {
        if (now !== 0) {
          now = 0;
          modifyButtonState(now, n);
          drawTime(data[now].date);
        }
      });
      d3.select('.path-back').on('click', function () {
        now -= 1;
        modifyButtonState(now, n);
        drawTime(data[now].date);
      });
      d3.select('.path-play').on('click', function () {
        playing = !playing;
        modifyButtonState(now, n);
        run();
      });
      d3.select('.path-step').on('click', function () {
        now += 1;
        modifyButtonState(now, n);
        drawTime(data[now].date);
      });
      d3.select('.path-end').on('click', function () {
        if (now !== data.length - 1) {
          now = data.length - 1;
          modifyButtonState(now, n);
          drawTime(data[now].date);
        }
      });
      modifyButtonState(now, n);
    });
  }

  function destroyPathView() {
    if (svg) {
      svg.selectAll('*').remove();
    }
    d3.selectAll('.path-buttons').remove();
    //d3.selectAll('.path-date').remove();
    d3.selectAll('.path-icon').remove();
    d3.selectAll('.path-description-container').remove();
    d3.selectAll('.path-legend').remove();
    d3.selectAll('.path-timeline').remove();
    transitioning = false;
    playing = false;
    transitionNext = false;
  }

  window.app.path = {
    create: createPathView,
    destroy: destroyPathView
  };
})();
