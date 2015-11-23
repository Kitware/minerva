/**
* This widget displays a form for adding a CSV file.
*/
minerva.views.AddCSVSourceWidget = minerva.View.extend({

    events: {
        'submit #m-add-csv-dataset-form': function (e) {
            e.preventDefault();
            this.getGeoJson(function (geojson) {
              var params = {
                  name: this.$('#m-csv-name').val(),
                  geojson: JSON.stringify(geojson) // send the uploaded file data
              };
              var csvSource = new minerva.models.CSVSourceModel({});
              csvSource.on('m:csvSourceReceived', function () {
                  this.$el.modal('hide');
                  // TODO: might need to be added to a new panel/data sources ?
                  console.log('source', csvSource);
                  this.collection.add(csvSource);
              }, this).createCSVDataset(params);
            }.bind(this));
        }
    },

    getGeoJson: function (callback) {
      $.ajax({
        url: "https://s3.amazonaws.com/epidemico/minerva_geojson.csv",
        type: 'GET',
        success: function (resp) {
          var json = this.parseCSVContent(resp);
          var geojson = this.jsonToGeojson(json);
          callback(geojson);
          // this.fileData = JSON.stringify(geojson);
          // this.set('geojson', geojson);
          // this.set('name', 'testing');
          // this.geoFileReader = 'jsonReader';
          // this.trigger('m:geoJsonDataLoaded', this.get('_id'));
          // this.trigger('m:dataLoaded', this.get('_id'));
          // this.trigger('m:csvDatasetReceived');
        }.bind(this)
      });
    },

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

    jsonToGeojson: function (json) {
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

      return geojson;

    },

    initialize: function (settings) {
        this.collection = settings.collection;
        this.title = 'Enter CSV Source details';
    },

    render: function () {
        var modal = this.$el.html(minerva.templates.addCSVSourceWidget({}));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
        return this;
    }

});
