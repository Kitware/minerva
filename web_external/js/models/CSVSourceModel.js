minerva.models.CSVSourceModel = minerva.models.SourceModel.extend({

    parseCSVContent: function (data) {
      var dataWithLines = '';
      var dataArray = data.split(',');
      var counter = 0;
      for (var k = 0; k < dataArray.length;  k++) {
        counter++;
        if (counter === 17) {
          dataWithLines += dataArray[k] + '/';
          counter = 0;
        } else {
          dataWithLines += dataArray[k] + ',';
        }

      }
      var lines = dataWithLines.split("/");
      var colNames = lines[0].split(",");
      var records = [];
      for(var i = 1; i < lines.length; i++) {
        var record = {};
        var bits = lines[i].split(",");
        for (var j = 0 ; j < bits.length ; j++) {
          record[colNames[j]] = bits[j];
        }
        records.push(record);
      }
      return records;
    },

    convertJSONToGEOJSON: function (json) {
      var geojson = {};

      geojson.type = "FeatureCollection";
      geojson.features = [];

      json.forEach(function (object) {
        geojson.features.push({
          "type": "Feature",
           "geometry": { "type": "Point",
                         "coordinates": [
                                          parseInt(object.point_longitude),
                                          parseInt(object.point_latitude)
                                        ]
                        },
           "properties": object
        });
      });

      console.log(geojson);

    },

    createSource: function (params) {
        $.ajax({
          url: "https://s3.amazonaws.com/epidemico/FL_insurance_sample.csv",
          type: 'GET',
          success: function (resp) {
            var json = this.parseCSVContent(resp);
            var geojson = this.convertJSONToGEOJSON(json);
            this.set(geojson);
            this.trigger('m:csvSourceReceived');
          }.bind(this)
        });
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
