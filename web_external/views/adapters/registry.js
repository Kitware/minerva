import _ from 'underscore';
import Backbone from 'backbone';

/**
 * Definition of the AdapterRegistry, which maps adapters types
 * to adapter defintions.
 */
function AdapterRegistry() {
    window.__minervaAdapterRegistry = window.__minervaAdapterRegistry || {};
    this.registry = window.__minervaAdapterRegistry;

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
     */
    this._createRepresentation = function (container, dataset, layerType, visProperties) {
        if (layerType === null || !_.has(this.registry, layerType)) {
            var message = 'This dataset cannot be adapted to a map layer of type [' + layerType + '].';
            console.error(message);
            return Promise.reject(message);
        } else {
            var Adapter = this.registry[layerType];
            var layerRepr = _.extend(new Adapter(), Backbone.Events);
            return dataset
                .loadGeoData()
                .then(() => {
                    try {
                        layerRepr.init(container, dataset, visProperties, dataset.get('geoData'));
                        return layerRepr;
                    } catch (err) {
                        throw layerRepr;
                    }
                });
        }
    };
}

const registry = _.extend(new AdapterRegistry(), Backbone.Events);

export default registry;
