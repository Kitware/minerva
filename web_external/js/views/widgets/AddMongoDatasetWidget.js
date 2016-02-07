/**
* This widget displays a form for adding a Mongo collection as a
* Minerva dataset.
*/
minerva.views.AddMongoDatasetWidget = minerva.View.extend({

    events: {
        'submit #m-add-mongo-dataset-form': function (e) {
            e.preventDefault();
            this.$('.m-add-dataset-button').addClass('disabled');
            var mongoSource = this.source;
            this.$('form#m-add-mongo-dataset-form :input.m-add-collections').each(
                _.bind(function (index, collection) {
                    if (collection.checked) {
                        var collectionName = $(collection).attr('mongo-collection');
                        var params = {
                            name: collectionName,
                            mongo_collection: collectionName,
                            mongoSourceId: mongoSource.get('_id')
                        };
                        var mongoDataset = new minerva.models.MongoDatasetModel({});
                        mongoDataset.once('m:mongoDatasetAdded', function () {
                            this.$el.modal('hide');
                            this.collection.addDataset(mongoDataset);
                        }, this).createMongoDataset(params);
                    }
                }, this));
        }
    },

    initialize: function (settings) {
        this.source = settings.source;
        this.collection = settings.collection;
        this.mongo_collections = this.source.getMinervaMetadata().collections;
    },

    render: function () {
        var modal = this.$el.html(minerva.templates.addMongoDatasetWidget({
            mongo_collections: this.mongo_collections
        })).girderModal(this);
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
        return this;
    },

    /**
     * Change the current mongoSource whose collections will be displayed, and render.
     *
     * @param  mongoSource  The wmsSource to display.
     */
    setCurrentSource: function (mongoSource) {
        this.source = mongoSource;
        this.mongo_collections = this.source.getMinervaMetadata().collections;
        this.render();
    }
});
