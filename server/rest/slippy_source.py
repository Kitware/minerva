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
from girder.api.rest import getUrlParts

from girder.plugins.minerva.rest.source import Source

class SlippySource(Source):

    def __init__(self):
        self.resourceName = 'minerva_source_slippy'
        self.route('POST', (), self.createSlippySource)

    @access.user
    def createSlippySource(self, params):
        name = params['name']
        baseURL = params['baseURL']
        parsedUrl = getUrlParts(baseURL)
        hostName = parsedUrl.netloc

        layer = {
            'layer_title': name,
            'layer_type': 'slippy'
        }
        layers = [layer,]

        minerva_metadata = {
            'source_type': 'slippy',
            'layers': layers,
            'slippy_params': {
                'base_url': baseURL,
                'host_name': hostName
            }
        }
        desc = 'slippy source for  %s' % name
        return self.createSource(name, minerva_metadata, desc)
    createSlippySource.description = (
        Description('Create a source from an external slippy server.')
        .responseClass('Item')
        .param('name', 'The name of the slippy source', required=True)
        .param('baseURL', 'URL where the slippy is served', required=True)
        .errorResponse('Cannot access slippy server.', 404))
