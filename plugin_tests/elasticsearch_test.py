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


class ElasticsearchTestCase(base.TestCase):

    """
    Tests of the minerva source API endpoints.
    """

    def setUp(self):
        """
        Set up the test case with  a user
        """
        super(ElasticsearchTestCase, self).setUp()

        self._user = self.model('user').createUser(
            'minervauser', 'password', 'minerva', 'user',
            'minervauser@example.com')

    def testCreateElasticsearchSource(self):
        """
        Test the minerva Elasticsearch source API endpoints.
        """

        path = '/minerva_source_elasticsearch'
        name = 'testElasticsearch'
        username = ''
        password = ''
        baseURL = 'http://elasticsearch.com'
        index = 'myindex'
        params = {
            'name': name,
            'username': username,
            'password': password,
            'index': index,
            'baseURL': baseURL
        }
        response = self.request(path=path, method='POST', params=params, user=self._user)
        self.assertStatusOk(response)
        elasticsearchSource = response.json
        print(response.json)
        minerva_metadata = elasticsearchSource['meta']['minerva']
        self.assertEquals(elasticsearchSource['name'], name, 'incorrect elasticsearch source name')
        self.assertEquals(minerva_metadata['source_type'], 'elasticsearch', 'incorrect elasticsearch source type')
        self.assertEquals(minerva_metadata['elasticsearch_params']['base_url'], baseURL, 'incorrect elasticsearch source baseURL')
        self.assertEquals(minerva_metadata['elasticsearch_params']['index'], index, 'incorrect elasticsearch source index')

        return elasticsearchSource
