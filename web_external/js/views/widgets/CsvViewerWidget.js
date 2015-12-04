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
          this.rows = this.rows * 2;
          this.data = this.parseCsv();
          this.render();
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
      this.csv = settings.csv;
      this.rows = settings.rows;
      this.stats = settings.stats;
      this.data = this.parseCsv();
      this.title = settings.title;
  },

  render: function () {

      var colNames = _.map(this.data[0], function (name) {
          return { title: name };
      });
      var modal = this.$el.html(minerva.templates.csvViewerWidget({
            title: this.title,
            stats: this.stats,
      })).girderModal(this).on('shown.bs.modal', function () {
      }).on('hidden.bs.modal', function () {
      }).on('ready.girder.modal', _.bind(function () {
          $('table#data').DataTable({
              data: this.data,
              columns: colNames,
              autoWidth: true,
              hover: true,
              ordering: true
          });
      }, this));

      modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
      return this;
  }

});
