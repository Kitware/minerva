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
from girder.plugins.minerva.utility.minerva_utility import encryptCredentials


class ElasticsearchSource(Source):

    def __init__(self):
        self.resourceName = 'minerva_source_elasticsearch'
        self.route('POST', (), self.createElasticsearchSource)

    @access.user
    def createElasticsearchSource(self, params):
        name = params['name']
        baseURL = params['baseURL']
        parsedUrl = getUrlParts(baseURL)
        hostName = parsedUrl.netloc
        table = params['table']
        username = params['username'] if 'username' in params else None
        password = params['password'] if 'password' in params else None
        minerva_metadata = {
            'source_type': 'elasticsearch',
            'table': table,
            'elasticsearch_params': {
                'base_url': baseURL,
                'host_name': hostName
            }
        }
        if username and password:
            enc_creds = encryptCredentials("{}:{}".format(
                username, password))
            minerva_metadata['elasticsearch_params']['credentials'] = enc_creds
        desc = 'elasticsearch source for  %s' % name
        return self.createSource(name, minerva_metadata, desc)
    createElasticsearchSource.description = (
        Description('Create a source from an external elasticsearch server.')
        .responseClass('Item')
        .param('name', 'The name of the elasticsearch source', required=True)
        .param('baseURL', 'URL of the elasticsearch service', required=True)
        .param('table', 'Table of interest', required=True)
        .param('username', 'Elasticsearch username', required=False)
        .param('password', 'Elasticsearch password', required=False)
        .errorResponse('Write permission denied on the source folder.', 403))
