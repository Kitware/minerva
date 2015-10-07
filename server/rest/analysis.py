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
                                                            findDatasetFolder)


class Analysis(Resource):
    def __init__(self):
        self.resourceName = 'minerva_analysis'
        self.route('GET', ('folder',), self.getAnalysisFolder)
        self.route('POST', ('folder',), self.createAnalysisFolder)
        self.route('POST', ('bsve_search',), self.bsveSearchAnalysis)

    @access.user
    def getAnalysisFolder(self, params):
        folder = findAnalysisFolder(self.getCurrentUser(), create=True)
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

        datasetFolder = findDatasetFolder(currentUser, currentUser)
        # TODO
        # try findOne earlier
        # all throughout utility
        # create a new dataset in the dataset folder with this name
        # TODO in case of duplicates?
        dataset = (self.model('item').createItem(datasetName, currentUser,
                                                 datasetFolder,
                                                 'created by bsve search'))

        params = {
            'bsveSearchParams': bsveSearchParams
        }

        # create a local job with bsve search
        # tie in the dataset id with the local job
        # TODO would we rather create the dataset at the end of the bsve search?
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

        if 'meta' in dataset:
            metadata = dataset['meta']
        else:
            metadata = {}

        minerva_metadata = {
            'dataset_id': dataset['_id'],
            'source': 'bsve_search',
            'bsve_search_params': bsveSearchParams,
            'original_type': 'json'
        }
        metadata['minerva'] = minerva_metadata
        self.model('item').setMetadata(dataset, metadata)

        self.model('job', 'jobs').scheduleJob(job)

        return minerva_metadata

    bsveSearchAnalysis.description = (
        Description('Create the minerva analysis folder, a global resource.')
        .param('datasetName', 'Name of the dataset created by this analysis.')
        .param('bsveSearchParams', 'JSON search parameters to send to bsve.'))
