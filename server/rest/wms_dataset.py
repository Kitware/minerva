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
from girder.api.describe import Description
from girder.api.rest import getUrlParts

from owslib.wms import WebMapService

from girder.plugins.minerva.rest.dataset import Dataset
from girder.plugins.minerva.utility.minerva_utility import decryptCredentials
from girder.plugins.minerva.utility.minerva_utility import encryptCredentials

import requests


class WmsDataset(Dataset):

    def __init__(self):
        self.resourceName = 'minerva_datasets_wms'
        self.route('POST', (), self.createWmsSource)

    @access.user
    def createWmsSource(self, params):
        def sourceMetadata(username, password, baseURL, hostName):
            minerva_metadata = {
                'source_type': 'wms',
                'wms_params': {
                    'base_url': baseURL,
                    'host_name': hostName
                }
            }

            if username and password:
                credentials = encryptCredentials("{}:{}".format(
                    username, password))
                minerva_metadata['wms_params']['credentials'] = credentials

            return minerva_metadata

        name = params['name']
        baseURL = params['baseURL']
        parsedUrl = getUrlParts(baseURL)
        hostName = parsedUrl.netloc
        username = params['username'] if 'username' in params else None
        password = params['password'] if 'password' in params else None
        wms = WebMapService(baseURL, version='1.1.1',
                            username=username,
                            password=password)
        layersType = list(wms.contents)
        layers = []
        source = sourceMetadata(username, password, baseURL, hostName)
        source['layer_source'] = name

        for layerType in layersType:
            layer = {
                'layer_title': wms[layerType].title,
                'layer_type': layerType
            }

            dataset = self.createWmsDataset(source,
                                            params={
                                                'typeName': layer['layer_type'],
                                                'name': layer['layer_title']})

            layers.append(dataset)

        return layers

    @access.user
    def createWmsDataset(self, wmsSource, params):
        baseURL = wmsSource['wms_params']['base_url']
        parsedUrl = getUrlParts(baseURL)
        typeName = params['typeName']

        if 'credentials' in wmsSource['wms_params']:
            credentials = (
                wmsSource['wms_params']['credentials']
            )
            basic_auth = 'Basic ' + b64encode(decryptCredentials(credentials))
            headers = {'Authorization': basic_auth}
        else:
            headers = {}
            credentials = None

        request_url = parsedUrl.scheme + '://' + parsedUrl.netloc + \
            parsedUrl.path
        r = requests.get(request_url, params={
            'service': 'WMS',
            'request': 'GetLegendGraphic',
            'format': 'image/png',
            'width': 20,
            'height': 20,
            'layer': params['typeName']}, headers=headers)
        legend = b64encode(r.content)

        self.requireParams(('name'), params)
        name = params['name']
        minerva_metadata = {
            'dataset_type': 'wms',
            'legend': legend,
            'source': wmsSource,
            'type_name': typeName,
            'base_url': baseURL
        }
        if credentials:
            minerva_metadata['credentials'] = credentials
        dataset = self.constructDataset(name, minerva_metadata)
        return dataset

    createWmsSource.description = (
        Description('Create a WMS Dataset from a WMS Source.')
        .responseClass('Item')
        .param('name', 'The name of the wms dataset', required=True)
        .param('typeName', 'The type name of the WMS layer', required=True)
        .param('username', '', required=False)
        .errorResponse('ID was invalid.')
        .errorResponse('Read permission denied on the Item.', 403))
