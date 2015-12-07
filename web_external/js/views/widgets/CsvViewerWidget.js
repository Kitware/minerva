/**
* This widget displays csv conents as a table
*/
minerva.views.CsvViewerWidget = minerva.View.extend({

  events: {
      'click .m-add-source-button': function (e) {
          e.preventDefault();
          // TODO: Add to source here
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
      this.csv           = settings.csv;
      this.rows          = parseInt(settings.rows);
      this.requestedRows = parseInt(settings.rows);
      this.totalRows     = settings.totalRows;
      this.data          = this.parseCsv();
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
