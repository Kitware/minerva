(function () {
  function createTwitter(myMap, tweetLayer) {
    var tweetFeature = null,
        visdata = [];
      
    // Test streams
    var key = null;
    tangelo.stream.start("example", function(d) { key = d; console.log(key);
      tangelo.stream.run(key, function(data) {
        data = eval(data);
        if (data && data.length !== 0) {
          visdata.push(data[0]);
          if (tweetFeature) {
            tweetFeature.clear();
            tweetLayer.deleteFeature(tweetFeature);
          }
          tweetFeature = tweetLayer.createFeature("point")
            .data(visdata)
            .position(function (d) {
              return {
                x: d.coordinates[1],
                y: d.coordinates[0],
                z: 0
              };
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
      tweetFeature.clear();
      tweetLayer.deleteFeature(tweetFeature);
      tweetFeature = null;
    }
  }

  window.app.twitter = {
    create: createTwitter,
    destroy: destroyTwitter
  };
})();
