(function () {
  var tweetFeature = null,
      visdata = [],
      key = null,
      map, layer, paused = 1, currTime = null,
      deltaTime = null;

  function updateTweets(data) {
    if (data) {
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }
      if (data && data.length !== 0) {
        Array.prototype.push.apply(visdata, data);
        if (tweetFeature) {
          currTime = new Date().getTime();
          tweetFeature.data(visdata);
          map.draw();
        }
      }
    }
    return !paused;
  }

  function startStream() {
    if (key === null) {
      // wait for key to load
      window.setTimeout(startStream, 1000);
      return;
    }
    tangelo.stream.run(key, updateTweets);
  }

  $(function () {
    d3.select('#twitter').classed('disabled', true);
    if (window.tangelo) {
      tangelo.stream.start("minerva", function(d) {
        key = d;
        console.log(key);
        if (key) {
          startStream();
          d3.select('#twitter').classed('disabled', false);
        }
      });
    }
  });

  function createTwitter(myMap, tweetLayer) {
    var nMouseOver = 0;

    // auto start on first call
    if (paused === 1) {
      paused = false;
      startStream();
    }

    // Add a pause button
    d3.select('body')
      .append('div')
        .attr('class', 'twitter-pause-container')
      .append('div')
        .attr('class', 'btn btn-default twitter-pause')
        .classed('btn-danger', !paused)
        .classed('btn-success', paused)
        .text(paused ? 'start' : 'stop')
        .on('click', function () {
          paused = !paused;
          if (paused) {
            d3.select(this).text('start')
              .classed('btn-danger', false)
              .classed('btn-success', true);
          } else {
            d3.select(this).text('stop')
              .classed('btn-danger', true)
              .classed('btn-success', false);
          }
          startStream();
        });

    map = myMap;
    layer = tweetLayer;
    tweetFeature = tweetLayer.createFeature("point", {selectionAPI: true})
      .data(visdata)
      .style('radius', function(d) {
        if (d.retweeted) {
          if (d.retweet_cont > 0) {
            return Math.min(10.0 * Math.log2(d.retweet_cont), 1000.0);
          }
          return 10.0;
        }
        return 5.0;
      })
      .style('fillColor', function(d) {
        // Time delta in seconds
        deltaTime = (currTime - d.timestamp_ms) / 1000.0;
        if (deltaTime > 60) {
          return { r: 128/255, g: 128/255, b: 128/255 }
        }
        return { r: 36/255, g: 74/255, b: 162/255 }
      })
      .style('strokeColor', function(d) {
        // Time delta in seconds
        deltaTime = (currTime - d.timestamp_ms) / 1000.0;
        if (deltaTime > 60) {
          return { r: 100/255, g: 100/255, b: 100/255 };
        }
        return { r: 255/255, g: 180/255, b: 115/255 };
      })
      .position(function (d) {
        return {
          x: d.location.coordinates[1],
          y: d.location.coordinates[0],
          z: 0
        };
      })
      .geoOn(geo.event.pointFeature.mouseover, function (d) {
        nMouseOver += 1;
        $('#popup').css({
          top: d.mouse.page.y,
          left: d.mouse.page.x,
          position: "absolute",
          visibility: "visible",
          opacity: 0.8
        });

        var linode = '<div id=tweet' + d.index + '></div>';
        $('#popup').append(linode);

        twttr.widgets.createTweet(
          d.data.id,
          document.getElementById('tweet'+d.index), {
            theme: 'dark'
          }
        );
      })
      .geoOn(geo.event.pointFeature.mouseout, function (d) {
        nMouseOver -= 1;
        $('#popup #tweet' + d.index).remove();
        if (nMouseOver === 0) {
          $('#popup').css({opacity: 0, visibility: "hidden"});
        }
      });

    map.draw();
  }

  function destroyTwitter() {
    if (tweetFeature) {
      layer.deleteFeature(tweetFeature);
      tweetFeature = null;
      map.draw();
    }
    d3.select('.twitter-pause').remove();
  }

  window.app.twitter = {
    create: createTwitter,
    destroy: destroyTwitter
  };
})();
