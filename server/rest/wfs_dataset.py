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
from girder.api.rest import loadmodel
from girder.constants import AccessType

from girder.plugins.minerva.rest.dataset import Dataset


class WfsDataset(Dataset):

    def __init__(self):
        self.resourceName = 'minerva_dataset_wfs'
        self.route('POST', (), self.createWfsDataset)

    @access.user
    @loadmodel(map={'wfsSourceId': 'wfsSource'}, model='item',
               level=AccessType.READ)
    def createWfsDataset(self, wfsSource, params):
        baseURL = wfsSource['meta']['minerva']['wfs_params']['base_url']
        typeName = params['typeName']
        self.requireParams(('name'), params)
        name = params['name']
        minerva_metadata = {
            'dataset_type': 'wfs',
            #'legend': legend,
            'source_id': wfsSource['_id'],
            'type_name': typeName,
            'base_url': baseURL
        }
        dataset = self.constructDataset(name, minerva_metadata)
        return dataset
    createWfsDataset.description = (
        Description('Create a WFS Dataset from a WFS Source.')
        .responseClass('Item')
        .param('name', 'The name of the wfs dataset', required=True)
        .param('wfsSourceId', 'Item ID of the WFS Source', required=True)
        .param('typeName', 'The type name of the WFS layer', required=True)
        .errorResponse('ID was invalid.')
        .errorResponse('Read permission denied on the Item.', 403))
