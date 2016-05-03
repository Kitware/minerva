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
import sys

# Need to set the environment variable before importing girder
girder_port = os.environ.get('GIRDER_TEST_PORT', '20200')
os.environ['GIRDER_PORT'] = girder_port# noqa

from tests import base
from girder_client import GirderClient

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../utility')))
import import_analyses

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


class ImportAnalysesTestCase(base.TestCase):
    """
    Tests of the minerva S3 dataset API endpoints.
    """

    def setUp(self):
        """
        Set up the test case with  a user
        """
        super(ImportAnalysesTestCase, self).setUp()
        self._username = 'minervauser'
        self._password = 'opensesame'
        self._user = self.model('user').createUser(
            self._username, self._password, 'minerva', 'user',
            'minervauser@example.com')


    def testImportAnalyses(self):
        """
        Test importing a romanesco analysis
        """
        client = GirderClient('localhost', girder_port)
        client.authenticate(self._username, self._password)

        path = os.path.dirname(os.path.realpath(__file__))
        analyses_path = os.path.join(path, 'analyses', 'import_analyses')

        import_analyses.import_analyses(client, analyses_path)

        # Get the analysis folder
        path = '/minerva_analysis/folder'
        response = self.request(path=path, method='GET', params={}, user=self._user)
        self.assertStatusOk(response)
        analyses_folder = response.json['folder']

        path = '/item'
        params = {
            'folderId': analyses_folder['_id']
        }
        response = self.request(path=path, method='GET', params=params, user=self._user)
        self.assertStatusOk(response)
        self.assertEquals(len(response.json), 2, 'Expecting two analyses')
        analysis = response.json[0]
        self.assertEquals(analysis['name'], 'add', 'Expecting analysis one name to be "add"')
        expected_meta = {
            u'minerva': {
                u'analysis_type': u'add',
                u'analysis_name': u'add',
                u'analysis_id': analysis['_id']
            },
            u'analysis': {
                u'inputs': [{
                    u'default': {
                        u'data': u'0',
                        u'format': u'json'
                    },
                    u'type': u'number',
                    u'name': u'a',
                    u'format': u'number'
                },
                {
                    u'type': u'number',
                    u'name': u'b',
                    u'format':
                    u'number'
                }],
                u'script': u'c = a + b',
                u'mode': u'python',
                u'outputs': [{
                    u'type': u'number',
                    u'name': u'c',
                    u'format': u'number'
                }],
                u'name': u'add'
            }
        }
        self.assertEquals(analysis['meta'], expected_meta, 'Unexpected value for meta data')

        analysis = response.json[1]
        self.assertEquals(analysis['name'], 'local', 'Expecting analysis two name to be "local"')
        expected_meta = {
            u'minerva': {
                u'analysis_type': u'local type',
                u'analysis_name': u'local',
                u'analysis_id': analysis['_id']
            }
        }
        self.assertEquals(analysis['meta'], expected_meta, 'Unexpected value for meta data')
