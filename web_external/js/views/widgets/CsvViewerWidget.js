/**
 * This widget displays csv content as a table
 */
minerva.views.CsvViewerWidget = minerva.View.extend({

    events: {
        'click .m-update-dataset': function (e) {
            e.preventDefault();
            // TODO: Let the end user specify the columns related to long and lat
        }
    },

    _parseCsv: function (data, headers) {
        var parsedCSV = Papa.parse(data, { skipEmptyLines: true, headers: headers });
        if (!parsedCSV || !parsedCSV.data) {
            console.error('error with parser');
            return;
        }
        return parsedCSV.data;
    },

    _getTotalRows: function (dataTableSource) {
        return dataTableSource.length;
    },

    initialize: function (settings) {
        this.source = settings.source;
        this.dataset = settings.dataset;
        this.collection = settings.collection;
        this.csv = this._parseCsv(settings.data, true);
        this.data = this._parseCsv(settings.data, false);
    },

    render: function () {
        // Add extra rows to be views in datatables
        var EXTRA_ROWS = 10;
        // Remove the headers
        var dataTableSource = this.csv.slice(1);
        var dataLength = this._getTotalRows(dataTableSource);

        this.colNames = _.map(this.data[0], function (name) {
            return { 'title': name };
        });

        var modal = this.$el.html(minerva.templates.csvViewerWidget({
            dataset: this.dataset
        })).girderModal(this).on('shown.bs.modal', function () {
        }).on('hidden.bs.modal', function () {
        }).on('ready.girder.modal', _.bind(function () {
            $('table#data').dataTable({
                'columns': this.colNames,
                'scrollCollapse': true,
                'serverSide': true,
                'autoWidth': false,
                'ordering': true,
                'searching': false,
                'ajax': _.bind(function (data, callback, settings) {
                    var output = [], i, ien;
                    for (i = data.start, ien = (data.start + data.length) + EXTRA_ROWS; i < ien; i++) {
                        output.push(dataTableSource[i]);
                    }
                    callback({
                        'draw': data.draw,
                        'data': output,
                        'recordsTotal': dataLength,
                        'recordsFiltered': dataLength
                    });
                }, this),
                'scroller': {
                    'loadingIndicator': true,
                    'trace': true
                },
                'deferRender': true,
                'scrollY': 400,
                'dom': 'Bfrtip',
                'buttons': [
                    {
                        'extend': 'colvis',
                        'columns': ':not(:first-child)'
                    }
                ]
            });
        }, this));

        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

        return this;
    }

});
