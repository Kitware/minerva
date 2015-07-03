minerva.models.DatasetModel = girder.models.ItemModel.extend({

    defaults: {
        geojsonFileId: null,
        displayed: false,
        files: null
    },

    // TODO put in a toJson method ignoring displayed and other state

    initialize: function () {
        // populate the dataset with minerva metadata
        var minervaMetadata = this.getMinervaMetadata();
        if (minervaMetadata) {
            this.setMinervaMetadata(minervaMetadata);
        }
    },

    createDataset: function () {
        // call this after uploading an item to the dataset folder
        // will ensure that this dataset is usable as a dataset, which
        // means initializing the minerva metadata on the item and
        // the geojson exists
        // TODO may need rethink when this geojson creation occurs
        // as operations get slower on big files
        girder.restRequest({
            path: 'minerva_dataset/' + this.get('_id') + '/dataset',
            type: 'POST'
        }).done(_.bind(function (resp) {
            this.setMinervaMetadata(resp);//this.set('meta', _.extend(this.get('meta') || {}, {minerva: resp}));
            if (_.has(this.get('meta').minerva, 'geojson_file')) {
                this.trigger('m:datasetCreated', this);
            } else {
                var originalType = this.get('meta').minerva.original_type;
                if (originalType === 'shapefile') {
                    this.on('m:geojsonCreated', function () {
                        this.trigger('m:datasetCreated', this);
                    }, this);
                    this.createGeoJson();
                } else if (originalType === 'csv' || originalType === 'json') {
                    // cannot do further processing without user input
                    this.trigger('m:datasetCreated', this);
                }
            }
        }, this)).error(_.bind(function (err) {
            console.error(err);
            girder.events.trigger('g:alert', {
                icon: 'cancel',
                text: 'Could not create dataset from dataset item.',
                type: 'error',
                timeout: 4000
            });
        }, this));
    },

    //
    // this is the start of trying to build an interface around the minerva metadata
    // TODO what assumptions/error handling to make for minerva metadata
    //
    //

    getMinervaMetadata: function () {
        // for now assume that keys exists and allow exceptions to happen if they don't
        var meta = this.get('meta');
        if (meta) {
            var minervaMetadata = meta.minerva;
            return minervaMetadata;
        } else {
            return false;
        }
    },

    setMinervaMetadata: function (minervaMetadata) {
        this.set('meta', _.extend(this.get('meta') || {}, {minerva: minervaMetadata}));
        // TODO may want an extend minervaMetadata, this one replaces
        if (minervaMetadata.geojson_file || minervaMetadata.geojson) {
            this.geoJsonAvailable = true;
        }
        if (minervaMetadata.geojson && minervaMetadata.geojson.data) {
            this.geoJsonData = minervaMetadata.geojson.data;
        }
    },

    saveMinervaMetadata: function (minervaMetadata) {
        if (minervaMetadata) {
            this.setMinervaMetadata(minervaMetadata);
        }
        girder.restRequest({
            path: 'item/' + this.get('_id') + '/metadata',
            type: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(this.get('meta'))
        }).done(_.bind(function () {
            this.trigger('m:minervaMetadataSaved', this);
        }, this)).error(_.bind(function (err) {
            console.error(err);
            girder.events.trigger('g:alert', {
                icon: 'cancel',
                text: 'Could not update Minera metadata in dataset item.',
                type: 'error',
                timeout: 4000
            });
        }, this));
    },

    getDatasetType: function () {
        // this is the start of trying to build an interface around the minerva metadata
        var minervaMetadata = this.getMinervaMetadata();
        return _.has(minervaMetadata, 'original_type') ? minervaMetadata.original_type : null;
    },

    // functions dealing with json type
    // TODO split out to a subclass

    getJsonRow: function () {
        console.log('getJsonRow');
        var minervaMetadata = this.getMinervaMetadata();
        if (!_.has(minervaMetadata, 'json_row')) {
            girder.restRequest({
                path: 'minerva_dataset/' + this.get('_id') + '/jsonrow',
                type: 'POST'
            }).done(_.bind(function (resp) {
                this.setMinervaMetadata(resp);
                this.trigger('m:jsonrowGot', this);
            }, this)).error(_.bind(function (err) {
                console.error(err);
                girder.events.trigger('g:alert', {
                    icon: 'cancel',
                    text: 'Could not get jsonrow in dataset item.',
                    type: 'error',
                    timeout: 4000
                });
            }, this));
        } else {
            this.trigger('m:jsonrowGot', this);
        }
    },

    getJsonRowData: function () {
        // assumes jsonrow is available in metdata
        var minervaMetadata = this.getMinervaMetadata();
        console.log(minervaMetadata);
        return _.has(minervaMetadata, 'json_row') ? minervaMetadata.json_row : null;
    },

    // TODO organize
                //this.dataset.createGeoJsonFromJson();
                //this.dataset.on('m:geojsonCreatedFromJson', function () {

    createGeoJson: function () {
        girder.restRequest({
            path: 'minerva_dataset/' + this.get('_id') + '/geojson',
            type: 'POST'
        }).done(_.bind(function (resp) {
            this.setMinervaMetadata(resp);
            this.trigger('m:geojsonCreated', this);
        }, this)).error(_.bind(function (err) {
            console.error(err);
            girder.events.trigger('g:alert', {
                icon: 'cancel',
                text: 'Could not create geojson in dataset item.',
                type: 'error',
                timeout: 4000
            });
        }, this));
    },

    getFullDataset: function () {
        // TODO maybe this isn't needed
        // get the full item
        console.log('DatasetModel.getFullDataset, no implementation');
    },

    getAllFiles: function (callback) {
        if (!this.files) {
            this.files = new girder.collections.FileCollection();
            this.files.resourceName = 'item/' + this.get('_id') + '/files';
            this.files.append = true; // Append, don't replace pages
            this.files.on('g:changed', function () {
                callback(this);
            }, this).fetch();
        } else {
            callback(this);
        }
    },

   // TODO split CSV functionality out possibly to a subclass

    getCSVFile: function (callback) {
        var processCSVFile = _.bind(function () {
            // TODO get the csv in some smarter way
            // the file object has a mimeType, which could check for text/csv
            // TODO better dealing with getting model from collection
            $.ajax({
                url: girder.apiRoot + '/file/' + this.files.models[0].id + '/download',
                type: 'GET',
                headers: {
                    'Girder-Token': girder.cookie.find('girderToken'),
                    Accept: 'text/csv; charset=utf-8',
                    'Content-Type': 'text/csv; charset=utf-8'
                },
                success: _.bind(function (resp) {
                    this.csv = Papa.parse(resp, {skipEmptyLines: true});
                    callback();
                }, this),
                error: function (err) {
                    console.error(err);
                    girder.events.trigger('g:alert', {
                        icon: 'cancel',
                        text: 'Could not download dataset csv contents.',
                        type: 'error',
                        timeout: 4000
                    });
                }
            });

        }, this);
        if (this.files) {
            processCSVFile();
        } else {
            this.getAllFiles(processCSVFile);
        }
    },

    createGeoJsonFromTabular: function () {
        // this is goofy, we are creating geojson from csv on the client
        // and then saving it to the server in the item as a file
        // then setting the geojson metadata pointer to the file
        //
        // already have the data client side when doing this, have to think
        // about whether to do all this server or client side
        var minervaMeta = this.getMinervaMetadata();
        var originalType = minervaMeta.original_type;
        if (originalType !== 'csv' && originalType !== 'json') {
            console.error('You should only use this for csv or json');
            return;
        }
        if (!minervaMeta.mapper) {
            console.error('mapper');
        }
        if (!minervaMeta.mapper.longitudeColumn) {
            console.error('long');
        }
        if (!minervaMeta.mapper.latitudeColumn) {
            console.error('lat');
        }
        if (!minervaMeta.mapper || !minervaMeta.mapper.longitudeColumn || !minervaMeta.mapper.latitudeColumn) {
            console.error('lat/long column mapping not set for this csv/json dataset.');
            return;
        }
        var longitudeColumn = minervaMeta.mapper.longitudeColumn;
        var latitudeColumn = minervaMeta.mapper.latitudeColumn;
        if (!this.csv || !this.csv.data) {
            console.error('This dataset lacks csv data to create geojson on the client.');
            return;
        }

        var geoJsonData = {
            type: 'FeatureCollection',
            features: []
        };
        // look at this.csv.data, an array
        // create a point feature for each row
        // use the mapper to get lat and long
        _.each(this.csv.data, function (row) {
            var point = {
                type: 'Feature',
                // TODO need to get other property column, just hardcoding elevation for now
                properties: { elevation: Number(0) },
                geometry: {
                    type: 'Point',
                    coordinates: [Number(row[longitudeColumn]), Number(row[latitudeColumn])]
                }
            };
            geoJsonData.features.push(point);
        }, this);
        this.geoJsonData = JSON.stringify(geoJsonData);
        this.geoJsonFile = new girder.models.FileModel();
        this.geoJsonFile.on('g:upload.complete', function () {
            minervaMeta.geojson_file = {_id: this.geoJsonFile.get('_id'), name: this.geoJsonFile.get('name')};
            this.on('m:minervaMetadataSaved', function () {
                this.trigger('m:geojsonCreatedFromTabular');
            }, this);
            this.saveMinervaMetadata(minervaMeta);
        }, this).uploadToItem(this, this.geoJsonData, this.get('name') + '.geojson', 'application/json');
    },

    loadGeoJsonData: function () {
        if (this.geoJsonAvailable) {
            var minervaMeta = this.getMinervaMetadata();
            if (minervaMeta.geojson_file) {
                // just download from the endpoint
                $.ajax({
                    url: girder.apiRoot + '/file/' + minervaMeta.geojson_file._id + '/download',
                    contentType: 'application/json',
                    success: _.bind(function (data) {
                        this.geoJsonData = data;
                    }, this),
                    complete: _.bind(function () {
                        this.trigger('m:geoJsonDataLoaded');
                    }, this)
                });
            } else if (minervaMeta.original_type === 'mongo') {
                // TODO search params
                // if mongo, we'll need to pass down some search params to a new
                // endpoint that will pull out of mongo and convert into geojson
                if (minervaMeta.geojson && minervaMeta.geojson.data) {
                    this.geoJsonData = minervaMeta.geojson.data;
                    this.trigger('m:geoJsonDataLoaded');
                } else {
                    this.on('m:geojsonCreated', function () {
                        var minervaMeta = this.getMinervaMetadata();
                        this.geoJsonData = minervaMeta.geojson.data;
                        this.trigger('m:geoJsonDataLoaded');
                    }, this).createGeoJson();
                }
            }
        } else {
            if (this.latLongMapper) {

                var geoJsonData = {
                    type: 'FeatureCollection',
                    features: []
                };
                // look at this.csv.data, an array
                // create a point feature for each row
                // use the mapper to get lat and long
                _.each(this.csv.data, function (row) {
                    var point = {
                        type: 'Feature',
                        // TODO need to get other property column, just hardcoding elevation for now
                        properties: { elevation: Number(0) },
                        geometry: {
                            type: 'Point',
                            coordinates: [Number(row[this.latLongMapper.longitudeColumn]), Number(row[this.latLongMapper.latitudeColumn])]
                        }
                    };
                    geoJsonData.features.push(point);
                }, this);
                this.geoJsonData = JSON.stringify(geoJsonData);
                this.trigger('m:geoJsonDataLoaded');
            }
        }
    },

    geocodeTweet: function () {
        girder.restRequest({
            path: 'item/' + this.get('_id') + '/geocodetweet',
            type: 'POST'
        }).done(_.bind(function (resp) {
            if (resp._id !== '') {
                this.geojsonFileId = resp._id;
                this.trigger('m:tweetGeocoded', this);
            } else {
                girder.events.trigger('g:alert', {
                    icon: 'cancel',
                    text: 'Could not geocode tweets.',
                    type: 'error',
                    timeout: 4000
                });
            }
        }, this)).error(_.bind(function (err) {
            console.error(err);
            girder.events.trigger('g:alert', {
                icon: 'cancel',
                text: 'Could not geocode tweets.',
                type: 'error',
                timeout: 4000
            });
        }, this));
    }

});
