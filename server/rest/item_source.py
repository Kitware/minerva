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
from girder.plugins.minerva.utility.minerva_utility import \
    updateMinervaMetadata


class ItemSource(Source):

    def __init__(self):
        self.resourceName = 'minerva_source_item'
        self.route('POST', (), self.createItemSource)

    @access.user
    def createItemSource(self, params):
        name = params['name']
        minerva_metadata = {
            'source_type': 'item'
        }
        if 'type' in params:
            minerva_metadata['item_type'] = params['type']
        return self.createSource(name, minerva_metadata)
    createItemSource.description = (
        Description('Create an Item Source in the Source folder.')
        .responseClass('Item')
        .param('name', 'Name of the Item Source', required=True)
        .param('type', 'Mime type of the Item Source', required=False)
        .errorResponse('ID was invalid.')
        .errorResponse('Write permission denied on the Item.', 403))
