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
    base.enabledPlugins.append('jobs')
    base.enabledPlugins.append('romanesco')
    base.enabledPlugins.append('gravatar')
    base.enabledPlugins.append('minerva')
    base.startServer()


def tearDownModule():
    """
    Stop the server.
    """
    base.stopServer()


class SessionTestCase(base.TestCase):
    """
    Tests of the minerva session API endpoints.
    """

    def setUp(self):
        """
        Set up the test case with  a user
        """
        super(SessionTestCase, self).setUp()

        self._user = self.model('user').createUser(
            'minervauser', 'password', 'minerva', 'user',
            'minervauser@example.com')
        self._nonAdminUser = self.model('user').createUser(
            'nonadmin', 'password', 'minerva', 'user',
            'nonadmin@example.com')


    def testSession(self):
        """
        Test the minerva session API enpdpoints.
        """

        # Should not be able to get a session folder when not logged in.

        path = '/minerva_session/folder'
        params = {
            'userId': self._user['_id'],
        }
        response = self.request(path=path, method='GET', params=params)
        self.assertStatus(response, 401)  # unauthorized

        # Create a session folder.

        response = self.request(path=path, method='POST', params=params)
        self.assertStatus(response, 401)  # unauthorized

        response = self.request(path=path, method='POST', params=params, user=self._user)

        self.assertStatusOk(response)
        folder = response.json['folder']
        self.assertNotEquals(folder, None)
        self.assertEquals(folder['baseParentType'], 'user')
        self.assertEquals(folder['baseParentId'], str(self._user['_id']))

        # Get the folder now that is has been created.

        response = self.request(path=path, method='GET', params=params)
        self.assertStatus(response, 401)  # unauthorized

        # Get the folder passing in the user.

        response = self.request(path=path, method='GET', params=params, user=self._user)

        self.assertStatusOk(response)
        folder = response.json['folder']
        self.assertNotEquals(folder, None)
        self.assertEquals(folder['baseParentType'], 'user')
        self.assertEquals(folder['baseParentId'], str(self._user['_id']))

        # Create some items in the session folder, even though these aren't real sessions,
        # this exercises the endpoint to return sessions.

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

        path = '/minerva_session'
        params = {
            'userId': self._user['_id'],
        }

        # Need to check with user and without.

        response = self.request(path=path, method='GET', params=params)
        self.assertStatus(response, 401)  # unauthorized

        response = self.request(path=path, method='GET', params=params, user=self._user)
        self.assertStatusOk(response)
        self.assertEquals(len(response.json), 2)
        sessionIds = [d['_id'] for d in response.json]
        self.assertTrue(item1Id in sessionIds, "expected item1Id in sessions")
        self.assertTrue(item2Id in sessionIds, "expected item2Id in sessions")

        # Test getting the session folder for a non admin user, which should create the folder.

        path = '/minerva_session/folder'
        params = {
            'userId': self._nonAdminUser['_id'],
        }
        response = self.request(path=path, method='GET', params=params, user=self._nonAdminUser)
        self.assertStatusOk(response)

        # Test listing the session folder for a non admin user.
        path = '/minerva_session'
        params = {
            'userId': self._nonAdminUser['_id'],
        }
        response = self.request(path=path, method='GET', params=params, user=self._nonAdminUser)
        self.assertStatusOk(response)
