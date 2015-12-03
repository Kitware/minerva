/**
* This widget displays a form for adding a CSV file.
*/
minerva.views.AddCSVSourceWidget = minerva.View.extend({

    events: {
        'submit #m-upload-form': function (e) {
            e.preventDefault();

            var title = this.$('#m-csv-name').val();

            if (this.csv) {
                var parsedCSV = this.parseCsv(this.csv);
                this.renderCsvViewer(parsedCSV.data, title);
                return;
            }

            var REGEX = /^([a-zA-Z0-9\s_\\.\-:])+(.csv|.txt)$/;

            if (REGEX.test($(".m-files").val().toLowerCase())) {
                if (typeof (FileReader) != "undefined") {
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        var parsedCSV = this.parseCsv(e.target.result);
                        this.renderCsvViewer(parsedCSV.data, title);
                    }.bind(this);
                    reader.readAsText($(".m-files")[0].files[0]);
                } else {
                    alert("This browser does not support HTML5.");
                }
            } else {
                alert("Please upload a valid CSV file.");
            }
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

    parseCsv: function (csv) {
        var parsedCSV = Papa.parse(csv, {skipEmptyLines: true});
        if (!parsedCSV || !parsedCSV.data) {
            console.error('This dataset lacks csv data to create geojson on the client.');
            return;
        }
        return parsedCSV;
    },

    filesChanged: function () {
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
        var reader = new FileReader();
        reader.onload = function(e) {
        		// get file content
        		var csv = e.target.result;
            this.csv = csv;
        }.bind(this);
        reader.readAsText(this.files[0]);
        this.filesChanged();
    },

    renderCsvViewer: function (data, name) {
        new minerva.views.CsvViewerWidget({
            el: $('#g-dialog-container'),
            parentView: this,
            parentCollection: this.collection,
            data: data,
            title: name
        }).render();
    },

    initialize: function (settings) {
        this.collection = settings.collection;
        this.csv = null;
        this.files = [];
        this.totalSize = 0;
    },

    render: function () {
        var modal = this.$el.html(minerva.templates.addCSVSourceWidget({}));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
        return this;
    }

});
