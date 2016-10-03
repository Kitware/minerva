minerva.models.SessionModel = minerva.models.MinervaModel.extend({

    _featureFromDataset: function (dataset) {
        var feature = {
            datasetId: dataset.id
        };
        return feature;
    },

    _featureIdentityPredicate: function (feature) {
        return function (otherFeature) {
            return otherFeature.datasetId === feature.datasetId;
        };
    },

    datasetInFeatures: function (dataset) {
        var datasetFinder = this._featureIdentityPredicate(this._featureFromDataset(dataset));
        return _.some(this.metadata().map.features, datasetFinder);
    },

    addLayoutAttributes: function (panelView, attributes) {
        var metadata = this.metadata();
        if (!_.has(metadata, 'layout')) {
            metadata.layout = {};
        }

        if (!_.has(_.keys(metadata.layout, panelView))) {
            metadata.layout[panelView] = attributes;
        } else {
            _.extend(metadata.layout[panelView], attributes);
        }
    },

    addDataset: function (dataset) {
        // for now just add them to a list
        // may want to unify caching of geojson file id
        // TODO may need to be smarter about finding
        // especially if we copy the file into our session item and the ids change
        var metadata = this.metadata().map;
        var feature = this._featureFromDataset(dataset);
        if (!_.find(metadata.features, this._featureIdentityPredicate(feature))) {
            metadata.features.push(feature);
        }
        // TODO may need to set this to changed because not using setX
    },

    removeDataset: function (dataset) {
        var metadata = this.metadata().map;
        var feature = this._featureFromDataset(dataset);
        var featureIdentifier = this._featureIdentityPredicate(feature);
        metadata.features = _.reject(metadata.features, featureIdentifier);
        // TODO may need to set this to changed because not using setX
    },

    /**
     * Async function that initializes the session with minerva metadata, including some defaults
     * for the map.
     *
     * @fires 'm:session_saved' event upon successful Session creation.
     */
    createSessionMetadata: function () {
        var metadata = this.metadata() || {};
        // TODO this is highly map centric, probably should be split out
        var map = {};
        map.basemap = 'osm';
        map.basemap_args = {
            url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: 'Tile data &copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        };
        map.center = {x: -100, y: 36.5};
        map.zoom = 4;
        map.features = [];
        metadata.map = map;
        this.on('m:metadata_saved', function () {
            this.trigger('m:session_saved', this);
        }, this).saveMinervaMetadata(metadata);
    },

    /**
     * Async function that saves the session's minerva metadata.
     *
     * @fires 'm:session_saved' event upon successful Session save.
     */
    saveSession: function () {
        this.on('m:metadata_saved', function () {
            this.trigger('m:session_saved', this);
        }, this).saveMinervaMetadata();
    }
});
