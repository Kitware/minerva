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

import json
import os
import sys
import time
#import zipfile

#import geojson

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


class MeanContourAnalysisTestCase(base.TestCase):
    """
    Tests the server side of the mean_contour_analysis.
    """

    def setUp(self):
        """
        Set up the test case with  a user
        """
        super(MeanContourAnalysisTestCase, self).setUp()

        self._user = self.model('user').createUser(
            'minervauser', 'password', 'minerva', 'user',
            'minervauser@example.com')

        # create a dataset folder for the user

        path = '/minerva_dataset/folder'
        params = {
            'userId': self._user['_id'],
        }
        response = self.request(path=path, method='POST', params=params, user=self._user)
        self.assertStatusOk(response)
        self._datasetFolder = response.json['folder']

        # create the analysis folder

        path = '/minerva_analysis/folder'
        response = self.request(path=path, method='POST', user=self._user)
        self.assertStatusOk(response)
        self.assertNotEquals(response.json['folder'], None, 'An analysis folder should exist')
        self._analysisFolder = response.json['folder']

        # import the mean_contour_analysis
        client = GirderClient('localhost', girder_port)
        client.authenticate('minervauser', 'password')

        analysis_path = os.path.abspath(os.path.join(os.path.dirname(os.path.realpath(__file__)), '../analyses/NEX'))
        import_analyses.import_analyses(client, analysis_path)

        path = '/item'
        params = {
            'folderId': self._analysisFolder['_id']
        }
        response = self.request(path=path, method='GET', params=params, user=self._user)
        self.assertStatusOk(response)
        self._meanContourAnalysis = None
        for analysis in response.json:
            if analysis['name'] == 'mean contour':
                self._meanContourAnalysis = analysis
        self.assertNotEquals(self._meanContourAnalysis, None, 'mean contour analysis not found')

        # give this user the ability to run romanesco jobs
        path = '/system/setting'
        params = {
                'list': json.dumps([
                    {"key": "romanesco.broker", "value": ""},
                    {"key": "romanesco.backend", "value": ""},
                    {"key": "romanesco.full_access_users", "value": json.dumps(['minervauser'])},
                    {"key": "romanesco.full_access_groups", "value": "[]"},
                    {"key": "romanesco.safe_folders", "value": "[]"},
                    {"key": "romanesco.require_auth", "value": True}])
        }
        response = self.request(path=path, method='PUT', params=params, user=self._user)
        self.assertTrue(response.json)

    def testAnalysis(self):
        """
        Test the mean_contour_analysis workflow by issuing the API
        calls the inerva dataset API enppoints.
        """

        # create the S3 Nasanex dataset item
        path = '/item'
        params = {
            'userId': self._user['_id'],
            'folderId': self._datasetFolder['_id'],
            'name': 'nasanex'
        }
        response = self.request(path=path, method='POST', params=params, user=self._user)
        self.assertStatusOk(response)
        nasanexItem = response.json


        # create an s3 dataset
        path = '/minerva_dataset_s3/{}/dataset'.format(nasanexItem['_id'])
        params = {
            'bucket': 'nasanex',
            'name': 'nasanex',
            'prefix': '/CMIP5/CommonGrid/gfdl-esm2g/rcp45/mon/r1i1p1/pr/',
            'readOnly': True
        }
        response = self.request(path=path, method='POST', params=params, user=self._user)
        self.assertStatusOk(response)
        nasanexMinervaMetadata = response.json

        # get the job tied in with dataset creation
        path = '/job'
        response = self.request(path=path, method='GET', params=params, user=self._user)
        self.assertStatusOk(response)
        # first job should have type='s3.import'
        job = response.json[0]
        self.assertEquals(job['type'], 's3.import')

        # import jobs after server has started and jobs pseudo-module exists
        from girder.plugins.jobs.constants import JobStatus
        #wait for the async job to complete
        jobFinished = int(job['status']) == JobStatus.SUCCESS
        count = 0
        while not jobFinished and count < 5:
            time.sleep(10)
            count += 1
            # get the job and check if it has been updated
            path = '/job/{}'.format(job['_id'])
            response = self.request(
                path=path,
                method='GET',
                user=self._user
            )
            self.assertStatusOk(response)
            job = response.json
            jobFinished = int(job['status']) == JobStatus.SUCCESS
        self.assertTrue(jobFinished, 'Dataset job never finished')

        # get the item now imported into the S3 dataset folder
        s3FolderId = nasanexMinervaMetadata['folderId']
        path = '/item'
        params = {
            'folderId': s3FolderId
        }
        response = self.request(path=path, method='GET', params=params, user=self._user)
        self.assertStatusOk(response)
        s3ImportedItem = response.json[0]

        # select this imported item in the S3 dataset
        path = '/minerva_dataset_s3/{}/dataset'.format(nasanexItem['_id'])
        nasanexMinervaMetadata['selectedItems'] = '["'+str(s3ImportedItem['_id'])+'"]'
        response = self.request(path=path, method='PUT', params=nasanexMinervaMetadata, user=self._user)
        self.assertStatusOk(response)
        nasanexMinervaMetadata = response.json

        # get the file id of the file in the imported item
        path = '/item/{}/files'.format(s3ImportedItem['_id'])
        params = {
            'limit': 1
        }
        response = self.request(path=path, method='GET', params=params, user=self._user)
        fileId = response.json[0]['_id']

        # Run the analysis in romanseco, calling romanesco.run directly so that
        # the celery/romanesco worker doesn't need to be running.

        # Requires SPARK_HOME to be set in the running ENV

        parameter = 'pr'
        data = {
            'inputs': {
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
                    'data': self._genToken(self._user)
                },
                'fileId': {
                    'format': 'json',
                    'name': 'fileId',
                    'data': fileId
                },
                'variable': {
                    'format': 'json',
                    'data': parameter
                }

            },
            'outputs': {
                'result': {
                    'format': 'json'
                }
            }
        }

        romAnalysis = self._meanContourAnalysis['meta']['analysis']
        outputs = romanesco.run(romAnalysis, data['inputs'], data['outputs'])
        outputItemId = outputs['output_item_id']['data']

        # check the sha512 of the result file
        path = '/item/{}/files'.format(outputItemId)
        params = {
            'limit': 1
        }
        response = self.request(path=path, method='GET', params=params, user=self._user)
        uploadedSha512 = response.json[0]['sha512']
        expectedSha512 = 'af37c2e693b1b9f45dac8d3baff2b7017403be1455e572ce6aa2d324cc526444f7d50b43825740707f1b2e8d6150029eb65ac23e3e979ca56c5d4e2f5182daf1'
        self.assertEquals(uploadedSha512, expectedSha512, 'mean_contour_analysis output file has unexpected sha512')
