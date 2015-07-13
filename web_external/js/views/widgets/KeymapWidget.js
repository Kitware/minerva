/**
* This widget is used to display a json row to map keys.
*/
minerva.views.KeymapWidget = minerva.View.extend({

    events: {
        'submit #m-keymap-mapping-form': function (e) {
            e.preventDefault();

            var mapper = {
                longitudeKeypath: this.$('#m-longitude-mapper').val(),
                latitudeKeypath: this.$('#m-latitude-mapper').val(),
                dateKeypath: this.$('#m-date-range-filter-mapper').val()
            };

            // validate columns, be sure they aren't equal
            if (mapper.longitudeKeypath === mapper.latitudeKeypath) {
                this.$('.g-validation-failed-message').text('Latitude and Longitude should be different key paths');
                return;
            } else {
                this.$('.g-validation-failed-message').text('');
            }

            // create or update metadata
            var minervaMetadata = this.dataset.getMinervaMetadata();
            minervaMetadata.mapper = mapper;

            // save the dataset with updated metadata
            this.$('button.m-save-keymap-mapping').addClass('disabled');
            this.dataset.once('m:minervaMetadataSaved', function () {
                this.dataset.on('m:geojsonCreated', function () {
                    this.$el.modal('hide');
                    // TODO is this ok to do?
                    // can't seem to get the dataset panel to pick up the update events from collection or dataset
                    this.parentView.render();
                }, this);
                this.dataset.createGeoJson(mapper.dateKeypath, this.startTime, this.endTime);
            }, this).off('g:error').on('g:error', function (err) {
                this.$('.g-validation-failed-message').text(err.responseJSON.message);
                this.$('button.m-save-keymap-mapping').removeClass('disabled');
            }, this).saveMinervaMetadata(minervaMetadata);
        },
        'change #m-latitude-mapper': function () {
            var jsonpathLat = this.$('#m-latitude-mapper').val();
            var latExampleVal = jsonPath.eval(this.jsonrowData, jsonpathLat); // jshint ignore:line
            // TODO npm installs v 0.10.0 of jsonPath, v 0.11.0 creates a new
            // public method called evalaute so these jshint ignores won't be necessary
            // upgrade to v 0.11.0 from source repo or once updated in npm
            this.$('#m-latitude-example-value').val(latExampleVal);
        },
        'change #m-longitude-mapper': function () {
            var jsonpathLong = this.$('#m-longitude-mapper').val();
            var longExampleVal = jsonPath.eval(this.jsonrowData, jsonpathLong); // jshint ignore:line
            this.$('#m-longitude-example-value').val(longExampleVal);
        },
        'change #m-date-range-filter-mapper': function () {
            this.populateDateRangeFilter();
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
        this.minervaMetadata = this.dataset.getMinervaMetadata();
        if (this.minervaMetadata.mapper) {
            this.create = false;
        } else {
            this.create = true;
        }
        this.jsonrowData = this.dataset.getJsonRowData();
    },

    populateDateRangeFilter: function () {
        var jsonpathDate = this.$('#m-date-range-filter-mapper').val();
        if (jsonpathDate) {
            var dateExampleVal = jsonPath.eval(this.jsonrowData, jsonpathDate); // jshint ignore:line
            this.$('#m-date-example-value').val(dateExampleVal);
            if (dateExampleVal.length > 0) {
                // TODO
                // probably want a button to trigger this

                function secondsSinceEpochToDateString(seconds) {
                    var d = new Date(seconds * 1000);
                    var dateString = d.getUTCFullYear() +"-"+
                        ("0" + (d.getUTCMonth()+1)).slice(-2) +"-"+
                        ("0" + d.getUTCDate()).slice(-2) + " " +
                        ("0" + d.getUTCHours()).slice(-2) + ":" +
                        ("0" + d.getUTCMinutes()).slice(-2) + ":" +
                        ("0" + d.getUTCSeconds()).slice(-2);
                    return dateString;
                }

                this.dataset.on('m:externalMongoLimitsGot', function () {
                    var jsonpathDate = this.$('#m-date-range-filter-mapper').val();
                    var fields = this.dataset.getMinervaMetadata().mongo_fields;
                    var fieldLimits = fields[jsonpathDate];
                    // fieldLimits are epoch time, convert to date
                    this.startTime = fieldLimits.min;
                    this.endTime = fieldLimits.max;
                    var startTimeString = secondsSinceEpochToDateString(this.startTime);
                    var endTimeString = secondsSinceEpochToDateString(this.endTime);
                    this.$('#m-date-range-filter').prop('disabled', false);
                    this.$('#m-date-range-filter').val(startTimeString + ' - ' + endTimeString);
                    this.$('#m-date-range-filter').daterangepicker({
                        timePicker: true,
                        //timeZone: "00:00",
                        format: 'YYYY-MM-DD H:mm:s',
                        //format: 'YYYY-MM-DD h:mm:s',
                        timePickerIncrement: 30,
                        timePicker12Hour: false,
                        minDate: startTimeString,
                        maxDate: endTimeString,
                        timePickerSeconds: false
                    });
                    this.$('#m-date-range-filter').on('apply.daterangepicker', _.bind(function (ev, picker) {
                        // HACK super ugly convert to GMT - 4
                        this.startTime = (Date.parse(picker.startDate._d.toISOString()) / 1000) - (4*3600);
                        this.endTime = (Date.parse(picker.endDate._d.toISOString()) / 1000) - (4*3600);
                    }, this));
                }, this);
                this.dataset.getExternalMongoLimits(jsonpathDate);
            } else {
                this.$('#m-date-range-filter').val('');
            }
        }
    },

    render: function () {
        var longitudeKeypath = null,
            latitudeKeypath = null,
            dateKeypath = null,
            latExampleVal = null,
            longExampleVal = null,
            dateExampleVal = null,
        if (!this.create) {
            longitudeKeypath = this.minervaMetadata.mapper.longitudeKeypath;
            latitudeKeypath = this.minervaMetadata.mapper.latitudeKeypath;
            dateKeypath = this.minervaMetadata.mapper.dateKeypath;
            latExampleVal = jsonPath.eval(this.jsonrowData, latitudeKeypath); // jshint ignore:line
            longExampleVal = jsonPath.eval(this.jsonrowData, longitudeKeypath); // jshint ignore:line
            dateExampleVal = jsonPath.eval(this.jsonrowData, dateKeypath); // jshint ignore:line
        }
        var modal = this.$el.html(minerva.templates.keymapWidget({
            create: this.create,
            longitudeKeypath: longitudeKeypath,
            latitudeKeypath: latitudeKeypath,
            dateKeypath: dateKeypath,
            latExampleVal: latExampleVal,
            longExampleVal: longExampleVal,
            dateExampleVal: dateExampleVal
        })).girderModal(this).on('shown.bs.modal', function () {
        }).on('hidden.bs.modal', function () {
        }).on('ready.girder.modal', _.bind(function () {
            this.$('#jsonrow-preview').text(JSON.stringify(this.jsonrowData, null, 4));
            this.populateDateRangeFilter();
        }, this));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

        return this;
    }

});
