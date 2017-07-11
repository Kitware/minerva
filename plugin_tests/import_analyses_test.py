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
from tests import base

# Need to set the environment variable before importing girder
girder_port = os.environ.get('GIRDER_TEST_PORT', '20200')
os.environ['GIRDER_PORT'] = girder_port# noqa


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../utility')))


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
