import json
import StringIO

import requests
from shapely.wkt import loads
from shapely.geometry import mapping

from girder.api import access
from girder.api.describe import Description
from girder.api.rest import Resource
from girder.utility.model_importer import ModelImporter
from girder.plugins.minerva.rest.geojson_dataset import GeojsonDataset
from girder.plugins.minerva.utility.minerva_utility import findDatasetFolder


class TwoFishes(Resource):
    def __init__(self):
        self.resourceName = 'minerva_geocoder'
        self.route('GET', (), self.geocode)
        self.route('POST', (), self.createGeoJsonItem)
        self.route('GET', ('autocomplete',), self.autocomplete)

    @staticmethod
    def getGeoJsonFromTwoFishes(params):
        r = requests.get(params['twofishes'],
                         params={'query': params['location'],
                                 'responseIncludes': 'WKT_GEOMETRY'})
        wkt = r.json()['interpretations'][0]['feature']['geometry']['wktGeometry']
        return mapping(loads(wkt))

    @access.public
    def geocode(self, params):
        geojson = TwoFishes.getGeoJsonFromTwoFishes(params)
        return geojson

    geocode.description = (
        Description('Get geojson for a given location name')
        .param('twofishes', 'Twofishes url')
        .param('location', 'Location name to get a geojson')
    )

    @access.public
    def createGeoJsonItem(self, params):
        geojson = TwoFishes.getGeoJsonFromTwoFishes(params)
        output = StringIO.StringIO(json.dumps(geojson))
        outputSize = output.len
        user = self.getCurrentUser()
        datasetFolder = findDatasetFolder(user, user)
        itemModel = ModelImporter.model('item')
        uploadModel = ModelImporter.model('upload')
        fileName = '{}.geojson'.format(params['location'])
        item = itemModel.createItem(fileName, user, datasetFolder)
        geojsonFile = uploadModel.uploadFromFile(output, outputSize, fileName,
                                                 'item', item, user)
        GeojsonDataset().createGeojsonDataset(itemId=geojsonFile['itemId'],
                                              params={})
        return geojsonFile

    createGeoJsonItem.description = (
        Description('Create a minerva dataset from the search result')
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
