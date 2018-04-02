import geo from 'geojs';

import registry from './registry';
import MapRepresentation from './MapRepresentation';
import GeometryRepresentation from './GeometryRepresentation';
import LargeImageRepresentation from './LargeImageRepresentation';
import WmsRepresentation from './WmsRepresentation';
import WMS2Representation from './WMS2Representation';
import ContourRepresentation from './ContourRepresentation';
import ChoroplethRepresentation from './ChoroplethRepresentation';

window.geo = geo;

export {
    registry,
    MapRepresentation,
    GeometryRepresentation,
    LargeImageRepresentation,
    WmsRepresentation,
    WMS2Representation,
    ContourRepresentation,
    ChoroplethRepresentation
};
