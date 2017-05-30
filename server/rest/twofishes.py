import json
import StringIO

import geojson
import requests
from shapely.wkt import loads

from girder.api import access
from girder.api.describe import Description
from girder.api.rest import Resource
from girder.utility.model_importer import ModelImporter
from girder.plugins.minerva.rest.geojson_dataset import GeojsonDataset
from girder.plugins.minerva.utility.minerva_utility import findDatasetFolder


class TwoFishes(Resource):
    def __init__(self):
        self.resourceName = 'minerva_geocoder'
        self.route('GET', ('autocomplete',), self.autocomplete)
        self.route('GET', ('geojson',), self.getGeojson)
        self.route('POST', ('geojson',), self.postGeojson)

    @staticmethod
    def getWktFromTwoFishes(twofishes, location):
        """Gets wkt from twofishes for a given location"""
        r = requests.get(twofishes,
                         params={'query': location,
                                 'responseIncludes': 'WKT_GEOMETRY'})
        wkt = r.json()['interpretations'][0]['feature']['geometry']['wktGeometry']

        return wkt

    @staticmethod
    def createGeometryFromWkt(wkt):
        """Creates a shapely geometry from wkt"""
        return loads(wkt)

    @staticmethod
    def createGeojson(twofishes, locations):
        """Create geojson for given locations and twofishes url"""
        geoms = []

        for i in locations:
            wkt = TwoFishes.getWktFromTwoFishes(twofishes, i)
            geom = TwoFishes.createGeometryFromWkt(wkt)
            for g in geom:
                geoms.append(geojson.Feature(geometry=g,
                                             properties={'location': i}))

        multiPoly = geojson.FeatureCollection(geoms)

        return multiPoly

    def createMinervaDataset(self, geojsonString, name):
        """Creates a dataset from a geojson string"""
        output = StringIO.StringIO(json.dumps(geojsonString))
        outputSize = output.len
        user = self.getCurrentUser()
        datasetFolder = findDatasetFolder(user, user)
        itemModel = ModelImporter.model('item')
        uploadModel = ModelImporter.model('upload')
        item = itemModel.createItem(name, user, datasetFolder)
        geojsonFile = uploadModel.uploadFromFile(output, outputSize, name,
                                                 'item', item, user)
        GeojsonDataset().createGeojsonDataset(itemId=geojsonFile['itemId'],
                                              params={})
        return geojsonFile

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

    @access.public
    def getGeojson(self, params):
        locations = json.loads(params['locations'])
        geojson = TwoFishes.createGeojson(params['twofishes'], locations)
        return geojson

    getGeojson.description = (
        Description('Create a geojson string from multiple locations')
        .param('twofishes', 'Twofishes url')
        .param('locations', 'List of locations', dataType='list')
    )

    @access.public
    def postGeojson(self, params):
        twofishes = params['twofishes']
        try:
            locationInfo = json.loads(params['locations'])
            geojson = TwoFishes.createGeojson(twofishes, locationInfo)
        except ValueError:
            locationInfo = params['locations']
            geojson = TwoFishes.createGeojson(twofishes, locationInfo)

        minervaDataset = self.createMinervaDataset(geojson, params['name'])
        return minervaDataset

    postGeojson.description = (
        Description('Create a minerva dataset from the search result/results')
        .param('twofishes', 'Twofishes url')
        .param('locations', 'Location name or list of locations to get a geojson')
        .param('name', 'Name for the geojson dataset')
    )
