/**
* This widget displays a form for adding a CSV file.
*/
minerva.views.AddCSVSourceWidget = minerva.View.extend({

    events: {
        'submit #m-add-csv-source-form': function (e) {
            e.preventDefault();

            var regex = /^([a-zA-Z0-9\s_\\.\-:])+(.csv|.txt)$/;
            if (regex.test($("#csvFileUpload").val().toLowerCase())) {
                if (typeof (FileReader) != "undefined") {
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        var pasredCSV = Papa.parse(e.target.result, {skipEmptyLines: true});
                        if (!pasredCSV || !pasredCSV.data) {
                            console.error('This dataset lacks csv data to create geojson on the client.');
                            return;
                        }

                        new minerva.views.CsvViewerWidget({
                            el: $('#g-dialog-container'),
                            parentView: this,
                            parentCollection: this.collection,
                            data: pasredCSV.data,
                            title: this.$('#m-csv-name').val()
                        }).render();
                        
                    }.bind(this);
                    reader.readAsText($("#csvFileUpload")[0].files[0]);
                } else {
                    alert("This browser does not support HTML5.");
                }
            } else {
                alert("Please upload a valid CSV file.");
            }

            // this.getGeoJson(function (geojson) {
            //   var params = {
            //       name: this.$('#m-csv-name').val(),
            //       geojson: JSON.stringify(geojson) // send the uploaded file data
            //   };
            //   var csvSource = new minerva.models.CSVSourceModel({});
            //   csvSource.on('m:csvSourceReceived', function () {
            //       this.$el.modal('hide');
            //       // TODO: might need to be added to a new panel/data sources ?
            //       console.log('source', csvSource);
            //       this.collection.add(csvSource);
            //   }, this).createCSVDataset(params);
            // }.bind(this));
        }
    },

    initialize: function (settings) {
        this.collection = settings.collection;
        this.pasredCSV = {};
    },

    render: function () {

//       var data = [
//         [
//             "1",
//             "2",
//             "3",
//             "4",
//             "5",
//             "6"
//         ],
//     [
//         "Tiger Nixon",
//         "System Architect",
//         "Edinburgh",
//         "5421",
//         "2011/04/25",
//         "$3,120"
//     ],
//     [
//         "Garrett Winters",
//         "Director",
//         "Edinburgh",
//         "8422",
//         "2011/07/25",
//         "$5,300"
//     ]
// ];

        var modal = this.$el.html(minerva.templates.addCSVSourceWidget({}));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
        return this;
    }

});
