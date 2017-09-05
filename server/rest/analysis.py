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
from girder.api.rest import Resource, RestException

from girder.plugins.minerva.utility.minerva_utility import (findAnalysisFolder,
                                                            findAnalysisByName,
                                                            addJobOutput)
from girder.plugins.minerva.rest.dataset import Dataset


class Analysis(Resource):
    def __init__(self):
        super(Analysis, self).__init__()
        self.resourceName = 'minerva_analysis'
        self.route('GET', ('folder',), self.getAnalysisFolder)
        self.route('POST', ('folder',), self.createAnalysisFolder)
        self.route('POST', ('bsve_search',), self.bsveSearchAnalysis)
        self.route('POST', ('mmwr_import',), self.bsveMMWRAnalysis)

    @access.user
    def getAnalysisFolder(self, params):
        folder = findAnalysisFolder(self.getCurrentUser())
        return {'folder': folder}
    getAnalysisFolder.description = (
        Description('Get the minerva analysis folder.'))

    @access.user
    def createAnalysisFolder(self, params):
        folder = findAnalysisFolder(self.getCurrentUser(), create=True)
        return {'folder': folder}
    createAnalysisFolder.description = (
        Description('Create the minerva analysis folder, a global resource.'))

    @access.user
    def bsveSearchAnalysis(self, params):
        currentUser = self.getCurrentUser()
        datasetName = params['datasetName']
        bsveSearchParams = params['bsveSearchParams']
        analysis = findAnalysisByName(currentUser, 'bsve search')
        # TODO in case can't find analysis?

        try:
            bsveSearchParams = json.loads(bsveSearchParams)
        except ValueError:
            raise RestException('bsveSearchParams is invalid JSON.')

        minerva_metadata = {
            'dataset_type': 'geojson',
            'source_type': 'bsve_search',
            'bsve_search_params': bsveSearchParams,
            'original_type': 'json'
        }

        datasetResource = Dataset()
        dataset = datasetResource.constructDataset(datasetName,
                                                   minerva_metadata,
                                                   'created by bsve search')
        params = {
            'bsveSearchParams': bsveSearchParams
        }

        # TODO change token to job token
        user, token = self.getCurrentUser(returnToken=True)
        kwargs = {
            'params': params,
            'user': currentUser,
            'dataset': dataset,
            'analysis': analysis,
            'token': token
        }

        job = self.model('job', 'jobs').createLocalJob(
            title='bsve search: %s' % datasetName,
            user=currentUser,
            type='bsve.search',
            public=False,
            kwargs=kwargs,
            module='girder.plugins.minerva.jobs.bsve_search_worker',
            async=True)
        addJobOutput(job, dataset)
        self.model('job', 'jobs').scheduleJob(job)
        return job

    bsveSearchAnalysis.description = (
        Description('Create the minerva analysis folder, a global resource.')
        .param('datasetName', 'Name of the dataset created by this analysis.')
        .param('bsveSearchParams', 'JSON search parameters to send to bsve.'))

    @access.user
    def bsveMMWRAnalysis(self, params):
        currentUser = self.getCurrentUser()
        datasetName = params['datasetName']
        count = int(params.get('count', 1000))
        analysis = findAnalysisByName(currentUser, 'MMWR data import')
        # TODO in case can't find analysis?

        minerva_metadata = {
            'dataset_type': 'geojson',
            'source_type': 'mmwr_data_import',
            'original_type': 'json'
        }

        datasetResource = Dataset()
        dataset = datasetResource.constructDataset(
            datasetName,
            minerva_metadata,
            'created by MMWR data import'
        )
        params = {
            'count': count
        }

        # TODO change token to job token
        user, token = self.getCurrentUser(returnToken=True)
        kwargs = {
            'params': params,
            'user': currentUser,
            'dataset': dataset,
            'analysis': analysis,
            'token': token
        }

        job = self.model('job', 'jobs').createLocalJob(
            title='MMWR import: %s' % datasetName,
            user=currentUser,
            type='bsve.mmwr',
            public=False,
            kwargs=kwargs,
            module='girder.plugins.minerva.jobs.soda_import_worker',
            async=True)
        addJobOutput(job, dataset)
        self.model('job', 'jobs').scheduleJob(job)
        return job

    bsveMMWRAnalysis.description = (
        Description('Create a new accumulated MMWR dataset from the BSVE.')
        .param('datasetName', 'Name of the dataset created by this analysis.')
        .param(
            'count', 'The number of items to get from the server',
            required=False
        )
    )
