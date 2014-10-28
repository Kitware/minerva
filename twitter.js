(function () {
  var tweetFeature = null,
      visdata = [],
      key = null,
      map, layer;

  tangelo.stream.start("example", function(d) { key = d; console.log(key);
    tangelo.stream.run(key, function(data) {
      data = JSON.parse(data);
      if (data && data.length !== 0) {
        Array.prototype.push.apply(visdata, data);
        if (tweetFeature) {
          tweetFeature.data(visdata);
          map.draw();
        }
      }
    });
  });

  function createTwitter(myMap, tweetLayer) {
    map = myMap;
    layer = tweetLayer;
    tweetFeature = tweetLayer.createFeature("point", {selectionAPI: true})
      .data(visdata)
      .position(function (d) {
        return {
          x: d.location.coordinates[1],
          y: d.location.coordinates[0],
          z: 0
        };
      })
      .geoOn(geo.event.pointFeature.mouseover, function (d) {
        $('#popup').css({
          top: d.mouse.page.y,
          left: d.mouse.page.x,
          position: "absolute",
          display: ""
        });
        $('#popup a').html(d.data.text);
      })
      .geoOn(geo.event.pointFeature.mouseout, function (d) {
        $('#popup').css({display: "none"});
      });

    map.draw();
  }

  function destroyTwitter() {
    if (tweetFeature) {
      layer.deleteFeature(tweetFeature);
      tweetFeature = null;
      map.draw();
    }
  }

  window.app.twitter = {
    create: createTwitter,
    destroy: destroyTwitter
  };
})();
