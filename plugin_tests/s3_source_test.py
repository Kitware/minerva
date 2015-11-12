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


class S3SourceTestCase(base.TestCase):

    """
    Tests of the minerva S3 source API endpoints.
    """

    def setUp(self):
        """
        Set up the test case with  a user
        """
        super(S3SourceTestCase, self).setUp()

        self._user = self.model('user').createUser(
            'minervauser', 'password', 'minerva', 'user',
            'minervauser@example.com')

    def testCreateS3Source(self):
        """
        Test the minerva S3 source create API endpoint.
        """

        path = '/minerva_source_s3'
        name = 'nasanex'
        prefix = '/dontimportanythingplease'
        bucket = 'nasanex'
        params = {
            'name': name,
            'bucket': bucket,
            'prefix': prefix,
            'accessKeyId': '',
            'secret': '',
            'service': '',
            'readOnly': True
        }

        response = self.request(path=path, method='POST', params=params, user=self._user)
        self.assertStatusOk(response)
        source = response.json

        self.assertEquals(source['name'], name, 'incorrect source name')
        minerva_metadata = source['meta']['minerva']
        self.assertEquals(minerva_metadata['prefix'], prefix, 'Expected %s as prefix' % prefix)
        self.assertEquals(minerva_metadata['source_type'], 's3', 'Expected s3 source_type')
        self.assertEquals(minerva_metadata['bucket'], bucket, 'Expected s3 source bucket %s' % bucket)

        # Ensure the import folder has been created
        path = '/folder/%s' % str(minerva_metadata['folder_id'])
        response = self.request(path=path, method='GET', user=self._user)
        self.assertStatusOk(response)
        self.assertEquals(response.json['name'], prefix, 'Expected %s as folder name' % prefix)
