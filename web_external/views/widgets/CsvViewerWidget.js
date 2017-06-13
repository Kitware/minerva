import View from '../view';
import template from '../../templates/widgets/csvViewerWidget.pug';
/**
 * This widget displays csv content as a table
 */
export default View.extend({

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
        // Remove the headers
        var dataTableSource = this.csv.slice(1);

        // Infinite scrolling configuration
        var tableScrollConfig = {
            dataSize: this._getTotalRows(dataTableSource),
            // The amount of data that Scroller should pre-buffer
            displayBuffer: 40,
            // Activate vertical scrolling
            scrollY: '950px'
        };

        this.colNames = _.map(this.data[0], function (name) {
            return { 'title': name };
        });

        var modal = this.$el.html(template({
            dataset: this.dataset
        })).girderModal(this).on('shown.bs.modal', function () {
        }).on('hidden.bs.modal', function () {
        }).on('ready.girder.modal', _.bind(function () {
            $('table#data').dataTable({
                'serverSide': true,
                'autoWidth': false,
                'ordering': true,
                'jQueryUI': true,
                'renderer': 'bootstrap',
                'searching': false,
                'ajax': _.bind(function (data, callback, settings) {
                    if (data.length > tableScrollConfig.dataSize) {
                        data.length = tableScrollConfig.dataSize;
                    }
                    var output = [], i, ien;
                    for (i = data.start, ien = data.start + data.length; i < ien; i++) {
                        output.push(dataTableSource[i]);
                    }
                    callback({
                        'data': output,
                        'recordsTotal': tableScrollConfig.dataSize,
                        'recordsFiltered': tableScrollConfig.dataSize
                    });
                }),
                'scroller': {
                    'loadingIndicator': true,
                    'trace': true,
                    'displayBuffer': tableScrollConfig.displayBuffer
                },
                'deferRender': true,
                'scrollY': tableScrollConfig.scrollY,
                'dom': 'Bfrtip',
                'buttons': [
                    {
                        'extend': 'colvis',
                        'columns': ':not(:first-child)'
                    }
                ],
                'columns': this.colNames
            });
            // HACK to fix headers misalignment
            $('table').css('table-layout', 'fixed');
            $('.dataTables_scrollHeadInner').css({'width': '100%'});
            $('table.dataTable').addClass('dataTable-width');
        }, this));

        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

        return this;
    }

});
