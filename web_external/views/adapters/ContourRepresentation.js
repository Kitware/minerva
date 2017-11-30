import registry from './registry';

import GeometryRepresentation from './GeometryRepresentation';

/**
 * Generic GeoJs Contour MapRepresentation definition, with type 'contour'.
 */
class ContourRepresentation extends GeometryRepresentation {
    constructor() {
        super();
        this.readerType = 'contourJsonReader';
    }
}

registry.register('contour', ContourRepresentation);

export default ContourRepresentation;
