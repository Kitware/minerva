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

# Need to set the environment variable before importing girder
os.environ['GIRDER_PORT'] = os.environ.get('GIRDER_TEST_PORT', '20200')  # noqa

from tests import base


def setUpModule():
    """
    Enable the minerva plugin and start the server.
    """
    base.enabledPlugins.append('jobs')
    base.enabledPlugins.append('gravatar')
    base.enabledPlugins.append('minerva')
    base.startServer(False)


def tearDownModule():
    """
    Stop the server.
    """
    base.stopServer()


class GeojsonTestCase(base.TestCase):

    """
    Tests of the minerva geojson API endpoints.
    """

    def setUp(self):
        """
        Set up the test case with  a user
        """
        super(GeojsonTestCase, self).setUp()

        self._user = self.model('user').createUser(
            'minervauser', 'password', 'minerva', 'user',
            'minervauser@example.com')

    def testCreateGeojsonDataset(self):
        """
        Test the minerva Geojson Dataset create API endpoint.
        """

        # Create the dataset folder.

        path = '/minerva_dataset/folder'
        params = {
            'userId': self._user['_id'],
        }
        response = self.request(path=path, method='POST', params=params, user=self._user)
        self.assertStatusOk(response)
        datasetFolder = response.json['folder']
        datasetParentId = datasetFolder['parentId']

        # Create an item in the dataset parent folder.

        params = {
            'name': 'misplaced_item',
            'folderId': datasetParentId
        }
        response = self.request(path='/item', method='POST', params=params, user=self._user)
        self.assertStatusOk(response)
        misplacedItemId = response.json['_id']

        # Attempt to create a geojson dataset in the wrong folder.

        path = '/minerva_dataset_geojson'
        params = {
            'itemId': misplacedItemId
        }
        response = self.request(path=path, method='POST', params=params, user=self._user)
        self.assertStatus(response, 400)



        # Helper function to create an item and upload a file on disk.

        def createItemFromFile(datasetFolderId, itemName, itemFile):
            # create the item
            params = {
                'name': itemName,
                'folderId': datasetFolderId
            }
            response = self.request(path='/item', method='POST', params=params, user=self._user)
            self.assertStatusOk(response)
            itemId = response.json['_id']

            filename = itemFile['name']
            filepath = itemFile['path']
            mimeType = itemFile['mimeType']
            sizeBytes = os.stat(filepath).st_size

            # create the file
            response = self.request(
                path='/file',
                method='POST',
                user=self._user,
                params={
                    'parentType': 'item',
                    'parentId': itemId,
                    'name': filename,
                    'size': sizeBytes,
                    'mimeType': mimeType
                }
            )
            self.assertStatusOk(response)
            uploadId = response.json['_id']

            # upload the file contents
            with open(filepath, 'rb') as file:
                filedata = file.read()

            response = self.multipartRequest(
                path='/file/chunk',
                user=self._user,
                fields=[('offset', 0), ('uploadId', uploadId)],
                files=[('chunk', filename, filedata)]
            )
            self.assertStatusOk(response)

            return itemId


        # Create an item in the dataset folder without a json or geojson ext.

        pluginTestDir = os.path.dirname(os.path.realpath(__file__))

        csvFile = {
            'name': 'points.csv',
            'path': os.path.join(pluginTestDir, 'data', 'points.csv'),
            'mimeType': 'application/csv'
        }
        csvItemId = createItemFromFile(datasetFolder['_id'], 'csvItem', csvFile)

        path = '/minerva_dataset_geojson'
        params = {
            'itemId': csvItemId
        }
        response = self.request(path=path, method='POST', params=params, user=self._user)
        self.assertStatus(response, 400)

        # Create a geojson dataset from a json file item.

        jsonFile = {
            'name': 'twopoints.json',
            'path': os.path.join(pluginTestDir, 'data', 'twopoints.json'),
            'mimeType': 'application/json'
        }
        jsonItemId = createItemFromFile(datasetFolder['_id'], 'jsonItem', jsonFile)

        path = '/minerva_dataset_geojson'
        params = {
            'itemId': jsonItemId
        }
        response = self.request(path=path, method='POST', params=params, user=self._user)
        self.assertStatusOk(response)
        # Ensure this is an item and not just minerva metadata.
        self.assertHasKeys(response.json, ['baseParentType'])
        # Ensure the minerva metadata is correct.
        self.assertHasKeys(response.json['meta']['minerva'], ['geojson_file', 'dataset_type', 'original_type', 'original_files'])
        self.assertEquals(response.json['meta']['minerva']['dataset_type'], 'geojson')
        self.assertEquals(response.json['meta']['minerva']['original_type'], 'geojson')

        # Create a geojson dataset from a geojson file item.

        geojsonFile = {
            'name': 'states.geojson',
            'path': os.path.join(pluginTestDir, 'data', 'states.geojson'),
            'mimeType': 'application/vnd.geo+json'
        }
        geojsonItemId = createItemFromFile(datasetFolder['_id'], 'geojsonItem', geojsonFile)

        path = '/minerva_dataset_geojson'
        params = {
            'itemId': geojsonItemId
        }
        response = self.request(path=path, method='POST', params=params, user=self._user)
        self.assertStatusOk(response)
        # Ensure this is an item and not just minerva metadata.
        self.assertHasKeys(response.json, ['baseParentType'])
        # Ensure the minerva metadata is correct.
        self.assertHasKeys(response.json['meta']['minerva'], ['geojson_file', 'dataset_type', 'original_type', 'original_files'])
        self.assertEquals(response.json['meta']['minerva']['dataset_type'], 'geojson')
        self.assertEquals(response.json['meta']['minerva']['original_type'], 'geojson')
