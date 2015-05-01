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

import mako
import os
import shutil
import time

from girder.api import access
from girder.api.rest import Resource, loadmodel
from girder.api.describe import Description
from girder.constants import AccessType
from .rest import dataset

import girder_client


class CustomAppRoot(object):
    """
    The webroot endpoint simply serves the main index HTML file of minerva.
    """
    exposed = True

    indexHtml = None

    vars = {
        'apiRoot': '/api/v1',
        'staticRoot': '/static',
        'title': 'Minerva'
    }

    template = r"""
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>${title}</title>
        <link rel="stylesheet"
              href="//fonts.googleapis.com/css?family=Droid+Sans:400,700">
        <link rel="stylesheet"
              href="${staticRoot}/lib/bootstrap/css/bootstrap.min.css">
        <link rel="stylesheet"
              href="${staticRoot}/lib/fontello/css/fontello.css">
        <link rel="stylesheet"
              href="${staticRoot}/lib/fontello/css/animation.css">
        <link rel="stylesheet"
              href="${staticRoot}/built/plugins/minerva/jquery.gridster.min.css">
        <link rel="stylesheet"
              href="${staticRoot}/built/app.min.css">
        <link rel="stylesheet"
              href="${staticRoot}/built/plugins/minerva/minerva.min.css">
        <link rel="stylesheet"
              href="${staticRoot}/built/plugins/jobs/plugin.min.css">
        <link rel="icon"
              type="image/png"
              href="${staticRoot}/img/Girder_Favicon.png">

      </head>
      <body>
        <div id="g-global-info-apiroot" class="hide">${apiRoot}</div>
        <div id="g-global-info-staticroot" class="hide">${staticRoot}</div>
        <script src="${staticRoot}/built/libs.min.js"></script>
        <script src="${staticRoot}/built/app.min.js"></script>
        <script src="${staticRoot}/built/plugins/jobs/plugin.min.js"></script>
        <script src="${staticRoot}/built/plugins/gravatar/plugin.min.js">
        </script>
        <script src="${staticRoot}/built/plugins/minerva/jquery.gridster.js">
        </script>
        <script src="${staticRoot}/built/plugins/minerva/minerva.libs.min.js">
        </script>
        <script src="${staticRoot}/built/plugins/minerva/minerva.min.js">
        </script>
        <script src="${staticRoot}/built/plugins/minerva/main.min.js"></script>
      </body>
    </html>
    """

    def GET(self):
        if self.indexHtml is None:
            self.indexHtml = mako.template.Template(self.template).render(
                **self.vars)

        return self.indexHtml


class Shapefile(Resource):
# TODO may want to move this to romanesco
# or else some system that allows ease of development on local or
# romanesco
# probably at least move it to separate module

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

#class MinervaFolder(Resource):

    #minervaFolder = 'minerva'

    #def findMinervaFolder(self, user):
        ## TODO could be improved with search by name to the db
        #for folder in self.model('folder').childFolders(parent=user,
                                                        #parentType='user',
                                                        #user=user):
            #if folder['name'] == MinervaFolder.minervaFolder:
                #return folder
        #return None

    #@access.public
    #@loadmodel(model='user', level=AccessType.WRITE)
    #def createMinervaFolder(self, user, params):
        ## TODO time for some docstrings
        ## create a minerva folder under the user if one doesn't exist
        #folder = self.findMinervaFolder(user)
        #if folder is None:
            #folder = self.model('folder').createFolder(
                #parent=user,
                #name=MinervaFolder.minervaFolder,
                #parentType='user')
        #return folder
    #createMinervaFolder.description = (
        #Description('Create a minerva folder under a user.')
        #.param('id', 'The ID of the user to gain a minerva folder.',
               #paramType='path')
        #.errorResponse('ID was invalid.')
        #.errorResponse('Write permission denied on the User.', 403))

    #@access.public
    #@loadmodel(model='user', level=AccessType.READ)
    #def loadMinervaDatasets(self, user, params):
        #datasets = []
        #folder = self.findMinervaFolder(user)
        #if folder is not None:
            ## TODO will want to either paginate responses or
            ## set metadata and do a metadata based query
            #for item in self.model('folder').childItems(folder):
                ## metadata is also nice b/c we don't have to look for
                ## a file with a geojson extension
                #print item
                #itemGeoJson = item['name'] + Shapefile.geojsonExtension
                #for file in self.model('item').childFiles(item):
                    #if file['name'] == itemGeoJson:
                        #datasets.append(item)#[item['name']] = item['_id']
        #return datasets # {'datasets': datasets}


    #loadMinervaDatasets.description = (
        #Description('Load all of the datasets in minerva folder for a user.')
        #.param('id', 'The ID of the user to gain a minerva folder.',
               #paramType='path')
        #.errorResponse('ID was invalid.')
        #.errorResponse('Write permission denied on the User.', 403))


def load(info):
    # Move girder app to /girder, serve minerva app from /
    info['serverRoot'], info['serverRoot'].girder = (CustomAppRoot(),
                                                     info['serverRoot'])
    info['serverRoot'].api = info['serverRoot'].girder.api

    shapefile = Shapefile()
    info['apiRoot'].item.route('POST', (':id', 'geojson'),
                               shapefile.createGeoJson)
    info['apiRoot'].item.route('GET', (':id', 'geojson'),
                               shapefile.findGeoJson)

    info['apiRoot'].minerva_dataset = dataset.Dataset()


    #minervaFolder = MinervaFolder()
    #info['apiRoot'].user.route('POST', (':id', 'minervafolder'),
                               #minervaFolder.createMinervaFolder)
    #info['apiRoot'].user.route('GET', (':id', 'minervadatasets'),
                               #minervaFolder.loadMinervaDatasets)
