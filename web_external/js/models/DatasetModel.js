minerva.models.DatasetModel = minerva.models.MinervaModel.extend({

    defaults: {
        geojsonFileId: null,
        displayed: false,
        files: null,
        opacity: 1,
        order: null,
        stack: 0
    },

    isDownloadable: function () {
        return false;
    },

    isRenderable: function () {
        // Really this function should be defined in each data model subclass,
        // OR - based on whether or not geoFileReader is defined (better because
        // then readability is based on whether GeoJS has a reader for this type)
        // but to do that we would have to be persisting geoFileReader to the server
        // which would require some things being rearranged.

        // For now we know that if original_type is 'json' it's ACTUALLY contour json,
        // which is the only renderable type of DatasetModel.
        return $.inArray(this.getMinervaMetadata().original_type,
            ['json', 'mongo']);
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
            this.metadata(resp);
            var minervaMetadata = this.metadata();
            if (_.has(minervaMetadata, 'geojson_file')) {
                this.trigger('m:datasetCreated', this);
            } else {
                var originalType = minervaMetadata.original_type;
                if (originalType === 'shapefile') {
                    this.on('m:geojsonCreated', function () {
                        this.trigger('m:datasetCreated', this);
                    }, this);
                    this.createGeoJson();
                } else if (originalType === 'csv') {
                    // cannot do further processing without user input
                    this.trigger('m:datasetCreated', this);
                } else if (originalType === 'json') {
                    // cannot do further processing without user input
                    this.on('m:jsonrowGot', function () {
                        this.trigger('m:datasetCreated', this);
                    }, this).getJsonRow();
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

    getDatasetType: function () {
        // this is the start of trying to build an interface around the minerva metadata
        var minervaMetadata = this.metadata();
        return _.has(minervaMetadata, 'dataset_type') ? minervaMetadata.dataset_type :
            (_.has(minervaMetadata, 'original_type') ? minervaMetadata.original_type : null);
    },

    // functions dealing with json type
    // TODO split out to a subclass

    getJsonRow: function () {
        var minervaMetadata = this.metadata();
        if (!_.has(minervaMetadata, 'json_row')) {
            girder.restRequest({
                path: 'minerva_dataset/' + this.get('_id') + '/jsonrow',
                type: 'POST'
            }).done(_.bind(function (resp) {
                this.metadata(resp);
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
        var minervaMetadata = this.metadata();
        return _.has(minervaMetadata, 'json_row') ? minervaMetadata.json_row : null;
    },

    // TODO organize

    createGeoJson: function (dateKeypath, startTime, endTime) {
        var data = {};
        // TODO protect if params undefined
        if (dateKeypath) {
            data = {
                dateField: dateKeypath,
                startTime: startTime,
                endTime: endTime
            };
        }
        girder.restRequest({
            path: 'minerva_dataset/' + this.get('_id') + '/geojson',
            type: 'POST',
            data: data
        }).done(_.bind(function (resp) {
            this.metadata(resp);
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
        var minervaMeta = this.metadata();
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
        this.fileData = JSON.stringify(geoJsonData);
        this.geoJsonFile = new girder.models.FileModel();
        this.geoJsonFile.on('g:upload.complete', function () {
            minervaMeta.geojson_file = {
                _id: this.geoJsonFile.get('_id'),
                name: this.geoJsonFile.get('name')
            };
            this.on('m:minervaMetadataSaved', function () {
                this.trigger('m:geojsonCreatedFromTabular');
            }, this);
            this.saveMinervaMetadata(minervaMeta);
        }, this).uploadToItem(this, this.fileData, this.get('name') + '.geojson', 'application/json');
    },

    loadData: function () {
        // underscore doesn't have a deep has() unction?

        if (this.geoJsonAvailable) {
            this.loadGeoJsonData();
        } else {
            var file_id;
            var minervaMeta = this.metadata();
            // Manage contourJson style files here
            // for now. (will refactor this and loadGeoJsonData later)
            try {
                // need better API here or something -  why doesn't underscore
                // have a recursive _.has()? e.g., _.has(minervaMeta, "original_files", 0, "_id")
                file_id = minervaMeta.original_files[0]._id;
            } catch (e) {
                file_id = false;
            }
            if (file_id) {
                $.ajax({
                    url: girder.apiRoot + '/file/' + minervaMeta.original_files[0]._id + '/download',
                    contentType: 'application/json',
                    success: _.bind(function (data) {
                        this.fileData = data;
                        this.geoFileReader = 'contourJsonReader';
                    }, this),
                    complete: _.bind(function () {
                        this.trigger('m:dataLoaded', this.get('_id'));
                    }, this)
                });
            }
        }
    },

    loadGeoJsonData: function () {
        if (this.geoJsonAvailable) {
            var minervaMeta = this.metadata();
            if (minervaMeta.geojson_file) {
                // just download from the endpoint
                $.ajax({
                    url: girder.apiRoot + '/file/' + minervaMeta.geojson_file._id + '/download',
                    contentType: 'application/json',
                    success: _.bind(function (data) {
                        this.fileData = data;
                    }, this),
                    complete: _.bind(function () {
                        this.trigger('m:dataLoaded', this.get('_id'));
                    }, this)
                });
            } else if (minervaMeta.geojson) {
                this.filedata = minervaMeta.geojson.data;
                this.geoFileReader = 'jsonReader';
                this.trigger('m:geoJsonDataLoaded', this.get('_id'));
                this.trigger('m:dataLoaded', this.get('_id'));
            } else if (minervaMeta.original_type === 'mongo') {
                $.ajax({
                    url: girder.apiRoot + '/minerva_dataset_mongo/' + minervaMeta.dataset_id + '/geojson',
                    contentType: 'application/json',
                    success: _.bind(function (data) {
                        this.fileData = data;
                    }, this),
                    complete: _.bind(function () {
                        this.geoFileReader = 'jsonReader';
                        this.trigger('m:geoJsonDataLoaded', this.get('_id'));
                        this.trigger('m:dataLoaded', this.get('_id'));
                    }, this)
                });
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
                this.fileData = JSON.stringify(geoJsonData);
                this.geoFileReader = 'jsonReader';
                this.trigger('m:geoJsonDataLoaded', this.get('_id'));
                this.trigger('m:dataLoaded', this.get('_id'));
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
