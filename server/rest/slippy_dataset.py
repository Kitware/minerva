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
from base64 import b64encode
import httplib
import binascii
from girder.api import access
from girder.api.describe import Description
from girder.api.rest import loadmodel
from girder.api.rest import getUrlParts
from girder.constants import AccessType

from girder.plugins.minerva.rest.dataset import Dataset
from girder.plugins.minerva.utility.minerva_utility import decryptCredentials


class SlippyDataset(Dataset):

    def __init__(self):
        self.resourceName = 'minerva_dataset_slippy'
        self.route('POST', (), self.createSlippyDataset)

    @access.user
    @loadmodel(map={'slippySourceId': 'SlippySource'}, model='item',
               level=AccessType.READ)
    def createSlippyDataset(self, SlippySource, params):
        baseURL = SlippySource['meta']['minerva']['slippy_params']['base_url']
        parsedUrl = getUrlParts(baseURL)
        typeName = params['typeName']

        headers = {}
        credentials = None

        self.requireParams(('name'), params)
        name = params['name']
        minerva_metadata = {
            'dataset_type': 'slippy',
            'source_id': SlippySource['_id'],
            'type_name': typeName,
            'base_url': baseURL
        }
        dataset = self.constructDataset(name, minerva_metadata)
        return dataset
    createSlippyDataset.description = (
        Description('Create a Slippy Dataset from a Slippy Source.')
        .responseClass('Item')
        .param('name', 'The name of the Slippy dataset', required=True)
        .param('slippySourceId', 'Item ID of the Slippy Source', required=True)
        .param('typeName', 'The type name of the Slippy layer', required=True)
        .errorResponse('ID was invalid.')
        .errorResponse('Read permission denied on the Item.', 403))
