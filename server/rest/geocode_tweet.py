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

    def _geocodeTweet(self, file, item, tmpdir):
        import carmen, json
        file_name = os.path.join(tmpdir, item['name'], file['name'])
        print file_name

        with open(file_name) as infile:
            json_data = infile.readlines()
            tweets = []
            for item in json_data:
                try:
                    tweet = json.loads(item)
                    tweets.append(tweet)
                except ValueError as e:
                    print e
        infile.close()

        outfile = open(file_name, "w")
        for tweet in tweets:
            print tweet
            resolver = carmen.get_resolver()
            resolver.load_locations()
            location = resolver.resolve_tweet(tweet)
            if location is not None:
                print location[1]
                tweet["location"] = location[1].__dict__
        json.dump(tweets, outfile)
        outfile.close()
        return file_name

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

    def _cleanWorkDir(self, tmpdir):
        shutil.rmtree(tmpdir)

    def _findFileId(self, item):
        itemGeoJson = item['name'] + ".json"
        for file in self.model('item').childFiles(item):
            if file['name'] == itemGeoJson:
                return str(file['_id'])
        return None

    def _addFileToItem(self, itemId, jsonfile):
        self._initClient()
        self.client.uploadFileToItem(itemId, jsonfile)
        # TODO worry about stale authentication

    @access.public
    @loadmodel(model='item', level=AccessType.WRITE)
    def geocodeTweet(self, item, params):
        # output is a file id for a geojson file in the item
        fileId = self._findFileId(item)
        itemId = str(item['_id'])
        tmpdir = self._createWorkDir(itemId)
        self._downloadItemFiles(itemId, tmpdir)

        # WARNING: Expecting only one file per item
        num_files = self.model('item').childFiles(item).count()
        files = self.model('item').childFiles(item)
        if (num_files == 1):
            geocodedFile = self._geocodeTweet(files[0], item, tmpdir)
            self._addFileToItem(itemId, geocodedFile)
            self._cleanWorkDir(tmpdir)
            fileId = self._findFileId(item)
            return {'_id': fileId}
        else:
            return {'_id': ""}
    geocodeTweet.description = (
        Description('Geocode single or collection of tweet using carmen method.')
        .param('tweets', 'Collection of tweet', paramType='json')
        .errorResponse('ID was invalid.')
        .errorResponse('Write permission denied on the Item.', 403))