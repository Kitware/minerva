/**
* This widget is used to display a csv or other tabular data.
*/
minerva.views.TableWidget = minerva.View.extend({

    events: {
        'submit #m-table-mapping-form': function (e) {
            e.preventDefault();

            var mapper = {
                longitudeColumn: this.$('#m-longitude-mapper').val(),
                latitudeColumn: this.$('#m-latitude-mapper').val()
            };

            // validate columns, be sure they aren't equal
            if (mapper.longitudeColumn === mapper.latitudeColumn) {
                this.$('.g-validation-failed-message').text('Latitude and Longitude should be different columns');
                return;
            } else {
                this.$('.g-validation-failed-message').text('');
            }

            // create or update metadata
            var meta = this.dataset.get('meta');
            meta.minerva.mapper = mapper;
            this.dataset.set('meta', meta);

            // save the dataset with updated metadata
            this.$('button.m-save-table-mapping').addClass('disabled');
            this.dataset.once('m:metadata_saved', function () {
                this.dataset.on('m:geojsonCreatedFromTabular', function () {
                    this.$el.modal('hide');
                    // TODO is this ok to do?
                    // can't seem to get the dataset panel to pick up the update events from collection or dataset
                    this.parentView.render();
                }, this);
                this.dataset.createGeoJsonFromTabular();
            }, this).off('g:error').on('g:error', function (err) {
                this.$('.g-validation-failed-message').text(err.responseJSON.message);
                this.$('button.m-save-table-mapping').removeClass('disabled');
            }, this).saveMinervaMetadata();
        },
        'click .hide-table-preview': function () {
            this.$('.hide-table-preview').hide();
            this.$('#data_wrapper').hide();
            this.$('.show-table-preview').show();
            console.log('hide');
        },
        'click .show-table-preview': function () {
            this.$('.hide-table-preview').show();
            this.$('#data_wrapper').show();
            this.$('.show-table-preview').hide();
        }
    },

    initialize: function (settings) {
        this.dataset = settings.dataset;
        var meta = this.dataset.get('meta');
        if (meta.minerva.mapper) {
            this.create = false;
        } else {
            this.create = true;
        }
    },

    render: function () {
        // TODO probably want to synthesize colnames in dataset
        var colnames = _.map(_.range(1, this.dataset.csv.data[0].length + 1), function (ind) {
            return { title: 'col' + ind };
        });
        var longitudeColumn = null,
            latitudeColumn = null;
        if (!this.create) {
            longitudeColumn = this.dataset.get('meta').minerva.mapper.longitudeColumn;
            latitudeColumn = this.dataset.get('meta').minerva.mapper.latitudeColumn;
        }
        var modal = this.$el.html(minerva.templates.tableWidget({
            colnames: colnames,
            create: this.create,
            longitudeColumn: longitudeColumn,
            latitudeColumn: latitudeColumn
        })).girderModal(this).on('shown.bs.modal', function () {
        }).on('hidden.bs.modal', function () {
        }).on('ready.girder.modal', _.bind(function () {
            $('table#data').DataTable({
                data: this.dataset.csv.data,
                columns: colnames,
                autoWidth: false,
                ordering: false
            });
        }, this));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

        return this;
    }

});
