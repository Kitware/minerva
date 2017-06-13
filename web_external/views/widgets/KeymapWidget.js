/**
* This widget is used to display a json row to map keys.
*/
minerva.views.KeymapWidget = minerva.View.extend({

    events: {
        'submit #m-keymap-mapping-form': function (e) {
            e.preventDefault();

            var mapper = {
                longitudeKeypath: this.$('#m-longitude-mapper').val(),
                latitudeKeypath: this.$('#m-latitude-mapper').val()
            };

            // validate columns, be sure they aren't equal
            if (mapper.longitudeKeypath === mapper.latitudeKeypath) {
                this.$('.g-validation-failed-message').text('Latitude and Longitude should be different key paths');
                return;
            } else {
                this.$('.g-validation-failed-message').text('');
            }

            // create or update metadata
            var minervaMetadata = this.dataset.metadata();
            minervaMetadata.mapper = mapper;

            // save the dataset with updated metadata
            this.$('button.m-save-keymap-mapping').addClass('disabled');
            this.dataset.once('m:metadata_saved', function () {
                this.dataset.on('m:geojsonCreated', function () {
                    this.$el.modal('hide');
                    // TODO is this ok to do?
                    // can't seem to get the dataset panel to pick up the update events from collection or dataset
                    this.parentView.render();
                }, this);
                this.dataset.createGeoJson();
            }, this).off('g:error').on('g:error', function (err) {
                this.$('.g-validation-failed-message').text(err.responseJSON.message);
                this.$('button.m-save-keymap-mapping').removeClass('disabled');
            }, this).saveMinervaMetadata(minervaMetadata);
        },
        'change #m-latitude-mapper': function () {
            var jsonpathLat = this.$('#m-latitude-mapper').val();
            var latExampleVal = jsonPath.eval(this.jsonrowData, jsonpathLat);
            // TODO npm installs v 0.10.0 of jsonPath, v 0.11.0 creates a new
            // public method called evalaute so these jshint ignores won't be necessary
            // upgrade to v 0.11.0 from source repo or once updated in npm
            this.$('#m-latitude-example-value').val(latExampleVal);
        },
        'change #m-longitude-mapper': function () {
            var jsonpathLong = this.$('#m-longitude-mapper').val();
            var longExampleVal = jsonPath.eval(this.jsonrowData, jsonpathLong);
            this.$('#m-longitude-example-value').val(longExampleVal);
        },
        'click .hide-keymap-preview': function () {
            this.$('.hide-keymap-preview').hide();
            this.$('.jsonrowData').hide();
            this.$('.show-keymap-preview').show();
        },
        'click .show-keymap-preview': function () {
            this.$('.hide-keymap-preview').show();
            this.$('.jsonrowData').show();
            this.$('.show-keymap-preview').hide();
        }
    },

    initialize: function (settings) {
        this.dataset = settings.dataset;
        this.minervaMetadata = this.dataset.metadata();
        if (this.minervaMetadata.mapper) {
            this.create = false;
        } else {
            this.create = true;
        }
        this.jsonrowData = this.dataset.getJsonRowData();
    },

    render: function () {
        var longitudeKeypath = null,
            latitudeKeypath = null,
            latExampleVal = null,
            longExampleVal = null,
            dateExampleVal = null;
        if (!this.create) {
            longitudeKeypath = this.minervaMetadata.mapper.longitudeKeypath;
            latitudeKeypath = this.minervaMetadata.mapper.latitudeKeypath;
            latExampleVal = jsonPath.eval(this.jsonrowData, latitudeKeypath);
            longExampleVal = jsonPath.eval(this.jsonrowData, longitudeKeypath);
        }
        var modal = this.$el.html(minerva.templates.keymapWidget({
            create: this.create,
            longitudeKeypath: longitudeKeypath,
            latitudeKeypath: latitudeKeypath,
            latExampleVal: latExampleVal,
            longExampleVal: longExampleVal,
            dateExampleVal: dateExampleVal
        })).girderModal(this).on('shown.bs.modal', function () {
        }).on('hidden.bs.modal', function () {
        }).on('ready.girder.modal', _.bind(function () {
            this.$('#jsonrow-preview').text(JSON.stringify(this.jsonrowData, null, 4));
        }, this));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

        return this;
    }

});
