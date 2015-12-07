/**
* This widget displays a form for adding a CSV file.
*/
minerva.views.AddCSVSourceWidget = minerva.View.extend({

    events: {
        'submit #m-upload-form': function (e) {

            e.preventDefault();

            var title, rowsType, rows;

            title = this.$('#m-csv-name').val();

            this.title = title;

            rowsType = $('#m-upload-form input:radio:checked').attr('select');

            if (rowsType !== 'all') {
                rows = this.$('#m-csv-number-rows').val();
                this.rows = rows;
            }

            this.renderCsvViewer();
        },

        'change #m-upload-form input[type=radio]': function () {
            rowsViewType = $('#m-upload-form input:radio:checked').attr('select');
            rowsViewType === 'custom' ? this.$('input#m-csv-number-rows').css('display', 'block') : this.$('input#m-csv-number-rows').hide();
        },

        'click .g-resume-upload': function () {
            this.$('.g-upload-error-message').html('');
            this.currentFile.resumeUpload();
        },

        'click .g-restart-upload': function () {
            this.$('.g-upload-error-message').html('');
            this.uploadNextFile();
        },

        'change .m-files': function () {
            var files = this.$('.m-files')[0].files;
            if (files.length) {
                this.files = files;
                this.filesChanged();
            }
        },

        'click .m-drop-zone': function () {
            this.$('.m-files').click();
        },

        'dragenter .m-drop-zone': function (e) {
            e.stopPropagation();
            e.preventDefault();
            e.originalEvent.dataTransfer.dropEffect = 'copy';
            this.$('.m-drop-zone')
                .addClass('m-dropzone-show')
                .html('<i class="icon-bullseye"/> Drop files here');
        },

        'dragleave .m-drop-zone': function (e) {
            e.stopPropagation();
            e.preventDefault();
            this.$('.m-drop-zone')
                .removeClass('m-dropzone-show')
                .html('<i class="icon-docs"/> Browse or drop files');
        },

        'dragover .m-drop-zone': function (e) {
            e.preventDefault();
        },

        'drop .m-drop-zone': 'filesDropped'
    },

    parseCsv: function () {
        var parsedCSV = Papa.parse(this.csv, { skipEmptyLines: true });
        if (!parsedCSV || !parsedCSV.data) {
            console.error('This dataset lacks csv data to create geojson on the client.');
            return;
        }
        return parsedCSV;
    },

    filesChanged: function () {

        var REGEX = /^([a-zA-Z0-9\s_\\.\-:])+(.csv|.txt)$/;

        if (REGEX.test(this.files[0].name.toLowerCase())) {
            if (typeof (FileReader) !== "undefined") {
                var reader = new FileReader();
                reader.onload = function(e) {
                    // get file content
                    var csv = e.target.result;
                    this.csv = csv;
                    var totalRows = this.getTotalRows();
                    this.totalRows = totalRows;

                    this.$('.radio.m-number-rows li:nth-child(1)')
                        .html('<input type="radio" select="all" name="m-select-rows" checked="true">Show all '+ this.totalRows.toLocaleString() +' rows');

                }.bind(this);
                reader.readAsText(this.files[0]);
            } else {
                alert("This browser does not support HTML5.");
            }
        } else {
            alert("Please upload a valid CSV file.");
            return;
        }


        if (this.files.length === 0) {
            this.$('.m-overall-progress-message').text('No files selected');
            this.setUploadEnabled(false);
        } else {
            this.totalSize = 0;
            _.each(this.files, function (file) {
                this.totalSize += file.size;
            }, this);

            var msg;

            if (this.files.length > 1) {
                msg = 'Selected ' + this.files.length + ' files';
            } else {
                msg = 'Selected <b>' + this.files[0].name + '</b>';
            }
            this.$('.m-overall-progress-message').html('<i class="icon-ok"/> ' +
                msg + '  (' + girder.formatSize(this.totalSize) +
                ') -- Press start button');
            this.setUploadEnabled(true);
            this.$('.g-progress-overall,.m-progress-current').addClass('hide');
            this.$('.m-current-progress-message').empty();
            this.$('.g-upload-error-message').empty();
        }
    },

    setUploadEnabled: function (state) {
        if (state) {
            this.$('.g-start-upload').removeClass('disabled');
        } else {
            this.$('.g-start-upload').addClass('disabled');
        }
    },

    filesDropped: function (e) {
        e.stopPropagation();
        e.preventDefault();
        this.$('.m-drop-zone')
            .removeClass('m-dropzone-show')
            .html('<i class="icon-docs"/> Browse or drop files');
        this.files = e.originalEvent.dataTransfer.files;
        this.filesChanged();
    },

    renderCsvViewer: function () {
        new minerva.views.CsvViewerWidget({
            el               : $('#g-dialog-container'),
            parentView       : this,
            parentCollection : this.collection,
            csv              : this.csv,
            rows             : this.rows || this.totalRows,
            title            : this.title,
            totalRows        : this.totalRows
        }).render();
    },

    getTotalRows: function () {
        var csv = this.parseCsv();
        return csv.data.length;
    },

    initialize: function (settings) {
        this.collection  = settings.collection;
        this.csv         = null;
        this.title       = '';
        this.files       = [];
        this.totalRows   = 0;
        this.rows        = null;
    },

    render: function () {
        var modal = this.$el.html(minerva.templates.addCSVSourceWidget({}));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
        return this;
    }

});
