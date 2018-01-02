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

import geojson

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
        Test the minerva dataset API enppoints.
        """

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
        # Test minerva_dataset/id/item creating a dataset from uploads
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
            path = '/minerva_dataset/{}/item'.format(itemId)
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
            'path': os.path.join(pluginTestDir, 'data', 'states.geojson'),
            'mimeType': 'application/vnd.geo+json'
        }]
        geojsonDatasetItem, itemId = createDataset('geojson', files)
        stateItemId = itemId
        minervaMetadata = geojsonDatasetItem['meta']['minerva']
        self.assertEquals(minervaMetadata['original_type'],
                          'geojson', 'Expected geojson dataset original_type')
        self.assertEquals(minervaMetadata['geojson_file']['name'],
                          'states.geojson', 'Expected geojson file to be set')

        # geojson-timeseries
        files = [{
            'name': 'geojson-timeseries_1.geojson',
            'path': os.path.join(pluginTestDir, 'data', 'geojson-timeseries_1.geojson'),
            'mimeType': 'application/vnd.geo+json'
        }]
        geojsonDatasetItem, itemId = createDataset('geojson-timeseries', files)
        minervaMetadata = geojsonDatasetItem['meta']['minerva']
        self.assertEquals(minervaMetadata['original_type'], 'geojson-timeseries')
        self.assertEquals(minervaMetadata['geojson_file']['name'], 'geojson-timeseries_1.geojson')

        # json array
        files = [{
            'name': 'twopoints.json',
            'path': os.path.join(pluginTestDir, 'data', 'twopoints.json'),
            'mimeType': 'application/json'
        }]
        jsonDatasetItem, jsonItemId = createDataset('twopoints', files)
        jsonMinervaMetadata = jsonDatasetItem['meta']['minerva']
        self.assertEquals(jsonMinervaMetadata['original_type'],
                          'json', 'Expected json dataset original_type')

        # csv
        files = [{
            'name': 'points.csv',
            'path': os.path.join(pluginTestDir, 'data', 'points.csv'),
            'mimeType': 'application/csv'
        }]
        csvDatasetItem, csvItemId = createDataset('csv', files)
        csvMinervaMetadata = csvDatasetItem['meta']['minerva']
        self.assertEquals(csvMinervaMetadata['original_type'],
                          'csv', 'Expected csv dataset original_type')

        # other type exception
        files = [{
            'name': 'points.other',
            'path': os.path.join(pluginTestDir, 'data', 'points.other'),
            'mimeType': 'application/other'
        }]
        otherDatasetItem, itemId = createDataset('other', files)

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
        twopointsGeojson = geojson.loads(geojsonContents)
        self.assertEquals(len(twopointsGeojson['features']), 2, 'geojson should have two features')
        # to ensure correct mapping, -85 < x < -80, 20 < y < 30
        features = twopointsGeojson['features']
        for feature in features:
            coordinates = feature['geometry']['coordinates']
            self.assertTrue(-85 < coordinates[0], 'x coordinate out of range')
            self.assertTrue(-80 > coordinates[0], 'x coordinate out of range')
            self.assertTrue(20 < coordinates[1], 'y coordinate out of range')
            self.assertTrue(30 > coordinates[1], 'y coordinate out of range')

        #
        # Test minerva_dataset/id/geojson creating geojson from csv
        # Currently should throw an exception as this conversion is
        # only implemented in javascript.
        #

        # get the item metadata
        path = '/item/{}'.format(csvItemId)
        response = self.request(
            path=path,
            method='GET',
            user=self._user,
        )
        metadata = response.json

        # update the minerva metadata with coordinate mapping
        csvMinervaMetadata["mapper"] = {
            "latitudeColumn": "2",
            "longitudeColumn": "1"
        }

        metadata['minerva'] = csvMinervaMetadata
        path = '/item/{}/metadata'.format(csvItemId)
        response = self.request(
            path=path,
            method='PUT',
            user=self._user,
            body=json.dumps(metadata),
            type='application/json'
        )
        metadata = response.json

        # create geojson in the dataset
        path = '/minerva_dataset/{}/geojson'.format(csvItemId)
        response = self.request(
            path=path,
            method='POST',
            user=self._user,
        )
        self.assertStatus(response, 400)

        # test new dataset download endpoint
        response = self.request(
            path='/minerva_dataset/{0}/download'.format(stateItemId),
            method='GET',
            user=self._user
        )
        geojsonContent = response.json
        self.assertEqual(len(geojsonContent['features'][0]['geometry']['coordinates']), 245)


        # test new dataset download endpoint
        response = self.request(
            path='/minerva_dataset/{0}/bound'.format(stateItemId),
            method='GET',
            user=self._user
        )
        geojsonContent = response.json
        self.assertEqual(geojsonContent['lrx'], -89.686924)
        self.assertEqual(geojsonContent['lry'], 31.332502)
        self.assertEqual(geojsonContent['ulx'], -114.813613)
        self.assertEqual(geojsonContent['uly'], 41.003444)
