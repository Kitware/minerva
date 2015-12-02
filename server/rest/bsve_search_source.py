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

from girder.api import access
from girder.api.describe import Description

from girder.plugins.minerva.rest.source import Source
from girder.plugins.minerva.utility.minerva_utility import encryptCredentials


class BSVESearchSource(Source):

    # default base url
    _baseURL = 'http://search.bsvecosystem.net'

    def __init__(self):
        self.resourceName = 'minerva_source_bsve'
        self.route('POST', (), self.createBSVESearchSource)

    @access.user
    def createBSVESearchSource(self, params):

        self.requireParams(
            ('name', 'apikey', 'username', 'secretkey'),
            params
        )
        name = params['name']
        baseURL = params.get('baseURL', self._baseURL)
        apikey = params['apikey']
        username = params['username']
        secretkey = encryptCredentials(params['secretkey'])
        desc = 'BSVE data source for %s' % name

        metadata = {
            'source_type': 'bsve',
            'baseurl': baseURL,
            'username': username,
            'apikey': apikey,
            'secretkey': secretkey
        }

        return self.createSource(name, metadata, desc)

    createBSVESearchSource.description = (
        Description('Create a source from the BSVE.')
        .responseClass('Item')
        .param('name', 'The name of the BSVE source', required=True)
        .param('username', 'A BSVE user', required=True)
        .param('apikey', 'A BSVE api key', required=True)
        .param('secretkey', 'A BSVE secret key', required=True)
        .param('baseURL', 'URL where the BSVE is served', required=False)
        .errorResponse('Write permission denied on the source folder.', 403))
