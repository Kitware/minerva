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
import urllib
import mock
from tests import base


def setUpModule():  # noqa
    """Enable the minerva plugin and start the server."""
    base.enabledPlugins.append('jobs')
    base.enabledPlugins.append('romanesco')
    base.enabledPlugins.append('gravatar')
    base.enabledPlugins.append('minerva')
    base.startServer()


def tearDownModule():  # noqa
    """Stop the server."""
    base.stopServer()


def download_data(url, dest, *a, **kw):
    """Send the test dataset."""
    pth = os.path.join(
        os.path.dirname(__file__),
        'data',
        'allCountries.zip'
    )

    open(dest, 'w').write(open(pth).read())


class GeonamesTestCase(base.TestCase):

    """Tests of the minerva geonames API endpoints."""

    def setUp(self):  # noqa
        """Set up the test case with  a user."""
        super(GeonamesTestCase, self).setUp()

        self._admin = self.model('user').createUser(
            'admin', 'password', 'admin', 'user',
            'admin@example.com', admin=True)
        self._user = self.model('user').createUser(
            'minervauser', 'password', 'minerva', 'user',
            'minervauser@example.com')

    def test_geocode(self):
        """Test importing the geonames database and geocoding."""
        # get the minerva user's public folder
        params = {
            'parentType': 'user',
            'parentId': self._user['_id'],
            'text': 'public'
        }
        response = self.request(
            path='/folder',
            method='GET',
            params=params,
            user=self._user
        )
        self.assertStatusOk(response)
        user_folder = response.json[0]

        with mock.patch.object(urllib, 'urlretrieve', download_data):
            # attempt to import as a regular user
            response = self.request(
                path='/geonames/setup',
                method='POST',
                params={
                    'folder': user_folder['_id']
                },
                user=self._user
            )
            self.assertStatus(response, 403)

            # import the database
            response = self.request(
                path='/geonames/setup',
                method='POST',
                params={
                    'folder': user_folder['_id']
                },
                user=self._admin
            )
            self.assertStatusOk(response)

        # set the geonames folder
        response = self.request(
            path='/system/setting',
            method='PUT',
            params={
                'key': 'minerva.geonames_folder',
                'value': user_folder['_id']
            },
            user=self._admin
        )
        self.assertStatusOk(response)

        # hit the geocoding endpoint
        response = self.request(
            path='/geonames/geocode',
            params={
                'name': '"little sheep mountain"'
            },
            user=self._user
        )
        self.assertStatusOk(response)

        # check the response
        self.assertEqual(
            len(response.json['features']),
            1
        )
        self.assertEqual(
            response.json['features'][0]['id'],
            5428978  # geonameid
        )
