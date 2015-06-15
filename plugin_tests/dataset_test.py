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

# Need to set the environment variable before importing girder
os.environ['GIRDER_PORT'] = os.environ.get('GIRDER_TEST_PORT', '20200')  # noqa

from tests import base


def setUpModule():
    """
    Enable the minerva plugin and start the server.
    """
    base.enabledPlugins.append('minerva')
    base.startServer(False)


def tearDownModule():
    """
    Stop the server.
    """
    base.stopServer()


class DatasetTestCase(base.TestCase):
    """
    Tests of the minerva dataset API endpoints.
    """

    def setUp(self):
        """
        Set up the test case with  a user
        """
        super(DatasetTestCase, self).setUp()

        self._user = self.model('user').createUser(
            'minervauser', 'password', 'minerva', 'user',
            'minervauser@example.com')


    def testDataset(self):
        """
        Test the minerva dataset API enpdpoints.
        """
        self.assertEqual(0, 0)

        # at first the dataset folder is None

        path = '/minerva_dataset/folder'
        params = {
            'userId': self._user['_id'],
        }
        response = self.request(path=path, method='GET', params=params)
        self.assertStatusOk(response)
        folder = response.json['folder']
        self.assertEquals(folder, None)

        # create a dataset folder

        response = self.request(path=path, method='POST', params=params)
        self.assertStatus(response, 401)  # unauthorized

        response = self.request(path=path, method='POST', params=params, user=self._user)

        self.assertStatusOk(response)
        folder = response.json['folder']
        self.assertNotEquals(folder, None)
        self.assertEquals(folder['baseParentType'], 'user')
        self.assertEquals(folder['baseParentId'], str(self._user['_id']))

        # get the folder now that is has been created

        response = self.request(path=path, method='GET', params=params)
        self.assertStatusOk(response)
        # response should be Null b/c we don't have permissions to see anything
        # TODO is it better to always make it private and just throw a 401 in this case ?
        folder = response.json['folder']
        self.assertEquals(folder, None)

        # get the folder passing in the user

        response = self.request(path=path, method='GET', params=params, user=self._user)

        self.assertStatusOk(response)
        folder = response.json['folder']
        self.assertNotEquals(folder, None)
        self.assertEquals(folder['baseParentType'], 'user')
        self.assertEquals(folder['baseParentId'], str(self._user['_id']))

        # create some items in the dataset folder, even though these aren't real datasets
        # this exercises the endpoint to return datasets

        params = {
            'name': 'item1',
            'folderId': folder['_id']
        }
        response = self.request(path='/item', method='POST', params=params,
                                            user=self._user)
        item1Id = response.json['_id']
        params = {
            'name': 'item2',
            'folderId': folder['_id']
        }
        response = self.request(path='/item', method='POST', params=params,
                                            user=self._user)
        item2Id = response.json['_id']

        path = '/minerva_dataset'
        params = {
            'userId': self._user['_id'],
        }

        # need to check with user and without

        response = self.request(path=path, method='GET', params=params)
        # should have no responses because we didn't pass in a user
        self.assertStatusOk(response)
        self.assertEquals(len(response.json), 0)

        response = self.request(path=path, method='GET', params=params, user=self._user)
        self.assertStatusOk(response)
        self.assertEquals(len(response.json), 2)
        datasetIds = [d['_id'] for d in response.json]
        self.assertTrue(item1Id in datasetIds, "expected item1Id in datasets")
        self.assertTrue(item2Id in datasetIds, "expected item2Id in datasets")

        #
        # Test minerva_dataset/id/dataset creating a dataset from uploads
        #

        def createDataset(itemname, files, error=None):
            # create the item
            params = {
                'name': itemname,
                'folderId': folder['_id']
            }
            response = self.request(path='/item', method='POST', params=params, user=self._user)
            self.assertStatusOk(response)
            itemId = response.json['_id']

            for itemfile in files:
                filename = itemfile['name']
                filepath = itemfile['path']
                mimeType = itemfile['mimeType']
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

            # create a dataset from the item
            path = '/minerva_dataset/{}/dataset'.format(itemId)
            response = self.request(
                path=path,
                method='POST',
                user=self._user,
            )
            if error is not None:
                self.assertStatus(response, error)
            else:
                self.assertStatusOk(response)
            return response.json, itemId

        pluginTestDir = os.path.dirname(os.path.realpath(__file__))

        # geojson
        files = [{
            'name': 'states.geojson',
            'path': os.path.join(pluginTestDir, 'testdata', 'states.geojson'),
            'mimeType': 'application/vnd.geo+json'
        }]
        minervaMetadata, itemId = createDataset('geojson', files)
        self.assertEquals(minervaMetadata['original_type'], 'geojson', 'Expected geojson dataset original_type')
        self.assertEquals(minervaMetadata['geojson_file']['name'], 'states.geojson', 'Expected geojson file to be set')

        # shapefile
        fileExts = ['cpg', 'dbf', 'prj', 'shp', 'shx']
        files = [{
            'name': 'shapefile.' + ext,
            'path': os.path.join(pluginTestDir, 'testdata', 'shapefile.' + ext),
            'mimeType': 'application/octet-stream'
        } for ext in fileExts]
        minervaMetadata, itemId = createDataset('shapefile', files)
        self.assertEquals(minervaMetadata['original_type'], 'shapefile', 'Expected shapefile dataset original_type')

        # json array
        files = [{
            'name': 'twopoints.json',
            'path': os.path.join(pluginTestDir, 'testdata', 'twopoints.json'),
            'mimeType': 'application/json'
        }]
        jsonMinervaMetadata, jsonItemId = createDataset('twopoints', files)
        self.assertEquals(jsonMinervaMetadata['original_type'], 'json', 'Expected json dataset original_type')

        # csv
        files = [{
            'name': 'points.csv',
            'path': os.path.join(pluginTestDir, 'testdata', 'points.csv'),
            'mimeType': 'application/csv'
        }]
        minervaMetadata, itemId = createDataset('csv', files)
        self.assertEquals(minervaMetadata['original_type'], 'csv', 'Expected csv dataset original_type')

        # other type exception
        files = [{
            'name': 'points.other',
            'path': os.path.join(pluginTestDir, 'testdata', 'points.other'),
            'mimeType': 'application/other'
        }]
        minervaMetadata, itemId = createDataset('other', files, 400)

        #
        # Test minerva_dataset/id/jsonrow creating an example row of json
        #

        path = '/minerva_dataset/{}/jsonrow'.format(jsonItemId)
        response = self.request(
            path=path,
            method='POST',
            user=self._user,
        )
        self.assertHasKeys(response.json, ['json_row'])
        self.assertHasKeys(response.json['json_row'], ['coordinates'])

        #
        # Test minerva_dataset/id/geojson creating geojson from json
        #

        # get the item metadata
        path = '/item/{}'.format(jsonItemId)
        response = self.request(
            path=path,
            method='GET',
            user=self._user,
        )
        metadata = response.json

        # update the minerva metadata with coordinate mapping
        jsonMinervaMetadata["mapper"] = {
            "latitudeKeypath": "$.coordinates.coordinates[1]",
            "longitudeKeypath": "$.coordinates.coordinates[0]"
        }

        metadata['minerva'] = jsonMinervaMetadata
        path = '/item/{}/metadata'.format(jsonItemId)
        response = self.request(
            path=path,
            method='PUT',
            user=self._user,
            body=json.dumps(metadata),
            type='application/json'
        )
        metadata = response.json

        # create geojson in the dataset
        path = '/minerva_dataset/{}/geojson'.format(jsonItemId)
        response = self.request(
            path=path,
            method='POST',
            user=self._user,
        )
        self.assertHasKeys(response.json, ['geojson_file'])

        # download the file and test it is valid geojson
        geojsonFileId = response.json['geojson_file']['_id']
        path = '/file/{}/download'.format(geojsonFileId)
        response = self.request(
            path=path,
            method='GET',
            user=self._user,
            isJson=False
        )
        geojsonContents = self.getBody(response)
        import geojson
        twopointsGeojson = geojson.loads(geojsonContents)
        self.assertEquals(len(twopointsGeojson['features']), 2, 'geojson should have two features')
