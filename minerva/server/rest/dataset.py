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

import os
import shutil
import pymongo
import tempfile

from girder.api import access
from girder.api.describe import Description
from girder.api.rest import Resource, loadmodel, RestException
from girder.constants import AccessType
from girder.utility import config

from girder.plugins.minerva.constants import PluginSettings
from girder.plugins.minerva.utility.minerva_utility import findDatasetFolder, \
    updateMinervaMetadata
from girder.plugins.minerva.utility.dataset_utility import \
    jsonArrayHead, GeoJsonMapper, jsonObjectReader

import girder_client


class Dataset(Resource):
    def __init__(self):
        self.resourceName = 'minerva_dataset'
        self.route('GET', (), self.listDatasets)
        self.route('GET', ('folder',), self.getDatasetFolder)
        self.route('POST', ('folder',), self.createDatasetFolder)
        self.route('POST', (':id', 'item'), self.promoteItemToDataset)
        self.route('GET', (':id', 'dataset'), self.getDataset)
        self.route('POST', (':id', 'geojson'), self.createGeojson)
        self.route('POST', (':id', 'jsonrow'), self.createJsonRow)
        self.client = None

    def _initClient(self):
        if self.client is None:
            girderPort = config.getConfig()['server.socket_port']
            self.client = girder_client.GirderClient(port=girderPort)
            user, token = self.getCurrentUser(returnToken=True)
            self.client.token = token['_id']

    def _downloadItemFiles(self, itemId, tmpdir):
        self._initClient()
        self.client.downloadItem(itemId, tmpdir)
        # TODO worry about stale authentication

    def _addFileToItem(self, item, filepath):
        itemId = str(item['_id'])
        self._initClient()
        self.client.uploadFileToItem(itemId, filepath)
        # TODO worry about stale authentication

    def _findGeoJsonFile(self, item):
        itemGeoJson = item['name'] + PluginSettings.GEOJSON_EXTENSION
        existing = self.model('file').findOne({
            'itemId': item['_id'],
            'name': itemGeoJson
        })
        if existing:
            return existing
        else:
            return None

    def datasetJob(self, item, job):
        itemid = str(item['_id'])
        tmpdir = tempfile.mkdtemp()
        self._downloadItemFiles(itemid, tmpdir)
        job(item, tmpdir)
        shutil.rmtree(tmpdir)
        self.model('item').setMetadata(item, item['meta'])
        return item['meta']['minerva']

    def _convertJsonfileToGeoJson(self, item, tmpdir):
        # use the first filename with json ext found in original_files
        filename = None
        files = item['meta']['minerva']['original_files']
        for f in files:
            if f['name'].endswith('.json'):
                filename = f['name']
        if filename is None:
            raise RestException('Dataset %s has no json files' % item['name'])
        jsonFilepath = os.path.join(tmpdir, item['name'],
                                    filename)
        geoJsonFilename = item['name'] + PluginSettings.GEOJSON_EXTENSION
        geoJsonFilepath = os.path.join(tmpdir, item['name'], geoJsonFilename)

        mapping = item['meta']['minerva']['mapper']
        geoJsonMapper = GeoJsonMapper(objConverter=None,
                                      mapping=mapping)
        objects = jsonObjectReader(jsonFilepath)
        geoJsonMapper.mapToJsonFile(tmpdir, objects, geoJsonFilepath)

        return geoJsonFilepath

    def _convertMongoToGeoJson(self, item, params):
        minerva_metadata = item['meta']['minerva']
        # TODO time to break this code out to another method

        # TODO maybe here we can store limit and offset?
        # set a placeholder for geojson file, even though
        # there is no actual geojson file, rather we will
        # generate it on the fly

        # in this case we don't actually want to store a file
        # but store the metadata we used to create the geojson

        if 'geojson' not in minerva_metadata:
            minerva_metadata['geojson'] = {}

        # TODO no reason couldn't have query and limit/offset

        # add the geojson to the minerva metadata returned
        # but don't save it
        # TODO think on caching implications
        connection = minerva_metadata['mongo_connection']
        dbConnectionUri = connection['db_uri']
        collectionName = connection['collection_name']
        collection = self.mongoCollection(dbConnectionUri, collectionName)

        query_count = collection.find().count()
        minerva_metadata['geojson']['query_count'] = query_count
        objects = collection.find()
        mapping = item['meta']['minerva']['mapper']
        geoJsonMapper = GeoJsonMapper(objConverter=None,
                                      mapping=mapping)
        import cStringIO
        writer = cStringIO.StringIO()
        geoJsonMapper.mapToJson(objects, writer)

        item['meta']['minerva'] = minerva_metadata
        item['meta']['minerva']['geojson']['data'] = writer.getvalue()
        self.model('item').setMetadata(item, item['meta'])
        return minerva_metadata

    def createGeoJsonFromDataset(self, item, params):
        # TODO there is probably a problem when
        # we look for a name in an item as a duplicate
        # i.e. looking for filex, but the item name is filex (1)

        minerva_metadata = item['meta']['minerva']
        if minerva_metadata['original_type'] == 'json':
            converter = self._convertJsonfileToGeoJson
        elif minerva_metadata['original_type'] == 'mongo':
            return self._convertMongoToGeoJson(item, params)
        else:
            raise Exception('Unsupported conversion type %s' %
                            minerva_metadata['original_type'])

        def converterJob(item, tmpdir):
            geojsonFilepath = converter(item, tmpdir)
            self._addFileToItem(item, geojsonFilepath)
            geojsonFile = self._findGeoJsonFile(item)
            item['meta']['minerva']['source'] = {
                'layer_source': 'GeoJSON'}
            item['meta']['minerva']['geojson_file'] = {
                'name': geojsonFile['name'],
                '_id': geojsonFile['_id']
            }

        return self.datasetJob(item, converterJob)

    def createJsonRowFromJsonArray(self, item):

        def createJsonRowJob(item, tmpdir):
            jsonFilename = item['name'] + '.json'
            jsonFilepath = os.path.join(tmpdir, item['name'], jsonFilename)
            # take the only entry of the array
            jsonRow = jsonArrayHead(jsonFilepath, limit=1)[0]
            item['meta']['minerva']['json_row'] = jsonRow

        return self.datasetJob(item, createJsonRowJob)

    def mongoCollection(self, connectionUri, collectionName):
        # TODO not sure if this is a good idea to do this db stuff here
        # maybe this suggests a new model?
        from girder.models import getDbConnection
        dbConn = getDbConnection(connectionUri)
        db = dbConn.get_default_database()
        from girder.external.mongodb_proxy import MongoProxy
        collection = MongoProxy(db[collectionName])
        return collection

    # TODO rename to createDataset once the existing createDataset
    # endpoint method is removed.
    def constructDataset(self, name, minerva_metadata, desc=''):
        user = self.getCurrentUser()
        folder = findDatasetFolder(user, user, create=True)
        if folder is None:
            raise Exception('User has no Minerva Dataset folder.')
        dataset = self.model('item').createItem(name, user, folder, desc)
        updateMinervaMetadata(dataset, minerva_metadata)
        return dataset

    # REST Endpoints

    @access.public
    @loadmodel(map={'userId': 'user'}, model='user', level=AccessType.READ)
    def listDatasets(self, user, params):
        folder = findDatasetFolder(self.getCurrentUser(), user)
        if folder is None:
            return []
        else:
            limit, offset, sort = \
                self.getPagingParameters(params,
                                         defaultSortDir=pymongo.DESCENDING)
            items = [self.model('item').filter(item, self.getCurrentUser()) for
                     item in self.model('folder').childItems(folder,
                     limit=limit, offset=offset, sort=sort)]
            return items
    listDatasets.description = (
        Description('List minerva datasets owned by a user.')
        .param('userId', 'User is the owner of minerva datasets.',
               required=True)
        .param('limit', "Result set size limit (default=50).", required=False,
               dataType='int')
        .param('offset', "Offset into result set (default=0).", required=False,
               dataType='int')
        .param('sort', 'Field to sort the result list by ('
               'default=name)', required=False)
        .param('sortdir', "1 for ascending, -1 for descending (default=-1)",
               required=False, dataType='int'))

    @access.public
    @loadmodel(map={'userId': 'user'}, model='user', level=AccessType.READ)
    def getDatasetFolder(self, user, params):
        folder = findDatasetFolder(self.getCurrentUser(), user, create=True)
        return {'folder': folder}
    getDatasetFolder.description = (
        Description('Get the minerva dataset folder owned by a user.')
        .param('userId', 'User is the owner of minerva datasets.',
               required=True))

    @access.public
    @loadmodel(map={'userId': 'user'}, model='user', level=AccessType.WRITE)
    def createDatasetFolder(self, user, params):
        folder = findDatasetFolder(self.getCurrentUser(), user, create=True)
        return {'folder': folder}
    createDatasetFolder.description = (
        Description('Create the minerva dataset folder owned by a user.')
        .param('userId', 'User is the owner of minerva datasets.',
               required=True))

    @access.public
    @loadmodel(model='item', level=AccessType.READ)
    def getDataset(self, item, params):
        meta = item['meta']
        if 'minerva' in meta:
            return meta['minerva']
        else:
            return {}
    getDataset.description = (
        Description('Get Minerva metadata for an Item.')
        .param('id', 'The Item ID', paramType='path')
        .errorResponse('ID was invalid.')
        .errorResponse('Read permission denied on the Item.', 403))

    @access.public
    @loadmodel(model='item', level=AccessType.WRITE)
    def promoteItemToDataset(self, item, params):
        """
        Take an Item in the user's Minerva Dataset folder, and promote
        it to a Minerva Dataset by adding proper Minerva metadata.
        """

        user = self.getCurrentUser()
        folder = findDatasetFolder(user, user, create=True)
        if folder is None:
            raise RestException('User has no Minerva Dataset folder.')
        if folder['_id'] != item['folderId']:
            raise RestException("Items need to be in user's Minerva Dataset " +
                                "folder.")
        # Don't overwrite if minerva metadata already exists.
        if 'meta' in item and 'minerva' in item['meta']:
            return item

        minerva_metadata = {
            'source_type': 'item'
        }
        for file in self.model('item').childFiles(item=item, limit=0):
            # TODO This switching based on which file is found first is
            # fairly brittle and should only be called after first upload.
            if 'geojson' in file['exts']:
                # we found a geojson, assume this is geojson original
                minerva_metadata['original_type'] = 'geojson'
                minerva_metadata['dataset_type'] = 'geojson'
                minerva_metadata['original_files'] = [{
                    'name': file['name'], '_id': file['_id']}]
                minerva_metadata['geojson_file'] = {
                    'name': file['name'], '_id': file['_id']}
                minerva_metadata['source'] = {
                    'layer_source': 'GeoJSON'}
                break
            elif 'json' in file['exts']:
                minerva_metadata['original_type'] = 'json'
                minerva_metadata['dataset_type'] = 'json'
                minerva_metadata['original_files'] = [{
                    'name': file['name'], '_id': file['_id']}]
                break
            elif 'csv' in file['exts']:
                minerva_metadata['original_type'] = 'csv'
                minerva_metadata['dataset_type'] = 'csv'
                minerva_metadata['original_files'] = [{
                    'name': file['name'], '_id': file['_id']}]
                break
        updateMinervaMetadata(item, minerva_metadata)
        return item
    promoteItemToDataset.description = (
        Description('Create metadata for an Item in a user\'s Minerva Dataset' +
                    ' folder, promoting the Item to a Dataset.')
        .responseClass('Item')
        .param('id', 'The Item ID', paramType='path')
        .errorResponse('ID was invalid.')
        .errorResponse('Write permission denied on the Item.', 403))

    @access.public
    @loadmodel(model='item', level=AccessType.WRITE)
    def createJsonRow(self, item, params):
        item_meta = item['meta']
        minerva_meta = item_meta['minerva']
        if not minerva_meta['original_type'] == 'json':
            raise RestException(
                'Dataset is not json.',
                'girder.api.v1.minerva_dataset.create-json-row')
        minerva_meta = self.createJsonRowFromJsonArray(item)
        return minerva_meta
    createJsonRow.description = (
        Description('Extract the top row from a json array dataset, adds '
                    'to the minerva metadata.')
        .param('id', 'The Item ID', paramType='path')
        .errorResponse('ID was invalid.')
        .errorResponse('Write permission denied on the Item.', 403))

    @access.public
    @loadmodel(model='item', level=AccessType.WRITE)
    def createGeojson(self, item, params):
        # always create the geojson as perhaps the params have changed
        item_meta = item['meta']
        minerva_meta = item_meta['minerva']
        supported_conversions = ['json', 'mongo']
        if minerva_meta['original_type'] in supported_conversions:
            # TODO passing params for limit and offset
            # maybe better to make those explicit and for all original_type
            minerva_meta = self.createGeoJsonFromDataset(item, params)
        elif minerva_meta['original_type'] == 'geojson':
            return minerva_meta
        elif minerva_meta['original_type'] == 'csv':
            raise RestException('CSV to geojson not implemented')
        else:
            raise RestException('create geojson on unknown type')
        return minerva_meta
    createGeojson.description = (
        Description('Create geojson for a dataset, if possible.')
        .param('id', 'The Item ID', paramType='path')
        .param('dateField', 'date field for filtering results, required for ' +
               'startTime or endTime params', required=False)
        .param('startTime', 'earliest time to include result', required=False)
        .param('endTime', 'latest time to include result', required=False)
        .errorResponse('ID was invalid.')
        .errorResponse('Write permission denied on the Item.', 403))
