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
from girder.plugins.minerva.utility.minerva_utility import findDatasetFolder
from girder.plugins.minerva.utility.dataset_utility import \
    jsonArrayHead, convertJsonArrayToGeoJson

import girder_client


# utility functions for creating geojson
# TODO refactor these with the dataset_utility, local jobs, and
# gaia + romanesco integration in mind
# lots of repeated boilerplate and everything happening
# in synchronous local cherrypy threads
class DatasetUtility(Resource):

    def __init__(self):
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

    def _convertShapefileToGeoJson(self, item, tmpdir):
        from gaia.pandas import GeopandasReader, GeopandasWriter
        reader = GeopandasReader()
        reader.file_name = os.path.join(tmpdir, item['name'])
        geojsonFile = os.path.join(tmpdir, item['name'] +
                                   PluginSettings.GEOJSON_EXTENSION)
        writer = GeopandasWriter()
        writer.file_name = geojsonFile
        writer.format = 'GeoJSON'
        writer.set_input(port=reader.get_output())
        writer.run()
        return geojsonFile

    def _addGeoJsonFileToItem(self, itemId, geojsonFile):
        self._initClient()
        self.client.uploadFileToItem(itemId, geojsonFile)
        # TODO worry about stale authentication

    def _findGeoJsonFile(self, item):
        itemGeoJson = item['name'] + PluginSettings.GEOJSON_EXTENSION
        for file in self.model('item').childFiles(item):
            if file['name'] == itemGeoJson:
                return file
        return None

    def createGeoJsonFromShapefile(self, item):
        # TODO there is probably a problem when
        # we look for a name in an item as a duplicate
        # i.e. looking for filex, but the item name is filex (1)

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

        # output is a file id for a geojson file in the item
        geojsonFile = self._findGeoJsonFile(item)
        if geojsonFile is not None:
            return geojsonFile
        # grab all the files in the shapefile
        # write them out to a temp dir
        # convert shapefile to geojson with gaia
        # upload geojson as a file in the shapefile item
        # TODO clean work dir in context
        # TODO lots of repeated boilerplate
        itemId = str(item['_id'])
        tmpdir = tempfile.mkdtemp()
        self._downloadItemFiles(itemId, tmpdir)
        geojsonFile = self._convertShapefileToGeoJson(item, tmpdir)
        self._addGeoJsonFileToItem(itemId, geojsonFile)
        shutil.rmtree(tmpdir)
        geojsonFile = self._findGeoJsonFile(item)
        return geojsonFile

    def createJsonRowFromJsonArray(self, item):
        itemId = str(item['_id'])
        tmpdir = tempfile.mkdtemp()
        self._downloadItemFiles(itemId, tmpdir)
        jsonFilename = item['name'] + '.json'
        jsonFilepath = os.path.join(tmpdir, item['name'], jsonFilename)
        # take the only entry of the array
        jsonRow = jsonArrayHead(jsonFilepath, limit=1)[0]
        shutil.rmtree(tmpdir)
        return jsonRow

    def createGeoJsonFromJson(self, item):
        # TODO clean work dir in context
        # TODO lots of repeated boilerplate
        # TODO want to add the minerva meta for geojson
        itemId = str(item['_id'])
        tmpdir = tempfile.mkdtemp()
        self._downloadItemFiles(itemId, tmpdir)
        jsonFilepath = os.path.join(tmpdir, item['name'],
                                    item['name'] + '.json')
        geoJsonFilename = item['name'] + PluginSettings.GEOJSON_EXTENSION
        geoJsonFilePath = os.path.join(tmpdir, item['name'], geoJsonFilename)
        convertJsonArrayToGeoJson(jsonFilepath, tmpdir, geoJsonFilePath,
                                  item['meta']['minerva']['mapper'])
        self._addGeoJsonFileToItem(itemId, geoJsonFilePath)
        shutil.rmtree(tmpdir)
        # TODO really should add meta with adding geojson
        geojsonFile = self._findGeoJsonFile(item)
        return geojsonFile


class Dataset(Resource):
    def __init__(self):
        self.resourceName = 'minerva_dataset'
        self.route('GET', (), self.listDatasets)
        self.route('GET', ('folder',), self.getDatasetFolder)
        self.route('POST', ('folder',), self.createDatasetFolder)
        self.route('POST', (':id', 'dataset'), self.createDataset)
        self.route('GET', (':id', 'dataset'), self.getDataset)
        self.route('POST', (':id', 'geojson'), self.createGeojson)
        self.route('POST', (':id', 'jsonrow'), self.createJsonRow)

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
        datasetUtility = DatasetUtility()
        jsonRow = datasetUtility.createJsonRowFromJsonArray(item)
        minerva_meta['json_row'] = jsonRow
        item_meta['minerva'] = minerva_meta
        self.model('item').setMetadata(item, item_meta)
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
        if minerva_meta['original_type'] == 'shapefile':
            datasetUtility = DatasetUtility()
            geoJsonFile = datasetUtility.createGeoJsonFromShapefile(item)
        elif minerva_meta['original_type'] == 'json':
            datasetUtility = DatasetUtility()
            geoJsonFile = datasetUtility.createGeoJsonFromJson(item)
        elif minerva_meta['original_type'] == 'geojson':
            return minerva_meta
        elif minerva_meta['original_type'] == 'csv':
            # datasetUtility = DatasetUtility()
            # geoJsonFile = datasetUtility.createGeoJsonFromCSV(item)
            raise RestException('CSV to geojson not implemented')
        else:
            raise RestException('create geojson on unknown type')
        minerva_meta['geojson_file'] = {
            'name': geoJsonFile['name'],
            '_id': geoJsonFile['_id']
        }
        item_meta['minerva'] = minerva_meta
        self.model('item').setMetadata(item, item_meta)
        return minerva_meta
    createGeojson.description = (
        Description('Create geojson for a dataset, if possible.')
        .param('id', 'The Item ID', paramType='path')
        .errorResponse('ID was invalid.')
        .errorResponse('Write permission denied on the Item.', 403))
