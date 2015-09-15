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

# A Quick implementation to call GetCapabilities
from owslib.wms import WebMapService

from girder.plugins.minerva.rest.source import Source


class WmsSource(Source):

    def __init__(self):
        self.resourceName = 'minerva_source_wms'
        self.route('POST', (), self.createWmsSource)

    @access.user
    def createWmsSource(self, params):
        print params
        name = params['name']
        baseURL = params['baseURL']
        username = params['username'] if 'username' in params else None
        password = params['password'] if 'password' in params else None
        wms = WebMapService(baseURL, version='1.1.1',
                            username=username,
                            password=password
                            )
        layers = list(wms.contents)
        minerva_metadata = {
            'source_type': 'wms',
            'layers': layers,
            'wms_params': {
                'base_url': baseURL
            }
        }
        desc = 'wms source for  %s' % name
        return self.createSource(name, minerva_metadata, desc)
    createWmsSource.description = (
        Description('Create a source from an external wms server.')
        .responseClass('Item')
        .param('name', 'The name of the wms source', required=True)
        .param('baseURL', 'URL where the wms is served', required=True)
        .param('username', 'geoserver username', required=False)
        .param('password', 'geoserver password', required=False)
        .errorResponse('Write permission denied on the source folder.', 403))
