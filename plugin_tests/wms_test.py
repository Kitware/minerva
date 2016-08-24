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

import gzip
import httplib
from httmock import urlmatch, HTTMock, response as httmockresponse
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


@urlmatch(netloc=r'.*')
def wms_mock(url, request):
    pluginTestDir = os.path.dirname(os.path.realpath(__file__))
    filepath = os.path.join(pluginTestDir, 'data', 'wms_capabilities.xml.gz')
    with gzip.open(filepath, 'rb') as bsve_search_file:
        content = bsve_search_file.read()
        headers = {
            'content-length': len(content),
            'content-type': 'application/xml'
        }
        return httmockresponse(200, content, headers, request=request)


class WmsTestCase(base.TestCase):

    """
    Tests of the minerva source API endpoints.
    """

    def setUp(self):
        """
        Set up the test case with  a user
        """
        super(WmsTestCase, self).setUp()

        self._user = self.model('user').createUser(
            'minervauser', 'password', 'minerva', 'user',
            'minervauser@example.com')

    def testCreateWmsSourceAndDataset(self):
        """
        Test the minerva WMS source and dataset API endpoints.
        """

        # Create the source.
        path = '/minerva_datasets_wms'
        name = 'testWMS'
        typeName = 'geonode:boxes_with_date'
        username = ''
        password = ''
        baseURL = 'http://fake.geoserver.fak/geoserver/ows'
        params = {
            'name': name,
            'username': username,
            'password': password,
            'baseURL': baseURL
        }

        
        with HTTMock(wms_mock):
            response = self.request(path=path, method='POST', params=params, user=self._user)
        self.assertStatusOk(response)
        wmsSource = response.json

        # Create the dataset.
        path = '/minerva_datasets_wms'
        name = 'testWMSdataset'
        wmsParams = {}
        params = {
            'name': name,
            'wmsSourceId': wmsSource['_id'],
            'typeName': typeName,
            'wmsParams': wmsParams
        }

        class MockResponse():
            def __init__(self):
                pass

            def read(self):
                return'PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48U2VydmljZUV4Y2VwdGlvblJlcG9ydCB2ZXJzaW9uPSIxLjMuMCIgeG1sbnM9Imh0dHA6Ly93d3cub3Blbmdpcy5uZXQvb2djIiB4bWxuczp4c2k9Imh0dHA6Ly93d3cudzMub3JnLzIwMDEvWE1MU2NoZW1hLWluc3RhbmNlIiB4c2k6c2NoZW1hTG9jYXRpb249Imh0dHA6Ly93d3cub3Blbmdpcy5uZXQvb2djIGh0dHA6Ly9kZW1vLmJvdW5kbGVzc2dlby5jb206ODAvZ2Vvc2VydmVyL3NjaGVtYXMvd21zLzEuMy4wL2V4Y2VwdGlvbnNfMV8zXzAueHNkIj4gICA8U2VydmljZUV4Y2VwdGlvbj4KICAgICAgQ2FuJmFwb3M7dCBvYnRhaW4gdGhlIHNjaGVtYSBmb3IgdGhlIHJlcXVpcmVkIGxheWVyLgpnZW9ub2RlOmdsb2JhbF90ZW1wIGxheWVyIGRvZXMgbm90IGV4aXN0Lgo8L1NlcnZpY2VFeGNlcHRpb24+PC9TZXJ2aWNlRXhjZXB0aW9uUmVwb3J0Pg==\n'

        class MockHTTPConnection():

            def __init__(self, url):
                self.url = url

            def request(self, method, url, headers):
                pass

            def getresponse(self):
                return MockResponse()

        httpConn = httplib.HTTPConnection
        # Monkey patch HTTPConnection for testing legend
        httplib.HTTPConnection = MockHTTPConnection

        response = self.request(path=path, method='POST', params=params, user=self._user)
        wmsDataset = response.json
        minerva_metadata = wmsDataset['meta']['minerva']
        self.assertEquals(wmsDataset['name'], name, 'incorrect wms dataset name')
        self.assertEquals(minerva_metadata['source_id'], wmsSource['_id'], 'incorrect wms source_id')
        self.assertEquals(minerva_metadata['dataset_type'], 'wms', 'incorrect wms dataset type')
        self.assertEquals(minerva_metadata['base_url'], wmsSource['meta']['minerva']['wms_params']['base_url'],'incorrect wms dataset baseURL')
        self.assertEquals(minerva_metadata['type_name'], typeName, 'incorrect wms dataset typeName')
        legend = u'UEQ5NGJXd2dkbVZ5YzJsdmJqMGlNUzR3SWlCbGJtTnZaR2x1WnowaVZWUkdMVGdpUHo0OFUyVnlkbWxqWlVWNFkyVndkR2x2YmxKbGNHOXlkQ0IyWlhKemFXOXVQU0l4TGpNdU1DSWdlRzFzYm5NOUltaDBkSEE2THk5M2QzY3ViM0JsYm1kcGN5NXVaWFF2YjJkaklpQjRiV3h1Y3pwNGMyazlJbWgwZEhBNkx5OTNkM2N1ZHpNdWIzSm5Mekl3TURFdldFMU1VMk5vWlcxaExXbHVjM1JoYm1ObElpQjRjMms2YzJOb1pXMWhURzlqWVhScGIyNDlJbWgwZEhBNkx5OTNkM2N1YjNCbGJtZHBjeTV1WlhRdmIyZGpJR2gwZEhBNkx5OWtaVzF2TG1KdmRXNWtiR1Z6YzJkbGJ5NWpiMjA2T0RBdloyVnZjMlZ5ZG1WeUwzTmphR1Z0WVhNdmQyMXpMekV1TXk0d0wyVjRZMlZ3ZEdsdmJuTmZNVjh6WHpBdWVITmtJajRnSUNBOFUyVnlkbWxqWlVWNFkyVndkR2x2Ymo0S0lDQWdJQ0FnUTJGdUptRndiM003ZENCdlluUmhhVzRnZEdobElITmphR1Z0WVNCbWIzSWdkR2hsSUhKbGNYVnBjbVZrSUd4aGVXVnlMZ3BuWlc5dWIyUmxPbWRzYjJKaGJGOTBaVzF3SUd4aGVXVnlJR1J2WlhNZ2JtOTBJR1Y0YVhOMExnbzhMMU5sY25acFkyVkZlR05sY0hScGIyNCtQQzlUWlhKMmFXTmxSWGhqWlhCMGFXOXVVbVZ3YjNKMFBnPT0K'
        self.assertEquals(minerva_metadata['legend'].strip(), legend, 'incorrect wms dataset legend')

        # Reset HTTPConnection to real module.
        httplib.HTTPConnection = httpConn

    def testCreateWmsSourceWithAuthentication(self):
        """
        Enter a username and password for a WMS source and ensure that they
        are correctly encrypted/decrypted.
        """
        # Create the source.
        path = '/minerva_source_wms'
        name = 'testWMS'
        username = 'user'
        password = 'password'
        baseURL = 'http://fake.geoserver.fak/geoserver/ows'
        params = {
            'name': name,
            'username': username,
            'password': password,
            'baseURL': baseURL
        }

        with HTTMock(wms_mock):
            response = self.request(path=path, method='POST', params=params, user=self._user)
        self.assertStatusOk(response)
        wmsSource = response.json

        credentials = wmsSource['meta']['minerva']['wms_params']['credentials']
        # Make sure credentials were encrypted.
        self.assertNotEqual(credentials, '{}:{}'.format(username, password),
                            "Credentials were not encrypted!")

        from girder.plugins.minerva.utility.minerva_utility import decryptCredentials
        decrypted = decryptCredentials(bytes(credentials))
        # Make sure credentials were correctly decrypted.
        self.assertEquals(decrypted, '{}:{}'.format(username, password),
                          'Credentials could not be correctly decrypted')
