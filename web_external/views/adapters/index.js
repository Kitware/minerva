import geo from 'geojs';

import registry from './registry';
import MapRepresentation from './MapRepresentation';
import GeometryRepresentation from './GeometryRepresentation';
import KtileRepresentation from './KtileRepresentation';
import WmsRepresentation from './WmsRepresentation';
import ContourRepresentation from './ContourRepresentation';
import ChoroplethRepresentation from './ChoroplethRepresentation';

window.geo = geo;

export {
    registry,
    MapRepresentation,
    GeometryRepresentation,
    KtileRepresentation,
    WmsRepresentation,
    ContourRepresentation,
    ChoroplethRepresentation
};
