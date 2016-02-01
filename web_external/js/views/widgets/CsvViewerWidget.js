/**
 * This widget displays csv conents as a table
 */
minerva.views.CsvViewerWidget = minerva.View.extend({

  events: {
    'click .m-update-dataset': function (e) {
        e.preventDefault();
        // Let the end user specify the columns related to long and lat
        var longitude = $('#m-longitude option:selected').text();
        var latitude  = $('#m-latitude option:selected').text();
        this.longitudeIndex = _.indexOf(this.csv[0], longitude);
        this.latitudeIndex = _.indexOf(this.csv[0], latitude);
        // Create geojson
        this.createGeoJsonFromTabular(this.dataset);
    }
  },

  createGeoJsonFromTabular: function (dataset) {
    var minervaMeta = dataset.metadata();
    var originalType = minervaMeta.original_type;
    if (originalType !== 'csv' && originalType !== 'json') {
      console.error('You should only use this for csv or json');
      return;
    }
    if (!this.csv) {
      console.error('This dataset lacks csv data to create geojson on the client.');
      return;
    }
    var geoJsonData = {
      type: 'FeatureCollection',
      features: []
    };
    _.each(this.csv, function (row) {
      if ( Number(row[this.latitudeIndex]) && Number(row[this.longitudeIndex]) ) {
        var point = {
          type: 'Feature',
          // TODO need to get other property column, just hardcoding elevation for now
          properties: {elevation: Number(0)},
          geometry: {
            type: 'Point',
            coordinates: [Number(row[this.longitudeIndex]), Number(row[this.latitudeIndex])]
          }
        };
        geoJsonData.features.push(point);
      }
    }, this);
    var geoData = JSON.stringify(geoJsonData);
    // TODO: WIP
    console.log(geoData);
  },


  _parseCsv: function (data, headers) {
    var parsedCSV = Papa.parse(data, { skipEmptyLines: true, headers: headers, preview: this.rows });
    if (!parsedCSV || !parsedCSV.data) {
      console.error('error with parser');
      return;
    }
    return parsedCSV.data;
  },


  initialize: function (settings) {
    this.source      = settings.source;
    this.dataset     = settings.dataset;
    this.collection  = settings.collection;
    this.csv         = this._parseCsv(settings.data, true);
    this.data        = this._parseCsv(settings.data, false);
  },

  render: function () {

    this.colNames = _.map(this.data[0], function (name) {
      return { title: name };
    });

    var modal = this.$el.html(minerva.templates.csvViewerWidget({
      title     : this.title,
      source    : this.source,
      totalRows : this.totalRows,
      columns   : this.colNames
    })).girderModal(this).on('shown.bs.modal', function () {
    }).on('hidden.bs.modal', function () {
    }).on('ready.girder.modal', _.bind(function () {
      $('table#data').DataTable({
        data: this.data,
        columns: this.colNames,
        autoWidth: true,
        hover: true,
        ordering: true,
        pagingType: "full",
        dom: 'Bfrtip',
        buttons: [
          {
            extend: 'colvis',
            columns: ':not(:first-child)'
          }
        ]
      });
    }, this));

    modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

    return this;
  }

});
