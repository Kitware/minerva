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
    base.enabledPlugins.append('romanesco')
    base.enabledPlugins.append('gravatar')
    base.enabledPlugins.append('minerva')
    base.startServer(False)


def tearDownModule():
    """
    Stop the server.
    """
    base.stopServer()


class SourceTestCase(base.TestCase):
    """
    Tests of the minerva source API endpoints.
    """

    def setUp(self):
        """
        Set up the test case with  a user
        """
        super(SourceTestCase, self).setUp()

        self._user = self.model('user').createUser(
            'minervauser', 'password', 'minerva', 'user',
            'minervauser@example.com')


    def testSource(self):
        """
        Test the minerva source API endpoints.
        """

        # at first the source folder is None

        path = '/minerva_source/folder'
        params = {
            'userId': self._user['_id'],
        }
        response = self.request(path=path, method='GET', params=params)
        self.assertStatusOk(response)
        folder = response.json
        self.assertEquals(folder, None)

        # create a source folder

        response = self.request(path=path, method='POST', params=params)
        self.assertStatus(response, 401)  # unauthorized

        response = self.request(path=path, method='POST', params=params, user=self._user)

        self.assertStatusOk(response)
        folder = response.json
        self.assertNotEquals(folder, None)
        self.assertEquals(folder['baseParentType'], 'user')
        self.assertEquals(folder['baseParentId'], str(self._user['_id']))

        ## get the folder now that is has been created

        response = self.request(path=path, method='GET', params=params)
        self.assertStatusOk(response)
        # response should be Null b/c we don't have permissions to see anything
        # TODO is it better to always make it private and just throw a 401 in this case ?
        folder = response.json
        self.assertEquals(folder, None)

        # get the folder passing in the user

        response = self.request(path=path, method='GET', params=params, user=self._user)

        self.assertStatusOk(response)
        folder = response.json
        self.assertNotEquals(folder, None)
        self.assertEquals(folder['baseParentType'], 'user')
        self.assertEquals(folder['baseParentId'], str(self._user['_id']))

        ## create some items in the source folder, even though these aren't real sources
        ## this exercises the endpoint to return sources

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

        path = '/minerva_source'
        params = {
            'userId': self._user['_id'],
        }

        ## need to check with user and without

        response = self.request(path=path, method='GET', params=params)
        # should have no responses because we didn't pass in a user
        self.assertStatusOk(response)
        self.assertEquals(len(response.json), 0)

        response = self.request(path=path, method='GET', params=params, user=self._user)
        self.assertStatusOk(response)
        self.assertEquals(len(response.json), 2)
        sourceIds = [d['_id'] for d in response.json]
        self.assertTrue(item1Id in sourceIds, "expected item1Id in sources")
        self.assertTrue(item2Id in sourceIds, "expected item2Id in sources")
