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
from girder.api import access
from girder.api.describe import Description, autoDescribeRoute
from girder.api.rest import getUrlParts

from owslib.wms import WebMapService

from girder.plugins.minerva.rest.dataset import Dataset
from girder.plugins.minerva.rest.wms_styles import WmsStyle
from girder.plugins.minerva.utility.minerva_utility import decryptCredentials
from girder.plugins.minerva.utility.minerva_utility import encryptCredentials

import requests
import json


class WMS2Dataset(Dataset):

    def __init__(self):
        super(WMS2Dataset, self).__init__()
        self.resourceName = 'minerva_dataset_wms2'
        self.route('POST', (), self.create)

    @access.user
    @autoDescribeRoute(
        Description('Ceate WMS tile dataset')
        .param('name', '', paramType='body')
        .param('url', '', paramType='body')
    )
    def create(self, params, name, url):
        minervaMetaData = {
            'source_type': 'item',
            'dataset_type': 'wms2',
            'source': {
                'layer_source': 'WMS'
            },
            'geo_render': {
                'type': 'wms2'
            },
            'wms2_params': {
                'url': url
            }
        }
        dataset = self.constructDataset(name, minervaMetaData)
        return dataset
