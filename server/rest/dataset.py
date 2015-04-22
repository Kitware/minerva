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

#import cherrypy
#import json
#import os
#import posixpath
import pymongo

from ..constants import PluginSettings
from girder.api import access
from girder.api.describe import Description
from girder.api.rest import Resource, loadmodel
from girder.constants import AccessType


class Dataset(Resource):
    def __init__(self):
        self.resourceName = 'minerva_dataset'
        self.route('GET', (), self.listDatasets)
#        self.route('POST', ('folder',), self.createDatasetFolder)

    def findMinervaFolder(self, user):
        folders = [self.model('folder').filter(folder, user) for folder in self.model('folder').childFolders(parent=user, parentType='user', user=user,
            filters={'name': PluginSettings.MINERVA_FOLDER})]
        # folders should have len of 0 or 1, since we are looking in a
        # user folder for a folder with a certain name
        if len(folders) == 0:
            return None
        else:
            return folders[0]

    @access.public
    @loadmodel(map={'userId': 'user'}, model='user', level=AccessType.READ)
    def listDatasets(self, user, params):
        print 'listDatasets', user
        folder = self.findMinervaFolder(user)
        if folder is None:
            return []
        else:
            limit, offset, sort = self.getPagingParameters(params, defaultSortDir=pymongo.DESCENDING)
            items = [self.model('item').filter(item, user) for item in self.model('folder').childItems(folder, limit=limit, offset=offset, sort=sort)]
            return items
    listDatasets.description = (
        Description('List minerva datasets owned by a user.')
        .param('userId', 'User is the owner of minerva datasets.', required=True)
        .param('limit', "Result set size limit (default=50).", required=False,
               dataType='int')
        .param('offset', "Offset into result set (default=0).", required=False,
               dataType='int')
        .param('sort', 'Field to sort the result list by ('
               'default=name)', required=False)
        .param('sortdir', "1 for ascending, -1 for descending (default=-1)",
               required=False, dataType='int'))

    #@access.public
    #@loadmodel(map={'userId': 'user'}, model='user', level=AccessType.WRITE)
    #def createDatasetFolder(self, user, params):
        #folder = self.findMinervaFolder(user)
        #if folder is None:
            #folder = self.model('folder').createFolder(
                #parent=user,
                #name=PluginSettings.MINERVA_FOLDER,
                #parentType='user')
        #return folder
    #createDatasetFolder.description = (
        #Description('Create a minerva folder under a user if it does not already exist.')
        #.param('userId', 'User is the owner of minerva datasets.', required=True)
        #.errorResponse('Write permission denied on the User.', 403))
#    // TODO add to dataset model the call to create datasetfolder

    #def __init__(self):
        #self.client = None

    #def _initClient(self):
        #if self.client is None:
            #self.client = girder_client.GirderClient()
            #user, token = self.getCurrentUser(returnToken=True)
            #self.client.token = token['_id']

    #def _createWorkDir(self, itemId):
        #tmpdir = os.path.join(os.getcwd(), 'tmp')
        #if not os.path.exists(tmpdir):
            #os.makedirs(tmpdir)
        ## TODO clean up tmpdir if exception
        ## TODO deal with tmpdir name collision
        #tmpdir = os.path.join(tmpdir, str(time.time()) + itemId)
        #if not os.path.exists(tmpdir):
            #os.makedirs(tmpdir)
        #return tmpdir

    #def _downloadItemFiles(self, itemId, tmpdir):
        #self._initClient()
        #self.client.downloadItem(itemId, tmpdir)
        ## TODO worry about stale authentication

    #def _convertToGeoJson(self, item, tmpdir):
        #from gaia.pandas import GeopandasReader, GeopandasWriter
        #reader = GeopandasReader()
        #reader.file_name = os.path.join(tmpdir, item['name'])
        #geojsonFile = os.path.join(tmpdir, item['name'] +
                                   #Shapefile.geojsonExtension)
        #writer = GeopandasWriter()
        #writer.file_name = geojsonFile
        #writer.format = 'GeoJSON'
        #writer.set_input(port=reader.get_output())
        #writer.run()
        #return geojsonFile

    #def _addGeoJsonFileToItem(self, itemId, geojsonFile):
        #self._initClient()
        #self.client.uploadFileToItem(itemId, geojsonFile)
        ## TODO worry about stale authentication

    #def _cleanWorkDir(self, tmpdir):
        #shutil.rmtree(tmpdir)

    #def _findFileId(self, item):
        #itemGeoJson = item['name'] + Shapefile.geojsonExtension
        #for file in self.model('item').childFiles(item):
            #if file['name'] == itemGeoJson:
                #return str(file['_id'])
        #return None

    #@access.public
    #@loadmodel(model='item', level=AccessType.WRITE)
    #def createGeoJson(self, item, params):
        ## TODO need to figure out convention here
        ## assumes a shapefile is stored as a single item with a certain name
        ## and all of the shapefiles as files within that item with
        ## the same name.
        ##
        ## ex: item['name'] = myshapefile
        ##     # abuse of notation for item.files
        ##     item.files[0]['name'] =  myshapefile.cpg
        ##     item.files[1]['name'] =  myshapefile.dbf
        ##     item.files[2]['name'] =  myshapefile.prj
        ##     item.files[3]['name'] =  myshapefile.shp
        ##     item.files[4]['name'] =  myshapefile.shx

        ## output is a file id for a geojson file in the item
        #fileId = self._findFileId(item)
        #if fileId is not None:
            #return {'_id': fileId}
        ## grab all the files in the shapefile
        ## write them out to a temp dir
        ## convert shapefile to geojson with gaia
        ## upload geojson as a file in the shapefile item
        #itemId = str(item['_id'])
        #tmpdir = self._createWorkDir(itemId)
        #self._downloadItemFiles(itemId, tmpdir)
        #geojsonFile = self._convertToGeoJson(item, tmpdir)
        #self._addGeoJsonFileToItem(itemId, geojsonFile)
        #self._cleanWorkDir(tmpdir)
        #fileId = self._findFileId(item)
        #return {'_id': fileId}
    #createGeoJson.description = (
        #Description('Convert an item holding a shapefile into geojson.')
        #.param('id', 'The Item ID', paramType='path')
        #.errorResponse('ID was invalid.')
        #.errorResponse('Write permission denied on the Item.', 403))


