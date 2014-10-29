(function () {
  var tweetFeature = null,
      visdata = [],
      key = null,
      map, layer;

  tangelo.stream.start("minerva", function(d) { key = d; console.log(key);
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
    var nMouseOver = 0;
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
        nMouseOver += 1;
        $('#popup').css({
          top: d.mouse.page.y,
          left: d.mouse.page.x,
          position: "absolute",
          visibility: "visible",
          opacity: 0.8
        });
        var linode = '<li id=tweet' + d.index + '></li>';
        var anode = '<a href="#fixme" target="twitter">' + '</a>';
        $('#popup ul').append(linode).find('#tweet' + d.index).append(anode).find('a').text(d.data.text);
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
  }

  window.app.twitter = {
    create: createTwitter,
    destroy: destroyTwitter
  };
})();
