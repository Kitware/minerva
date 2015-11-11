minerva.views.GraphsPanel = minerva.View.extend({
  initialize: function (options) {
  },

  render: function () {
    this.$el.html(minerva.templates.graphsPanel({}));
  }
});
