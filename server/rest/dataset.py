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
from girder.plugins.minerva.libs.carmen import get_resolver
from girder.plugins.minerva.utility.minerva_utility import findDatasetFolder
from girder.plugins.minerva.utility.dataset_utility import \
    jsonArrayHead, JsonMapper, GeoJsonMapper, jsonObjectReader

import girder_client


class Dataset(Resource):
    def __init__(self):
        self.resourceName = 'minerva_dataset'
        self.route('GET', (), self.listDatasets)
        self.route('GET', ('folder',), self.getDatasetFolder)
        self.route('POST', ('folder',), self.createDatasetFolder)
        self.route('POST', (':id', 'dataset'), self.createDataset)
        self.route('POST', ('external_mongo_dataset',),
                   self.createExternalMongoDataset)
        self.route('GET', (':id', 'dataset'), self.getDataset)
        self.route('POST', (':id', 'geojson'), self.createGeojson)
        self.route('POST', (':id', 'jsonrow'), self.createJsonRow)
        self.route('POST', (':id', 'geocode_tweets'), self.createTweetGeocodes)
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
        for file in self.model('item').childFiles(item):
            if file['name'] == itemGeoJson:
                return file
        return None

    def datasetJob(self, item, job):
        itemid = str(item['_id'])
        tmpdir = tempfile.mkdtemp()
        self._downloadItemFiles(itemid, tmpdir)
        job(item, tmpdir)
        shutil.rmtree(tmpdir)
        self.model('item').setMetadata(item, item['meta'])
        return item['meta']['minerva']

    def _convertShapefileToGeoJson(self, item, tmpdir):
        # TODO need to figure out convention here
        # assumes a shapefile is stored as a single item with a certain name
        # and all of the shapefiles as files within that item with
        # the same name.
        #
        # ex: item['name'] = myshapefile
        #     # abuse of notation for item.files
        #     item.files[0]['name'] =  myshapefile.cpg
        #     item.files[1]['name'] =  myshapefile.dbf
        #     item.files[2]['name'] =  myshapefile.prj
        #     item.files[3]['name'] =  myshapefile.shp
        #     item.files[4]['name'] =  myshapefile.shx

        from gaia.pandas import GeopandasReader, GeopandasWriter
        reader = GeopandasReader()
        reader.file_name = os.path.join(tmpdir, item['name'])
        geojsonFilepath = os.path.join(tmpdir, item['name'] +
                                       PluginSettings.GEOJSON_EXTENSION)
        writer = GeopandasWriter()
        writer.file_name = geojsonFilepath
        writer.format = 'GeoJSON'
        writer.set_input(port=reader.get_output())
        writer.run()
        return geojsonFilepath

    def _convertJsonfileToGeoJson(self, item, tmpdir):
        jsonFilepath = os.path.join(tmpdir, item['name'],
                                    item['name'] + '.json')
        geoJsonFilename = item['name'] + PluginSettings.GEOJSON_EXTENSION
        geoJsonFilepath = os.path.join(tmpdir, item['name'], geoJsonFilename)

        mapping = item['meta']['minerva']['mapper']
        geoJsonMapper = GeoJsonMapper(objConverter=None,
                                      mapping=mapping)
        objects = jsonObjectReader(jsonFilepath)
        geoJsonMapper.mapToJsonFile(tmpdir, objects, geoJsonFilepath)

        return geoJsonFilepath

    def createGeoJson(self, item, params):
        # TODO there is probably a problem when
        # we look for a name in an item as a duplicate
        # i.e. looking for filex, but the item name is filex (1)

        minerva_metadata = item['meta']['minerva']
        if minerva_metadata['original_type'] == 'shapefile':
            converter = self._convertShapefileToGeoJson
        elif minerva_metadata['original_type'] == 'json':
            converter = self._convertJsonfileToGeoJson
        elif minerva_metadata['original_type'] == 'mongo':
            # TODO maybe here we can store limit and offset?
            # set a placeholder for geojson file, even though
            # there is no actual geojson file, rather we will
            # generate it on the fly

            # in this case we don't actually want to store a file
            # but store the metadata we used to create the geojson

            minerva_metadata['geojson'] = {}
            minerva_metadata['geojson']['limit'] = 50
            minerva_metadata['geojson']['offset'] = 0
            # add the geojson to the minerva metadata returned
            # but don't save it
            # TODO think on caching implications
            connection = minerva_metadata['mongo_connection']
            dbConnectionUri = connection['db_uri']
            collectionName = connection['collection_name']
            # TODO this is also copied from above where we create an external
            # mongo dataset
            # TODO not sure if this is a good idea to do this db stuff here
            # maybe this suggests a new model?
            from girder.models import getDbConnection
            dbConn = getDbConnection(dbConnectionUri)
            db = dbConn.get_default_database()
            from girder.external.mongodb_proxy import MongoProxy
            collection = MongoProxy(db[collectionName])
            objects = list(collection.find(limit=50))

            mapping = item['meta']['minerva']['mapper']
            geoJsonMapper = GeoJsonMapper(objConverter=None,
                                          mapping=mapping)
            import cStringIO
            writer = cStringIO.StringIO()
            geoJsonMapper.mapToJson(objects, writer)

            item['meta']['minerva'] = minerva_metadata
            self.model('item').setMetadata(item, item['meta'])
            item['meta']['minerva']['geojson']['data'] = writer.getvalue()
            return minerva_metadata
        else:
            raise Exception('Unsupported conversion type %s' %
                            minerva_metadata['original_type'])

        def converterJob(item, tmpdir):
            geojsonFilepath = converter(item, tmpdir)
            self._addFileToItem(item, geojsonFilepath)
            geojsonFile = self._findGeoJsonFile(item)
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

    def geocodeTweets(self, item):
        # WARNING: Expecting only one file per item, with a name
        # as itemname.json

        def geocoderJob(item, tmpdir):
            jsonFilepath = os.path.join(tmpdir, item['name'],
                                        item['name'] + '.json')

            def tweetGeocoder(tweet):
                resolver = get_resolver()
                resolver.load_locations()
                location = resolver.resolve_tweet(tweet)
                if location is not None:
                    tweet["location"] = location[1].__dict__
                return tweet

            jsonMapper = JsonMapper(tweetGeocoder)
            objects = jsonObjectReader(jsonFilepath)
            outfile = jsonMapper.mapToJsonFile(tmpdir, objects)
            # move the converted file to the original file name to replace
            # the item file with the new version
            shutil.move(outfile, jsonFilepath)
            self._addFileToItem(item, jsonFilepath)

        return self.datasetJob(item, geocoderJob)

    def createExternalMongo(self, name, dbConnectionUri, collectionName):
        # assuming to create in the user space of the current user
        user = self.getCurrentUser()
        folder = findDatasetFolder(user, user)
        desc = 'external mongo dataset for %s' % name
        item = self.model('item').createItem(name, user, folder, desc)
        minerva_metadata = {
            'dataset_id': item['_id'],
            'original_type': 'mongo',
            'mongo_connection': {
                'db_uri': dbConnectionUri,
                'collection_name': collectionName
            }
        }
        # TODO not sure if this is a good idea to do this db stuff here
        # maybe this suggests a new model?
        # get the first entry in the collection, set as json_row
        # TODO integrate this with the methods for taking a row from a JSON
        # array in a file
        from girder.models import getDbConnection
        dbConn = getDbConnection(dbConnectionUri)
        db = dbConn.get_default_database()
        from girder.external.mongodb_proxy import MongoProxy
        collection = MongoProxy(db[collectionName])
        minerva_metadata['json_row'] = list(collection.find(limit=1))[0]
        if 'meta' not in item:
            item['meta'] = {}
        item['meta']['minerva'] = minerva_metadata
        self.model('item').setMetadata(item, item['meta'])
        return item['meta']['minerva']

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
        folder = findDatasetFolder(self.getCurrentUser(), user)
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

    @access.user
    def createExternalMongoDataset(self, params):
        return self.createExternalMongo(**params)
    createExternalMongoDataset.description = (
        Description('Create a dataset from an external mongo collection.')
        .param('name', 'The name of the dataset')
        .param('dbConnectionUri', 'Connection URI to MongoDB')
        .param('collectionName', 'Collection name within the MongoDB.')
        .errorResponse('Write permission denied on the dataset folder.', 403))

    @access.public
    @loadmodel(model='item', level=AccessType.WRITE)
    def createDataset(self, item, params):
        # assuming we have an existing item
        # create the minerva metadata to make it a dataset
        # this is likely an intermediate step to making a new model for
        # a dataset that extends item
        # TODO want to check if in dataset folder?
        #
        # should be called after first created
        #
        # 1) get all the files
        # 2) find their types based on mimetype and extension
        # one of (shapefile, geojson, json, csv)
        # set the original_type and original_file[] meta.minerva fields
        # with geojson_file if appropriate
        #
        # output should be the same the the get returns
        # which is a blob of minerva dataset metadata
        #
        # TODO this switching is based on which file is found first
        # fairly brittle and should only be called after first upload
        # perhaps check if this metadata already exists and don't run if so?
        minerva_metadata = {}
        for file in self.model('item').childFiles(item=item, limit=0):
            if 'geojson' in file['exts']:
                # we found a geojson, assume this is geojson original
                minerva_metadata['original_type'] = 'geojson'
                minerva_metadata['original_files'] = [{
                    'name': file['name'], '_id': file['_id']}]
                minerva_metadata['geojson_file'] = {
                    'name': file['name'], '_id': file['_id']}
                break
            elif 'json' in file['exts']:
                minerva_metadata['original_type'] = 'json'
                minerva_metadata['original_files'] = [{
                    'name': file['name'], '_id': file['_id']}]
                break
            elif 'shp' in file['exts']:
                minerva_metadata['original_type'] = 'shapefile'
                # TODO possible we want to store the other shapefiles?
                minerva_metadata['original_files'] = [{
                    'name': file['name'], '_id': file['_id']}]
                break
            elif 'csv' in file['exts']:
                minerva_metadata['original_type'] = 'csv'
                minerva_metadata['original_files'] = [{
                    'name': file['name'], '_id': file['_id']}]
                break
        if not minerva_metadata:
            raise RestException('No valid dataset type found in Item Files.')
        minerva_metadata['dataset_id'] = item['_id']
        if 'meta' in item:
            metadata = item['meta']
        else:
            metadata = {}
        metadata['minerva'] = minerva_metadata
        self.model('item').setMetadata(item, metadata)
        return minerva_metadata
    createDataset.description = (
        Description('Create metadata for an Item, promoting it to a Dataset.')
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
        supported_conversions = ['shapefile', 'json', 'mongo']
        if minerva_meta['original_type'] in supported_conversions:
            # TODO passing params for limit and offset
            # maybe better to make those explicit and for all original_type
            minerva_meta = self.createGeoJson(item, params)
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
        .errorResponse('ID was invalid.')
        .errorResponse('Write permission denied on the Item.', 403))

    @access.public
    @loadmodel(model='item', level=AccessType.WRITE)
    def createTweetGeocodes(self, item, params):
        return self.geocodeTweets(item)
    createTweetGeocodes.description = (
        Description('Replace Item File holding json array of tweets with ' +
                    'json array of geocoded tweets, using Carmen.')
        .param('id', 'The Item ID', paramType='path')
        .errorResponse('ID was invalid.')
        .errorResponse('Write permission denied on the Item.', 403))
