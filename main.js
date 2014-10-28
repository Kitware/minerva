
function main() {

  var mapObj = createMap(),
      currentState = null;

  // map state object, defines how to create/destroy features for each vis type
  var states = {
    twitter: {
      layer: mapObj.gl,
      visObj: window.app.twitter
    },
    choropleth: {
      layer: mapObj.d3,
      visObj: window.app.choropleth
    },
    unknown: { // Used for unimplemented components
      layer: null,
      visObj: {
        create: function () {},
        destroy: function () {}
      }
    }
  };

  // main update function
  function updateState(id) {
    id = typeof id === 'string' ? id : $(this).attr('id');
    if (!states.hasOwnProperty(id)) {
      id = 'unknown';
    }
    if (id !== currentState) {
      if (currentState) {
        states[currentState].visObj.destroy();
      }
      currentState = id;
      states[currentState].visObj.create(mapObj.map, states[currentState].layer);
    }
  }

  // Initialize
  updateState($('.app-map-buttons button.active').attr('id'));

  // attach to buttons
  $('.app-map-buttons button').click(updateState);
}
