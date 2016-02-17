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


    initialize: function (settings) {
        this.source      = settings.source;
        this.dataset     = settings.dataset;
        this.collection  = settings.collection;
        this.csv         = this._parseCsv(settings.data, true);
        this.data        = this._parseCsv(settings.data, false);
    },

    render: function () {

        // Set number of rows in datatable
        var DEFAULT_NUMBER_ROWS = 30;
        var dataTableSource = this.data.slice(1);

        this.colNames = _.map(this.data[0], function (name) {
            return { title: name };
        });

        var modal = this.$el.html(minerva.templates.csvViewerWidget({
            title     : this.dataset.get('name'),
            source    : this.source,
            totalRows : this.totalRows,
            columns   : this.colNames
        })).girderModal(this).on('shown.bs.modal', function () {
        }).on('hidden.bs.modal', function () {
        }).on('ready.girder.modal', _.bind(function () {
            $('table#data').dataTable({
                // Use this.data.shift() to remove the headers
                data: dataTableSource,
                columns: this.colNames,
                autoWidth: true,
                hover: true,
                ordering: true,
                iDisplayLength: DEFAULT_NUMBER_ROWS,
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
