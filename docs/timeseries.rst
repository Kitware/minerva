Time Series
===========

Data structure
--------------

The dataset should in JSON format, the root level should be a JSON array. It would contain an arbitrary number of frame objects. Each ``frame`` object should have two required properties, ``geojson`` and ``time``, and one optional ``label`` property.

The ``time`` property should have a value of ISO-8601 DateTime string to indicate the time for this frame. However, instead of the time property, the order in the JSON array defines the order of frames.

If the ``label`` property is specified, the value of it will be displayed on the layer control under *Current Display*, otherwise, the value of the ``time`` property will be displayed.

The ``geojson`` property should have a value of a valid GeoJSON object, e.g. Point, Polygon, Feature, or FeatureCollection. If GeoJSON Feature has been used, styles defined inside the properties object will be used to style the geometry.

An example minimal Time Series dataset contains one frame and one styled GeoJSON feature point looks like below

.. code-block:: json

  [
    {
      "geojson": {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [
            -118.87264913546323,
            36.69629877019643
          ]
        },
        "properties": {
          "annotationType": "point",
          "strokeWidth": 3,
          "name": "Camp",
          "fillColor": "#00ff00",
          "annotationId": 2,
          "strokeOpacity": 1,
          "scaled": false,
          "stroke": true,
          "radius": 10,
          "fillOpacity": 0.25,
          "strokeColor": "#000000",
          "fill": true
        }
      },
      "time": "2017-02-24T15:07:14.188798Z"
    }
  ]

Frame controls
--------------------

Once a Time Series dataset has been uploaded. It can be added as a layer to the layers panel. In addition to standard layer controls, Time Series layer has a special set of controls. There will be a frame slider, a play button, a stop button, a previous frame button, a next frame button, and a ``duration`` selection.

Sliding the Frame slider will make different frames of the Time Series visible. Only the selected frame will be visible on the map.

Clicking the play button will start to animate each frame in the dataset. At this moment, each frame will get the equal visible time. The time that each frame will be visible equals the ``duration`` divided by the total number of frames.

When the Time Series is being animated, a pause button will be available to pause the animation. Clicking the stop button will set the selected frame to the first frame in the Time Series.

Clicking the previous frame button will set the frame to the previous frame of the currently selected frame. If not available, the last frame will be used.
Clicking the next frame button will set the frame to the next frame of the currently selected frame. If not available, the first frame will be used.

Changing the ``duration`` with the duration selection will change the time it will take the whole series to animate from the first frame to the last frame.


