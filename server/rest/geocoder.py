#!/usr/bin/env python
# -*- coding: utf-8 -*-

###############################################################################
#  Copyright Kitware Inc.
#
#  Licensed under the Apache License, Version 2.0 ( the "License" );
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
###############################################################################

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


class Geocoder(Resource):
    """Resource that handles geocoding related operations"""
    def __init__(self):
        super(Geocoder, self).__init__()
        self.resourceName = 'minerva_geocoder'
        self.route('GET', ('geojson',), self.getGeojson)
        self.route('POST', ('geojson',), self.postGeojson)

    @staticmethod
    def getWktFromGeocoder(geocoder, location):
        """Gets wkt from geocoder for a given location"""
        r = requests.get(geocoder,
                         params={'q': location,
                                 'polygon_text': 1,
                                 'format': 'jsonv2'})
        wkt = r.json()[0]['geotext']

        return wkt

    @staticmethod
    def createGeometryFromWkt(wkt):
        """Creates a shapely geometry from wkt"""
        return loads(wkt)

    @staticmethod
    def createGeojson(geocoder, locations):
        """Create geojson for given locations and geocoder url"""

        geoms = []

        for i in locations:
            wkt = Geocoder.getWktFromGeocoder(geocoder, i)
            geom = Geocoder.createGeometryFromWkt(wkt)
            try:
                for g in geom:
                    geoms.append(geojson.Feature(geometry=g,
                                                 properties={'location': i}))
            except TypeError:
                geoms.append(geojson.Feature(geometry=geom,
                                             properties={'location': i}))
        multiPoly = geojson.FeatureCollection(geoms)

        return multiPoly

    def createMinervaDataset(self, geojsonString, name):
        """Creates a dataset from a geojson string"""
        output = StringIO.StringIO(json.dumps(geojsonString))
        outputSize = output.len
        user = self.getCurrentUser()
        datasetFolder = findDatasetFolder(user, user, create=True)
        itemModel = ModelImporter.model('item')
        uploadModel = ModelImporter.model('upload')
        item = itemModel.createItem(name, user, datasetFolder)
        geojsonFile = uploadModel.uploadFromFile(output, outputSize, name,
                                                 'item', item, user)
        GeojsonDataset().createGeojsonDataset(itemId=geojsonFile['itemId'],
                                              params={})
        return geojsonFile

    @access.public
    def getGeojson(self, params):
        locations = json.loads(params['locations'])
        geojson = Geocoder.createGeojson(params['geocoder'], locations)
        return geojson

    getGeojson.description = (
        Description('Create a geojson string from multiple locations')
        .param('geocoder', 'Geocoder url')
        .param('locations', 'List of locations', dataType='list')
    )

    @access.public
    def postGeojson(self, params):
        geocoder = params['geocoder']
        try:
            locationInfo = json.loads(params['locations'])
            geojson = Geocoder.createGeojson(geocoder, locationInfo)
        except ValueError:
            locationInfo = params['locations']
            geojson = Geocoder.createGeojson(geocoder, locationInfo)

        minervaDataset = self.createMinervaDataset(geojson, params['name'])
        return minervaDataset

    postGeojson.description = (
        Description('Create a minerva dataset from the search result/results')
        .param('geocoder', 'Geocoder url')
        .param('locations', 'Location name or list of locations to get a geojson')
        .param('name', 'Name for the geojson dataset')
    )
