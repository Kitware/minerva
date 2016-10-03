/**
 * The Item Preview widget shows a preview of items under a given folder.
 * For now, the only supported item previews are image previews.
 */

girder.views.UrlUploaderWidget = girder.View.extend({

    events: {
        'keyup input#url_uploader': function (event) {
            var url = $('#url_uploader').val();
            this.url = url;
            this.urlIsValid(url) ? $('.g-start-upload').removeClass('disabled') : $('.g-start-upload').addClass('disabled');
        },
        'click .start-upload': function () {
            this.startUploading(this.url);
        }
    },

    initialize: function (settings) {
        if (settings.noParent) {
            this.parent = null;
            this.parentType = null;
        } else {
            this.parent = settings.parent || settings.folder;
            this.parentType = settings.parentType || 'folder';
        }
        this.folderId = settings.parentView.parent.id;
        this.files = [];
        this.url = null;
        this.form = settings.form;
        var that = this;
        $('#g-upload-form').on('submit', function (e) {
            e.preventDefault();
            that.startUploading(that.url);
        });
    },

    urlIsValid: function (url) {
        return /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(url);
    },

    setUploadEnabled: function (state) {
        if (state) {
            this.$('.g-start-upload').removeClass('disabled');
        } else {
            this.$('.g-start-upload').addClass('disabled');
        }
    },

    startUpload: function () {
        this.setUploadEnabled(false);
        this.$('.g-drop-zone').addClass('hide');
        this.$('.g-progress-overall,.g-progress-current').removeClass('hide');
        this.$('.g-upload-error-message').empty();

        this.currentIndex = 0;
        this.overallProgress = 0;
        this.trigger('g:uploadStarted');

        if (!this.overrideStart) {
            this.uploadNextFile();
        }
    },

    startUploading: function (url) {
        // Download url content and save it to Girder
        girder.restRequest({
            path: '/item/url',
            type: 'POST',
            data: {
                url: url
            }
        }).done(_.bind(function (resp) {
            girder.restRequest({
                path: '/item/upload',
                type: 'POST',
                data: {file_name: resp[0].file_name, folder_id: this.folderId}
            });
        }, this));
    },

    uploadNextFile: function () {
        if (this.currentIndex >= this.files.length) {
            // All files have finished
            if (this.modal) {
                this.$el.modal('hide');
            }
            this.trigger('g:uploadFinished', {
                files: this.files,
                totalSize: this.totalSize
            });
            return;
        }

        this.currentFile = this.parentType === 'file'
                ? this.parent : new girder.models.FileModel();

        this.currentFile.on('g:upload.complete', function () {
            this.currentIndex += 1;
            this.uploadNextFile();
        }, this).on('g:upload.chunkSent', function (info) {
            this.overallProgress += info.bytes;
        }, this).on('g:upload.progress', function (info) {
            var currentProgress = info.startByte + info.loaded;

            this.$('.g-progress-current>.progress-bar').css('width',
                Math.ceil(100 * currentProgress / info.total) + '%');
            this.$('.g-progress-overall>.progress-bar').css('width',
                Math.ceil(100 * (this.overallProgress + info.loaded) /
                          this.totalSize) + '%');
            this.$('.g-current-progress-message').html(
                '<i class="icon-doc-text"/>' + (this.currentIndex + 1) + ' of ' +
                    this.files.length + ' - <b>' + info.file.name + '</b>: ' +
                    girder.formatSize(currentProgress) + ' / ' +
                    girder.formatSize(info.total)
            );
            this.$('.g-overall-progress-message').html('Overall progress: ' +
                girder.formatSize(this.overallProgress + info.loaded) + ' / ' +
                girder.formatSize(this.totalSize));
        }, this).on('g:upload.error', function (info) {
            var html = info.message + ' <a class="g-resume-upload">' +
                'Click to resume upload</a>';
            $('.g-upload-error-message').html(html);
        }, this).on('g:upload.errorStarting', function (info) {
            var html = info.message + ' <a class="g-restart-upload">' +
                'Click to restart upload</a>';
            $('.g-upload-error-message').html(html);
        }, this);

        if (this.parentType === 'file') {
            this.currentFile.updateContents(this.files[this.currentIndex]);
        } else {
            this.currentFile.upload(this.parent, this.files[this.currentIndex]);
        }
    },

    render: function () {
        this.$el.html(girder.templates.urlUploader({
            girder: girder
        }));
        return this;
    }

});

girder.wrap(girder.views.UploadWidget, 'render', function (render) {
    render.call(this);
    var element = $('<div class="g-url-uploader-container">');
    this.$el.find('.modal-body').append(element);
    var form = this.$el.find('#g-upload-form');
    // Add the item preview widget into the container.
    this.urlUploaderView = new girder.views.UrlUploaderWidget({
        parentView: this,
        form: form,
        parent: this.parent,
        el: element
    })
    .render();

    return this;
});
