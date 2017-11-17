/**
 * Base MapRepresentation definition
 */
class MapRepresentation {
    /**
     * Delete this instance of a MapRepresentation from the MapContainer
     *
     * @param {Object} container - An implementor of the MapContainer interface
     */
    delete(container) {
        container.deleteLayer(this.geoJsLayer);
    }

    /**
     * Set the opacity on the rendered instance of a MapRepresentation
     *
     * @param {number} opacity - Opacity value between 0 and 1
     */
    setOpacity(opacity) {
        this.geoJsLayer.opacity(opacity);
    }

    /**
     * Render this instance of a MapRepresentation into the MapContainer
     *
     * @param {Object} container - An implementor of the MapContainer interface
     */
    render(container) {
        container.renderMap();
    }
}
export default MapRepresentation;
