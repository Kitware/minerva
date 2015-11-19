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
from girder.api import access
from girder.api.describe import Description
from girder.api.rest import loadmodel
from girder.constants import AccessType

from girder.plugins.minerva.rest.dataset import Dataset
import json


class MongoDataset(Dataset):

    def __init__(self):
        self.resourceName = 'minerva_dataset_mongo'
        self.route('POST', (), self.createMongoDataset)
        self.route('GET', (':id', 'external_mongo_limits'),
                   self.getExternalMongoLimits)

    def findExternalMongoLimits(self, item, field):
        minerva_metadata = item['meta']['minerva']
        mongo_connection = minerva_metadata['mongo_connection']
        connectionUri = mongo_connection['db_uri']
        collectionName = mongo_connection['collection_name']
        collection = self.mongoCollection(connectionUri, collectionName)
        minVal = (collection.find(limit=1).sort(field, 1))[0][field]
        maxVal = (collection.find(limit=1).sort(field, -1))[0][field]
        # update but don't save the meta, as it could become stale
        mongo_fields = minerva_metadata.get('mongo_fields', {})
        mongo_fields[field] = {'min': minVal, 'max': maxVal}
        minerva_metadata['mongo_fields'] = mongo_fields
        return minerva_metadata

    def convertToGeoJSON(self, collection, field='geometry', query=None):
        """
        Convert records w/spatial data from a mongo collection to GeoJSON
        :param collection: mongo collection to query
        :param field: Field in collection containing spatial data
        :param query: Query to filter collection results
        :return: A dict containing query_count (# records) & data (GeoJSON)
        """
        geojson = {
            "type": "FeatureCollection",
            "crs": {
                "type": "name",
                "properties": {
                    "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
                }
            }
        }
        query_count = collection.find(query).count()
        items = collection.find(query)
        features = []
        for rec in items:
            if 'properties' not in rec:
                properties = {}
                for property in rec:
                    if property != field and property != '_id':
                        properties[property] = rec[property]
                rec['properties'] = properties
            feature = {"geometry": rec[field],
                       "properties": rec["properties"],
                       "type": "Feature"}
            features.append(feature)
        geojson["features"] = features
        return {"query_count": query_count, "data": json.dumps(geojson)}

    @access.user
    @loadmodel(map={'mongoSourceId': 'mongoSource'}, model='item',
               level=AccessType.READ)
    def createMongoDataset(self, mongoSource, params):
        name = params["name"]
        collectionName = params["mongo_collection"]
        dbConnectionUri = \
            mongoSource['meta']['minerva']['mongo_connection']['db_uri']
        minerva_metadata = {
            'source_id': mongoSource['_id'],
            'original_type': 'mongo',
            'mongo_connection': {
                'db_uri': dbConnectionUri,
                'collection_name': collectionName
            }
        }
        # get the first entry in the collection, set as json_row
        # TODO integrate this with the methods for taking a row from a JSON
        # array in a file
        collection = self.mongoCollection(dbConnectionUri, collectionName)
        collectionList = list(collection.find(limit=1))
        # Check to see if this collection has a geospatial index
        collectionIndexes = collection.index_information().items()
        for idx in collectionIndexes:
            if 'key' in idx[1] and idx[1]['key'][0][1] == '2dsphere':
                minerva_metadata['spatial_field'] = idx[1]['key'][0][0]
                minerva_metadata['geojson'] = {}
                break
        if len(collectionList) > 0:
            minerva_metadata['json_row'] = collectionList[0]
            if 'geojson' not in minerva_metadata:
                if 'geometry' in collectionList[0]:
                    if 'coordinates' in collectionList[0]['geometry']:
                        minerva_metadata['spatial_field'] = 'geometry'
                        minerva_metadata['geojson'] = {}
            if 'geojson' in minerva_metadata:
                minerva_metadata['geojson'] = \
                    self.convertToGeoJSON(collection,
                                          minerva_metadata['spatial_field'])
        else:
            minerva_metadata['json_row'] = None
        desc = 'external mongo dataset for %s' % name
        dataset = self.constructDataset(name, minerva_metadata, desc)
        if 'geojson' in minerva_metadata:
            dataset['geoJsonAvailable'] = True
            dataset = self.model('item').updateItem(dataset)
        return dataset
    createMongoDataset.description = (
        Description('Create a Mongo Dataset from a Mongo Source.')
        .responseClass('Item')
        .param('name', 'The name of the mongo dataset', required=True)
        .param('mongo_collection', 'The name of the mongo collection',
               required=True)
        .param('mongoSourceId', 'Item ID of the WMS Source', required=True)
        .errorResponse('ID was invalid.')
        .errorResponse('Read permission denied on the Item.', 403))

    @access.public
    @loadmodel(model='item', level=AccessType.WRITE)
    def getExternalMongoLimits(self, item,  params):
        field = params['field']
        return self.findExternalMongoLimits(item, field)
    getExternalMongoLimits.description = (
        Description('Find min and max for the field in the datset')
        .param('id', 'The Dataset ID', paramType='path')
        .param('field', 'The field for which range limits are sought')
        .errorResponse('ID was invalid.')
        .errorResponse('Write permission denied on the Item.', 403))
