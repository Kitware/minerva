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
import os
import zipfile

import geojson

# Need to set the environment variable before importing girder
os.environ['GIRDER_PORT'] = os.environ.get('GIRDER_TEST_PORT', '20200')  # noqa

from tests import base


def setUpModule():
    """
    Enable the minerva plugin and start the server.
    """
    base.enabledPlugins.append('jobs')
    base.enabledPlugins.append('romanesco')
    base.enabledPlugins.append('gravatar')
    base.enabledPlugins.append('minerva')
    base.startServer(False)


def tearDownModule():
    """
    Stop the server.
    """
    base.stopServer()


class MongoDatasetTestCase(base.TestCase):
    """
    Tests of the minerva mongo dataset .
    """

    def setUp(self):
        """
        Set up the mongo db for the external dataset, with a collection
        named tweetsgeo, which have tweet data that is geolocated.
        """
        super(MongoDatasetTestCase, self).setUp()

        self._user = self.model('user').createUser(
            'minervauser', 'password', 'minerva', 'user',
            'minervauser@example.com')

        from girder.utility import config
        dbUri = config.getConfig()['database']['uri']
        self.dbName = 'minerva_test_external_mongo_dataset'
        dbUriParts = dbUri.split('/')[0:-1]
        self.dbUri = '/'.join(dbUriParts + [self.dbName])
        from girder.models import getDbConnection
        self.externalMongoDbConnection = getDbConnection(self.dbUri)
        self.externalMongoDb = self.externalMongoDbConnection.get_default_database()
        from girder.external.mongodb_proxy import MongoProxy
        self.collectionName = 'tweetsgeo'
        self.tweetsgeoCollection = MongoProxy(self.externalMongoDb[self.collectionName])
        # add test data to external dataset
        self.pluginTestDir = os.path.dirname(os.path.realpath(__file__))
        tweets100Path = os.path.join(self.pluginTestDir, 'data', 'tweets100.json')
        z = zipfile.ZipFile('%s.zip' % tweets100Path)
        tweets = json.load(z.open('tweets100.json'))
        from datetime import datetime
        dateformat = '%Y-%m-%dT%H:%M:%S'
        for tweet in tweets:
            d = datetime.strptime((tweet['created_at']), dateformat)
            tweet['created_at'] = int((d - datetime(1970, 1, 1)).total_seconds())
            self.tweetsgeoCollection.save(tweet)

    def tearDown(self):
        self.externalMongoDbConnection.drop_database(self.dbName)

    def testMongoDataSourceAndDataset(self):
        #create a mongo source
        path = '/minerva_source_mongo'
        response = self.request(
            path=path,
            method='POST',
            user=self._user,
            params={
                'name': 'tweetsgeodatasource',
                'dbConnectionUri': self.dbUri
            }
        )
        self.assertStatusOk(response)
        minerva_metadata = response.json['meta']['minerva']
        self.assertHasKeys(minerva_metadata, ['mongo_connection', 'source_type'])
        self.assertEquals(minerva_metadata['source_type'], 'mongo', 'expected mongo for source_type')
        self.assertEquals(minerva_metadata['mongo_connection']['db_uri'], self.dbUri, 'unexpected db uri')
        #create a mongo dataset
        sourceId = response.json['_id']
        path = '/minerva_dataset_mongo'
        response = self.request(
            path=path,
            method='POST',
            user=self._user,
            params={
                'name': self.collectionName,
                'mongoSourceId': sourceId,
                'mongo_collection': self.collectionName
            }
        )
        self.assertStatusOk(response)
        minerva_metadata = response.json['meta']['minerva']
        self.assertHasKeys(minerva_metadata, ['source_id', 'json_row', 'mongo_connection', 'json_row', 'original_type'])
        self.assertEquals(minerva_metadata['original_type'], 'mongo', 'expected mongo for original_type')
        self.assertEquals(minerva_metadata['mongo_connection']['db_uri'], self.dbUri, 'unexpected db uri')
        self.assertEquals(minerva_metadata['mongo_connection']['collection_name'],
                          self.collectionName, 'unexpected collection')
