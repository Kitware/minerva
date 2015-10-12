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
from girder.api.rest import getUrlParts, Resource

from girder.plugins.minerva.rest.source import Source
from girder.plugins.minerva.utility.minerva_utility import encryptCredentials

from girder.plugins.minerva.utility.minerva_utility import (findAnalysisFolder,
                                                            findAnalysisByName,
                                                            findDatasetFolder)


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
        index = params['index']
        username = params['username'] if 'username' in params else None
        password = params['password'] if 'password' in params else None
        minerva_metadata = {
            'source_type': 'elasticsearch',
            'elasticsearch_params': {
                'index': index,
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
        .param('index', 'Index of interest', required=True)
        .param('username', 'Elasticsearch username', required=False)
        .param('password', 'Elasticsearch password', required=False)
        .errorResponse('Write permission denied on the source folder.', 403))


class ElasticsearchQuery(Resource):

    def __init__(self):
        self.resourceName = 'minerva_query_elasticsearch'
        self.route('POST', (), self.queryElasticsearch)

    @access.user
    def queryElasticsearch(self, params):
        currentUser = self.getCurrentUser()
        datasetName = params['datasetName']
        elasticsearchParams = params['searchParams']

        datasetFolder = findDatasetFolder(currentUser, currentUser)
        dataset = (self.model('item').createItem(datasetName,
                                                 currentUser,
                                                 datasetFolder,
                                                 'created by elasticsearch query'))

        user, token = self.getCurrentUser(returnToken=True)
        kwargs = {
            'params': params,
            'user': currentUser,
            'dataset': dataset,
            'token': token,
            'sourceId': params['sourceId']
        }

        job = self.model('job', 'jobs').createLocalJob(
            title='elasticsearch: %s' % datasetName,
            user=currentUser,
            type='elasticsearch',
            public=False,
            kwargs=kwargs,
            module='girder.plugins.minerva.jobs.elasticsearch_worker',
            async=True)

        if 'meta' in dataset:
            metadata = dataset['meta']
        else:
            metadata = {}

        minerva_metadata = {
            'dataset_id': dataset['_id'],
            'source': 'elasticsearch',
            'elasticsearch_params': elasticsearchParams,
            'original_type': 'json'
        }
        metadata['minerva'] = minerva_metadata
        self.model('item').setMetadata(dataset, metadata)

        self.model('job', 'jobs').scheduleJob(job)

        return minerva_metadata

    queryElasticsearch.description = (
        Description('Query an elasticsearch source.')
        .param('sourceId', 'Item id of the elasticsearch source to query')
        .param('datasetName', 'The name of the resulting dataset')
        .param('query', 'JSON Body of an elasticsearch query'))
