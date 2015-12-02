/**
* This widget displays csv conents as a table
*/
minerva.views.CsvViewerWidget = minerva.View.extend({

  events: {
      'click .m-add-source-button': function () {

      },

      'click .m-upload-another-file-button': function (e) {

          e.preventDefault();

          new minerva.views.AddCSVSourceWidget({
              el: $('#g-dialog-container'),
              parentView: this,
              parentCollection: this.collection
          }).render();

      }
  },


  initialize: function (settings) {
      this.data = settings.data;
      this.title = settings.title;
  },

  render: function () {

    var colNames = _.map(this.data[0], function (name) {
        return { title: name };
    });
    var modal = this.$el.html(minerva.templates.csvViewerWidget({
          title: this.title
      })).girderModal(this).on('shown.bs.modal', function () {
      }).on('hidden.bs.modal', function () {
      }).on('ready.girder.modal', _.bind(function () {
          $('table#data').DataTable({
              data: this.data,
              columns: colNames,
              autoWidth: false,
              ordering: true
          });
      }, this));

    modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
    return this;

  }

});
