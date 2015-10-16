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


class PostgresSource(Source):

    def __init__(self):
        self.resourceName = 'minerva_source_postgres'
        self.route('POST', (), self.createPostgresSource)

    @access.user
    def createPostgresSource(self, params):
        name = params['name']
        baseURL = params['baseURL']
        parsedUrl = getUrlParts(baseURL)
        hostName = parsedUrl.netloc
        dbname = params['dbname']
        username = params['username'] if 'username' in params else None
        password = params['password'] if 'password' in params else None
        minerva_metadata = {
            'source_type': 'postgres',
            'postgres_params': {
                'dbname': dbname,
                'base_url': baseURL,
                'host_name': hostName
            }
        }
        if username and password:
            enc_creds = encryptCredentials("{}:{}".format(
                username, password))
            minerva_metadata['postgres_params']['credentials'] = enc_creds
        desc = 'postgres source for  %s' % name
        return self.createSource(name, minerva_metadata, desc)
    createPostgresSource.description = (
        Description('Create a source from an external postgres server.')
        .responseClass('Item')
        .param('name', 'The name of the postgres source', required=True)
        .param('baseURL', 'URL of the postgres service', required=True)
        .param('dbname', 'Database name of interest', required=True)
        .param('username', 'Postgres username', required=False)
        .param('password', 'Postgres password', required=False)
        .errorResponse('Write permission denied on the source folder.', 403))
