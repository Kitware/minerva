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

        # Source generates multiple datasets now
        source_type = [d['meta']['minerva']['source']['meta']['minerva']['source_type']
                      for d in wmsSource]

        base_url = [d['meta']['minerva']['source']['meta']['minerva']['wms_params']['base_url']
                    for d in wmsSource]

        source_name = [d['meta']['minerva']['source']['layer_source'] for d in wmsSource]
        
        self.assertTrue(len(set(source_type)) == 1 and source_type[0] == 'wms',
                        'incorrect wms dataset typeName')
        self.assertTrue(len(set(base_url)) == 1 and base_url[0] == baseURL,
                        'incorrect wms dataset baseURL')
        self.assertTrue(len(set(source_name)) == 1 and source_name[0] == name,
                        'incorrect wms source name')


    def testCreateWmsSourceWithAuthentication(self):
        """
        Enter a username and password for a WMS source and ensure that they
        are correctly encrypted/decrypted.
        """
        
        # Create the source.
        path = '/minerva_datasets_wms'
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

        from girder.plugins.minerva.utility.minerva_utility import decryptCredentials
        
        credentials = [decryptCredentials(bytes(d['meta']['minerva']['credentials']))
                       for d in wmsSource]

        self.assertTrue(len(set(credentials)) == 1 and
                        credentials[0] == "{}:{}".format(username, password))

    def testCheckDatasetsExistInDatabase(self):

        # Create the source.
        path = '/minerva_datasets_wms'
        name = 'testWMS'
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
        from girder.plugins.minerva.utility.minerva_utility import findDatasetFolder

        dataset_folder = findDatasetFolder(self._user, self._user)

        items = self.model('folder').childItems(dataset_folder)

        db_datasets = [i['meta']['minerva']['type_name'] for i in items]

        wmsSource = response.json

        response_datasets = [d['meta']['minerva']['type_name'] for d in wmsSource]

        self.assertEquals(len(db_datasets), len(response_datasets),
                          'Number of datasets do not match with  thedb')

        self.assertEquals(set(db_datasets), set(response_datasets),
                          'Dataset type_names do not math with the db')
