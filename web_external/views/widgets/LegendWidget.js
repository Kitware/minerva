// /**
// * This widget displays the list of WMS layers
// */
// minerva.views.LegendWidget = minerva.View.extend({

//     show: function () {
//         this.modal[this.id].show();
//     },

//     remove: function (id) {
//         $('#' + id).detach();
//     },

//     initialize: function (settings) {
//         this.legend = settings.legend;
//         this.modal = {};
//         this.legendTag = {};
//         this.id = settings.id;
//     },

//     render: function () {
//         this.legendTag[this.id] = minerva.templates.legendWidget({ legend: this.legend, id: this.id });
//         this.modal[this.id] = this.$el.append(this.legendTag[this.id]);
//         this.modal[this.id].trigger($.Event('ready.girder.modal', {relatedTarget: this.modal[this.id]}));
//         return this;
//     }

// });
