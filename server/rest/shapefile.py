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
import time

from girder.api import access
from girder.api.describe import Description
from girder.api.rest import Resource, loadmodel
from girder.constants import AccessType

import girder_client


class Shapefile(Resource):
    # TODO may want to move this to romanesco
    # or else some system that allows ease of development on local or romanesco

    geojsonExtension = '.geojson'

    def __init__(self):
        self.client = None

    def _initClient(self):
        if self.client is None:
            self.client = girder_client.GirderClient()
            user, token = self.getCurrentUser(returnToken=True)
            self.client.token = token['_id']

    def _createWorkDir(self, itemId):
        tmpdir = os.path.join(os.getcwd(), 'tmp')
        if not os.path.exists(tmpdir):
            os.makedirs(tmpdir)
        # TODO clean up tmpdir if exception
        # TODO deal with tmpdir name collision
        tmpdir = os.path.join(tmpdir, str(time.time()) + itemId)
        if not os.path.exists(tmpdir):
            os.makedirs(tmpdir)
        return tmpdir

    def _downloadItemFiles(self, itemId, tmpdir):
        self._initClient()
        self.client.downloadItem(itemId, tmpdir)
        # TODO worry about stale authentication

    def _convertToGeoJson(self, item, tmpdir):
        from gaia.pandas import GeopandasReader, GeopandasWriter
        reader = GeopandasReader()
        reader.file_name = os.path.join(tmpdir, item['name'])
        geojsonFile = os.path.join(tmpdir, item['name'] +
                                   Shapefile.geojsonExtension)
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

    def _cleanWorkDir(self, tmpdir):
        shutil.rmtree(tmpdir)

    def _findFileId(self, item):
        itemGeoJson = item['name'] + Shapefile.geojsonExtension
        for file in self.model('item').childFiles(item):
            if file['name'] == itemGeoJson:
                return str(file['_id'])
        return None

    @access.public
    @loadmodel(model='item', level=AccessType.WRITE)
    def createGeoJson(self, item, params):
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
        fileId = self._findFileId(item)
        if fileId is not None:
            return {'_id': fileId}
        # grab all the files in the shapefile
        # write them out to a temp dir
        # convert shapefile to geojson with gaia
        # upload geojson as a file in the shapefile item
        itemId = str(item['_id'])
        tmpdir = self._createWorkDir(itemId)
        self._downloadItemFiles(itemId, tmpdir)
        geojsonFile = self._convertToGeoJson(item, tmpdir)
        self._addGeoJsonFileToItem(itemId, geojsonFile)
        self._cleanWorkDir(tmpdir)
        fileId = self._findFileId(item)
        return {'_id': fileId}
    createGeoJson.description = (
        Description('Convert an item holding a shapefile into geojson.')
        .param('id', 'The Item ID', paramType='path')
        .errorResponse('ID was invalid.')
        .errorResponse('Write permission denied on the Item.', 403))

    @access.public
    @loadmodel(model='item', level=AccessType.READ)
    def findGeoJson(self, item, params):
        # TODO there is probably a problem when
        # we look for a name in an item as a duplicate
        # i.e. looking for filex, but the item name is filex (1)
        itemGeoJson = item['name'] + Shapefile.geojsonExtension
        # TODO if not found try pagination
        for file in self.model('item').childFiles(item):
            if file['name'] == itemGeoJson:
                return file
        return {}
    findGeoJson.description = (
        Description('Get geojson file with same name as item.')
        .param('id', 'The Item ID', paramType='path')
        .errorResponse('ID was invalid.')
        .errorResponse('Read permission denied on the Item.', 403))
