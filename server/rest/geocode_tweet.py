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

from ..constants import PluginSettings

from girder.api import access
from girder.api.describe import Description
from girder.api.rest import Resource, loadmodel
from girder.constants import AccessType

import girder_client

class GeocodeTweet(Resource):
    # TODO may want to move this to Gaia
    # or else some system that allows ease of development on local or Gaia
    def __init__(self):
        self.client = None

    def _initClient(self):
        if self.client is None:
            self.client = girder_client.GirderClient()
            user, token = self.getCurrentUser(returnToken=True)
            self.client.token = token['_id']

    def _geocodeTweet(item, tmpdir):
        file_name = os.path.join(tmpdir, item['name'])
        print file_name

    @access.public
    @loadmodel(model='item', level=AccessType.WRITE)
    def geocodeTweet(self, item, params):
        # output is a file id for a geojson file in the item
        fileId = self._findFileId(item)
        if fileId is not None:
            return {'_id': fileId}
        itemId = str(item['_id'])
        tmpdir = self._createWorkDir(itemId)
        self._downloadItemFiles(itemId, tmpdir)
        geocodedFile = self._convertToGeoJson(item, tmpdir)
        self._geocodeTweet(itemId, geojsonFile)
        self._cleanWorkDir(tmpdir)
        fileId = self._findFileId(item)
        return {'_id': fileId}
    geocodeTweet.description = (
        Description('Geocode single or collection of tweet using carmen method.')
        .param('tweets', 'Collection of tweet', paramType='json')
        .errorResponse('ID was invalid.')
        .errorResponse('Write permission denied on the Item.', 403))