import requests
from shapely.wkt import loads
from shapely.geometry import mapping

from girder.api import access
from girder.api.describe import Description
from girder.api.rest import Resource


class TwoFishes(Resource):
    def __init__(self):
        self.resourceName = 'minerva_geocoder'
        self.route('GET', (), self.geocode)
        self.route('GET', ('autocomplete',), self.autocomplete)

    @access.public
    def geocode(self, params):
        r = requests.get(params['twofishes'],
                         params={'query': params['location'],
                                 'responseIncludes': 'WKT_GEOMETRY'})
        wkt = r.json()['interpretations'][0]['feature']['geometry']['wktGeometry']
        return mapping(loads(wkt))

    geocode.description = (
        Description('Get geojson for a given location name')
        .param('twofishes', 'Twofishes url')
        .param('location', 'Location name to get a geojson')
    )

    @access.public
    def autocomplete(self, params):
        r = requests.get(params['twofishes'],
                         params={'autocomplete': True,
                                 'query': params['location'],
                                 'maxInterpretations': 10,
                                 'autocompleteBias': None})

        return [i['feature']['matchedName'] for i in r.json()['interpretations']]

    autocomplete.description = (
        Description('Autocomplete result for a given location name')
        .param('twofishes', 'Twofishes url')
        .param('location', 'Location name to autocomplete')
    )
