import requests

from girder.api import access
from girder.api.describe import Description
from girder.api.rest import Resource

class TwoFishes(Resource):
    def __init__(self):
        self.resourceName = 'minerva_geocoder'
        self.route('GET', (), self.geocode)

    @access.public
    def geocode(self, params):
        r = requests.get(params['twofishes'],
                         params={'query': params['location'],
                                 'responseIncludes': 'WKT_GEOMETRY'})
        return r.json()

    geocode.description = (
        Description('Get geojson for a given location name')
        .param('twofishes', 'Twofishes url')
        .param('location', 'Location name to get a geojson')
    )
