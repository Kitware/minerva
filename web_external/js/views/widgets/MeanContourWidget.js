/**
* This widget is used to edit params for GeoJs contour analysis.
*/
minerva.views.MeanContourWidget = minerva.View.extend({

    events: {
        'submit #m-geojs-contour-form': function (e) {
            e.preventDefault();
            this.$('.g-validation-failed-message').text('');

            var parameter = this.$('#m-geojs-contour-parameter').val().trim();
            this.hierarchyWidget.itemListView.recomputeChecked();
            var resources = this.hierarchyWidget.getCheckedResources();
            var itemId = this.analysis.get('_id');

            if (!_.has(resources, 'item') || resources.item.length !== 1) {
                this.$('.g-validation-failed-message').text('You must select exactly one item');
                return;
            }

            var selectedDatasetItemId = resources.item[0];

            if (!parameter || parameter === '') {
                this.$('.g-validation-failed-message').text('You must provide a parameter');
                return;
            }

            this.$('.g-validation-failed-message').text('');
            this.$('button.m-run-geojs-contour').addClass('disabled');

            girder.restRequest({
                path: 'item/' + selectedDatasetItemId  + '/files',
                type: 'GET',
                data: {
                    limit: 1
                },
                contentType: 'application/json'
            }).done(_.bind(function (files) {
                var data = {
                        inputs: {
                            host: {
                                format: 'json',
                                data: window.location.hostname
                            },
                            port: {
                                format: 'json',
                                data: window.location.port
                            },
                            token: {
                                format: 'json',
                                data: girder.cookie.find('girderToken')
                            },
                            fileId: {
                                format: 'json',
                                name: 'fileId',
                                data: files[0]._id
                            },
                            variable: {
                                format: 'json',
                                data: parameter
                            }

                        },
                        outputs: {
                            result: {
                                format: 'json'
                            }
                        }
                    };

                girder.restRequest({
                    path: 'item/' + itemId  + '/romanesco',
                    type: 'POST',
                    data: JSON.stringify(data),
                    contentType: 'application/json'
                }).done(_.bind(function () {
                    this.$el.modal('hide');
                    girder.events.trigger('m:job.created');
                }, this));
            }, this));
        },
        'change #m-geojs-contour-input-source': function (evt) {
            var el = $(evt.currentTarget);
            var source = this.sourceCollection.get(el.val());
            this._createSourceHierarchy(source);
        }
    },

    initialize: function (settings) {
        this.datasetCollection = settings.datasetCollection;
        this.sourceCollection = settings.sourceCollection;
        this.analysis = settings.analysis;
    },

    _createSourceHierarchy: function (source) {
        if (!source) {
            this.$('.g-validation-failed-message').text('You must define at least one S3 source');
            this.$('button.m-run-geojs-contour').addClass('disabled');
            return;
        }

        this.folder = new girder.models.FolderModel();
        var mm = source.metadata();
        this.folder.set({
            _id: mm.folder_id,
            minerva: mm
        });

        this.folder.on('g:fetched', function () {
            this.$('.g-validation-failed-message').text('');
            this.hierarchyWidget = new minerva.views.ReadOnlyHierarchyWidget({
                el: $('.m-hierarchy-container'),
                parentView: this,
                parentModel: this.folder,
                folderAccess: false,
                upload: false,
                folderCreate: false,
                folderEdit: false,
                itemCreate: false
            }).render();
        }, this).on('g:error', function () {
            // TODO
            console.error('fetch of folder failed');
        }, this).fetch();
    },

    render: function () {
        var s3Sources = _.filter(this.sourceCollection.models, function (source) {
            return source.getSourceType() === 's3';
        });
        var defaultSource = s3Sources[0];
        var modal = this.$el.html(minerva.templates.meanContourWidget({
            sources: s3Sources
        })).girderModal(this).on('ready.girder.modal', _.bind(function () {
            this._createSourceHierarchy(defaultSource);
        }, this));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

        return this;
    }
});
