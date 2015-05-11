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

from tests import base


def setUpModule():
    """
    Enable the minerva plugin and start the server.
    """
    base.enabledPlugins.append('minerva')
    base.startServer()


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

        # TODO
        # will want some test data , a shapefile and a geojson
        # upload the geojson, then process it, then list it as
        # a dataset

        # probably change this to an overall minerva test
