minerva.models.CSVSourceModel = minerva.models.SourceModel.extend({

    createCSVDataset: function (params) {
        girder.restRequest({
            path: '/minerva_source_csv',
            type: 'POST',
            data: params,
            error: null // ignore default error behavior (validation may fail)
        }).done(_.bind(function (resp) {
            console.log(resp);
            this.set(resp);
            this.trigger('m:csvSourceReceived');
        }, this)).error(_.bind(function (err) {
            this.trigger('m:error', err);
        }, this));
        return this;
    }

});

// TODO: GEOJSON SAMPLE
// { "type": "FeatureCollection",
//     "features": [
//       { "type": "Feature",
//         "geometry": {"type": "Point", "coordinates": [102.0, 0.5]},
//         "properties": {"prop0": "value0"}
//         },
//       { "type": "Feature",
//         "geometry": {
//           "type": "LineString",
//           "coordinates": [
//             [102.0, 0.0], [103.0, 1.0], [104.0, 0.0], [105.0, 1.0]
//             ]
//           },
//         "properties": {
//           "prop0": "value0",
//           "prop1": 0.0
//           }
//         },
//       { "type": "Feature",
//          "geometry": {
//            "type": "Polygon",
//            "coordinates": [
//              [ [100.0, 0.0], [101.0, 0.0], [101.0, 1.0],
//                [100.0, 1.0], [100.0, 0.0] ]
//              ]
//          },
//          "properties": {
//            "prop0": "value0",
//            "prop1": {"this": "that"}
//            }
//          }
//        ]
//      }
