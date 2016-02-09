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
import time
import json


# Need to set the environment variable before importing girder
girder_port = os.environ.get('GIRDER_TEST_PORT', '20200')
os.environ['GIRDER_PORT'] = girder_port# noqa

from tests import base
from girder_client import GirderClient

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../utility')))
import import_analyses
import romanesco

def setUpModule():
    """
    Enable the minerva plugin and start the server.
    """
    base.enabledPlugins.append('minerva')
    base.enabledPlugins.append('jobs')
    base.enabledPlugins.append('romanesco')
    base.startServer(False)


def tearDownModule():
    """
    Stop the server.
    """
    base.stopServer()


class ContourAnalysesTestCase(base.TestCase):
    """
    Tests of the minerva S3 dataset API endpoints.
    """

    def setUp(self):
        """
        Set up the test case with  a user
        """
        super(ContourAnalysesTestCase, self).setUp()
        self._username = 'minervauser'
        self._password = 'opensesame'
        self._user = self.model('user').createUser(
            self._username, self._password, 'minerva', 'user',
            'minervauser@example.com')

        # Import the analyses
        self._client = GirderClient('localhost', girder_port)
        self._client.authenticate(self._username, self._password)

        path = os.path.dirname(os.path.realpath(__file__))
        analyses_path = os.path.join(path, '../analyses/NEX/')

        import_analyses.import_analyses(self._client, analyses_path)

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

        # Find the contour analysis
        for analysis in response.json:
            if analysis['name'] == 'contour':
                self._analysis = analysis

        # Now import an S3 prefix
        path = '/minerva_dataset/folder'
        params = {
            'userId': self._user['_id']
        }
        response = self.request(path=path, method='POST', params=params, user=self._user)
        self.assertStatusOk(response)
        folder = response.json['folder']

        # create the item
        params = {
            'name': 'bobby',
            'folderId': folder['_id']
        }
        response = self.request(path='/item', method='POST', params=params, user=self._user)
        self.assertStatusOk(response)
        itemId = response.json['_id']

        # create a s3 dataset from the item
        prefix = '/CMIP5/CommonGrid/hadcm3/rcp45/mon/r1i1p1/pr/'
        bucket = 'nasanex'
        params = {
            'name': 'nasanex',
            'bucket': bucket,
            'prefix': prefix,
            'accessKeyId': '',
            'secret': '',
            'service': '',
            'readOnly': True
        }

        path = '/minerva_dataset_s3/%s/dataset' % str(itemId)
        response = self.request(
            path=path,
            method='POST',
            user=self._user,
            params=params
        )
        self.assertStatusOk(response)

        import_folder_id = response.json['folderId']

        # Wait for import to occur
        time.sleep(10)

        path = '/item'
        params = {
            'folderId': import_folder_id
        }
        response = self.request(path=path, method='GET', user=self._user,
                                params=params)
        self.assertStatusOk(response)
        self.assertEqual(len(response.json), 1, 'Excepting only a single item')

        item_id = str(response.json[0]['_id'])


        # Now list the files
        path = '/item/%s/files' % item_id
        response = self.request(path=path, method='GET', user=self._user)
        self.assertStatusOk(response)
        self.assertEqual(len(response.json), 1, 'Excepting only a single file')

        self._dataset_file_id = response.json[0]['_id']


    def testContourAnalysis(self):
        """
        Test contour analysis
        """
        inputs =  {
            'host': {
                'format': 'json',
                'data': 'localhost'
            },
            'port': {
                'format': 'json',
                'data': girder_port
            },
            'token': {
                'format': 'json',
                'data': self._client.token
            },
            'fileId': {
                'format': 'json',
                'data': self._dataset_file_id
            },
            'variable': {
                'format': 'json',
                'data': 'pr'
            },
            'timestep': {
                'format': 'number',
                'data': 0
            }
        }

        outputs =  {
            'result': {
                'format': 'json'
            }
        }

        analysis = self._analysis['meta']['analysis']
        result = romanesco.run(analysis, inputs=inputs, outputs=outputs)
        output_item_id = str(result['output_item_id']['data'])

        # Download the item and check it what we expect
        path = '/item/%s/download' % output_item_id
        response = self.request(path=path, method='GET', user=self._user)
        self.assertStatusOk(response)

        data_path = os.path.join(os.path.dirname(__file__), 'data', 'expected_contour.json' )


        with open(data_path, 'r') as fp:
            expected_result = json.load(fp)

        self.assertEquals(response.json, expected_result, 'Unexpected result')

