/**
* This widget displays csv conents as a table
*/
minerva.views.CsvViewerWidget = minerva.View.extend({

  events: {
      'click .m-add-source-button': function (e) {
          e.preventDefault();
          var parsedCSV = Papa.parse(this.csvData, { skipEmptyLines: true });
          if (!parsedCSV || !parsedCSV.data) {
              console.error('This dataset lacks csv data to create geojson on the client.');
              return;
          }
          var params = {
            name: this.title,
            csvData: JSON.stringify(parsedCSV.data)
          }
          var csvSource = new minerva.models.CsvSourceModel({});
          csvSource.on('m:csvSourceReceived', function () {
              this.$el.modal('hide');
              // TODO: might need to be added to a new panel/data sources ?
              this.collection.add(csvSource);
          }, this).createSource(params);
      },

      'click .m-upload-another-file-button': function (e) {

          e.preventDefault();

          new minerva.views.AddCSVSourceWidget({
              el: $('#g-dialog-container'),
              parentView: this,
              parentCollection: this.collection
          }).render();
      },

      'click .m-load-more-rows-button': function (e) {

          e.preventDefault();

          this.rows += this.requestedRows;
          this.data = this.parseCsv();

          var table = $('table#data').dataTable();

          // Clear the table then render the new data
          table.fnClearTable();
          table.fnAddData(this.data);

          // Disable the `show more rows` btn when reach the max number of rows
          if (this.rows >= this.totalRows) {
              $('.m-load-more-rows-button').addClass('disabled');
          }

      },
  },

  parseCsv: function () {
      var parsedCSV = Papa.parse(this.csv, { skipEmptyLines: true, preview: this.rows });
      if (!parsedCSV || !parsedCSV.data) {
          console.error('error with parser');
          return;
      }
      return parsedCSV.data;
  },

  initialize: function (settings) {
      this.source        = settings.source;
      this.collection    = settings.collection;
      this.csv           = settings.csv;
      this.rows          = parseInt(settings.rows);
      this.requestedRows = parseInt(settings.rows);
      this.totalRows     = settings.totalRows;
      if (!this.source) {
          this.data      = this.parseCsv();
      } else {
          this.data      = this.source.metadata().csvData;
      }
      this.csvData       = settings.csvData;
      this.title         = settings.title;
      this.columns       = [];
  },

  render: function () {

      this.colNames = _.map(this.data[0], function (name) {
          return { title: name };
      });

      var modal = this.$el.html(minerva.templates.csvViewerWidget({
            title: this.title,
            totalRows: this.totalRows
      })).girderModal(this).on('shown.bs.modal', function () {
      }).on('hidden.bs.modal', function () {
      }).on('ready.girder.modal', _.bind(function () {
          $('table#data').dataTable({
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

      // Disable the `show more rows` btn when reach the max rows
      if (this.rows >= this.totalRows) {
          $('.m-load-more-rows-button').addClass('disabled');
      }

      modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

      return this;
  }

});
