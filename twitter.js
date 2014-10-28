(function () {
  function createTwitter(myMap, tweetLayer) {
    var key = null,
        tweetFeature = null,
        visdata = [];

    // Test streams
    tangelo.stream.start("example", function(d) {
      key = d;
      tangelo.stream.run(key, function(data) {
        data = JSON.parse(data);
        if (data && data.length !== 0) {
          visdata.push(data[0]);
          if (tweetFeature) {
            tweetLayer.deleteFeature(tweetFeature);
          }
          tweetFeature = tweetLayer.createFeature("point")
            .data(visdata)
            .geoOn(geo.event.pointFeature.mouseover, function (d) {
              $('#popup').css({
                top: d.mouse.page.y,
                left: d.mouse.page.x,
                position: "absolute",
                display: ""
              })
              $('#popup a').html(d.data.text);
            })
            .geoOn(geo.event.pointFeature.mouseout, function (d) {
              $('#popup').css({display: "none"});
            })
            .position(function (d) {
            return { x: d.location.coordinates[1],
                     y: d.location.coordinates[0],
                     z: 0
                   }
            });
          myMap.draw();
        }
      });
    });
  }

  function destroyTwitter() {
    if (key) {
      tangelo.stream.delete(key);
      key = null;
    }
    if (tweetFeature) {
      tweetLayer.deleteFeature(tweetFeature);
      tweetFeature = null;
    }
  }

  window.app.twitter = {
    create: createTwitter,
    destroy: destroyTwitter
  };
})();
