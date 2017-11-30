import _ from 'underscore';
import Backbone from 'backbone';

/**
 * Definition of the AdapterRegistry, which maps adapters types
 * to adapter defintions.
 */
function AdapterRegistry() {
    this.registry = {};

    /**
     * Register an adapter definition to a type name, overriding any existing
     * definition for that type name.
     *
     * @param {string} type - The type name of the adapter
     * @param {rendering.geo.MapRepresentation} definition - The definition of a GeoJs layer representation
     */
    this.register = function (type, definition) {
        this.registry[type] = definition;
    };

    /**
     * Async function to create a representation for the passed in dataset
     * of the desired layerType, to be rendered in the passed in MapContainer.
     *
     * @param {Object} container - An implementor of the MapContainer interface
     * @param {minerva.models.DatasetModel} dataset - The dataset to be rendered
     * @param {string} layerType - The type of map visualization used to render the dataset
     * @param {Object} visProperties - Properties used to render the dataset as a layerType
     * @fires 'm:map_adapter_layerCreated' event upon successful layer creation
     * @fires 'm:map_adapter_layerError' event upon an error creating the layer
     */
    this._createRepresentation = function (container, dataset, layerType, visProperties) {
        if (layerType === null || !_.has(this.registry, layerType)) {
            console.error('This dataset cannot be adapted to a map layer of type [' + layerType + '].');
            dataset.trigger('m:map_adapter_error', dataset, layerType);
        } else {
            var Adapter = this.registry[layerType];
            var layerRepr = _.extend(new Adapter(), Backbone.Events);
            dataset.once('m:dataset_geo_dataLoaded', function () {
                layerRepr.once('m:map_layer_renderable', function (layer) {
                    dataset.trigger('m:map_adapter_layerCreated', layer);
                }, this).once('m:map_layer_error', function (layer) {
                    dataset.trigger('m:map_adapter_layerError', layer);
                }, this).init(container, dataset, visProperties, dataset.get('geoData'));
            }, this).loadGeoData();
            //
            // Instead of dataset.loadGeoData, ideally this would allow a call
            // to the server to load the geo data rendered.
            //
            // girder.RestRequest({
            //     type: "POST"
            //     url: "adapter/" + dataset._id + "/" + layerType.toString()(),
            //     params: userInput,
            // }).success(function (data){
            //     createLayer
            // });
        }
    };
}

const registry = _.extend(new AdapterRegistry(), Backbone.Events);

export default registry;
