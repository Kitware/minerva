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


class AnalysisTestCase(base.TestCase):
    """
    Tests of the minerva analysis functionality.
    """

    def setUp(self):
        """
        Set up the test case with  a user
        """
        super(AnalysisTestCase, self).setUp()

        self._user = self.model('user').createUser(
            'minervauser', 'password', 'minerva', 'user',
            'minervauser@example.com')

    def testAnalysisEndpoints(self):
        """ Test the minerva analysis endpoints.  """

        # at first there is no analysis folder or minerva collection

        path = '/minerva_analysis/folder'
        response = self.request(path=path, method='GET')
        self.assertStatus(response, 401)  # unauthorized

        response = self.request(path=path, method='GET', user=self._user)
        self.assertStatusOk(response)
        self.assertEquals(response.json['folder'], None, 'No analysis folder should exist')

        # create the analysis folder

        response = self.request(path=path, method='POST', user=self._user)
        self.assertStatusOk(response)
        self.assertNotEquals(response.json['folder'], None, 'An analysis folder should exist')

        # ensure we can get it

        response = self.request(path=path, method='GET', user=self._user)
        self.assertStatusOk(response)
        self.assertNotEquals(response.json['folder'], None, 'An analysis folder should exist')
