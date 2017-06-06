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

import ast
import json
import os

from httmock import urlmatch, HTTMock, response as httmockresponse
import requests

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

@urlmatch(scheme='http', netloc='localhost:8087')
def twofishes_mock(url, request):
    pluginTestDir = os.path.dirname(os.path.realpath(__file__))
    filepath = os.path.join(pluginTestDir, 'data', 'twofishes_response.json')
    with open(filepath) as mock_response:
        content = json.loads(mock_response.read())
        headers = {
            'content-length': len(content),
            'content-type': 'application/json'
        }
        return httmockresponse(200, content, headers, request=request)


class TwoFishesTestCase(base.TestCase):

    """
    Tests of the minerva geocoder endpoints.
    """

    def setUp(self):
        """
        Set up the test case
        """
        super(TwoFishesTestCase, self).setUp()

        self.user = self.model('user').createUser('user', 'passwd', 'tst', 'usr',
                                                  'usr@u.com')

    def testCreateMinervaDataset(self):
        with HTTMock(twofishes_mock):
            twofishes = 'http://localhost:8087'
            locations = ['boston']
            name = 'boston.geojson'
            self.request(path='/minerva_geocoder/geojson',
                         method='POST',
                         params={'twofishes': twofishes,
                                 'locations': locations,
                                 'name': name}, user=self.user)

            # Make sure an item is created named boston.geojson
            resp = self.request(path='/item', method='GET', user=self.user,
                                params={'text': name})
            self.assertEquals(len(resp.body), 1)

            # Check whether metadata is created correctly so that document
            # has the key minerva
            self.assertTrue("minerva" in resp.json[0]['meta'])
