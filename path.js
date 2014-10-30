(function () {
  function createPathView(myMap, featureLayer) {
    window.app.util.load(function (myMap, featureLayer) {
    });
  }

  function destroyPathView() {
  }

  window.app.path = {
    create: createPathView,
    destroy: destroyPathView
  };
})();
