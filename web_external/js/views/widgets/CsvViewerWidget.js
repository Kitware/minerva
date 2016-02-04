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
            var mm = this.dataset.metadata();
            var fileId = mm.original_files[0]._id;
            $('table#data').on('xhr.dt', function ( e, settings, json, xhr ) {
               console.log(json);
            }).DataTable({
                //ajax: {
                //    url: '/api/v1/file/' + fileId + '/download?contentDisposition=inline',
                //},
                //scrollY:        200,
                deferRender:    true,
                scroller:       true,
                data: this.data,
                columns: this.colNames,
                autoWidth: true,
                hover: true,
                ordering: true,
                pagingType: 'full',
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
