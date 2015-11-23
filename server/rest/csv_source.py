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
import json

from girder.api import access
from girder.api.describe import Description
from girder.api.rest import getUrlParts

from girder.plugins.minerva.rest.source import Source
from girder.plugins.minerva.utility.minerva_utility import encryptCredentials


class CSVSource(Source):

    def __init__(self):
        self.resourceName = 'minerva_source_csv'
        self.route('POST', (), self.createCSVSource)

    @access.user
    def createCSVSource(self, params):

        name = params['name']
        geojson = params['geojson']
        minerva_metadata = {
            'source_type': 'csv',
            'geojson': json.loads(geojson)
        }

        desc = 'csv source for  %s' % name
        return self.createSource(name, minerva_metadata, desc)
    createCSVSource.description = (
        Description('Create a source from an external csv server.')
        .responseClass('Item')
        .param('name', 'The name of the csv source', required=True)
        .param('geojson', 'Geojson that was created from the csv data', required=True)
        .errorResponse('Write permission denied on the source folder.', 403))
