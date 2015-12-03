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
        self.resourceName = 'minerva_analysis'
        self.route('GET', ('folder',), self.getAnalysisFolder)
        self.route('POST', ('folder',), self.createAnalysisFolder)
        self.route('POST', ('bsve_search',), self.bsveSearchAnalysis)
        self.route('POST', ('pdf_table_extraction',),
                   self.pdfTableExtractionAnalysis)

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
            'source': 'bsve_search',
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
    def pdfTableExtractionAnalysis(self, params):
        currentUser = self.getCurrentUser()
        sourceId = params['sourceId']
        source = self.model('item').load(sourceId, user=currentUser)
        # TODO assuming only one file
        for itemFile in self.model('item').childFiles(source):
            fileId = itemFile['_id']




        pageNumber = params['pageNumber']
        analysis = findAnalysisByName(currentUser, 'pdf table extraction')

        # TODO want to give the option to set this from the UI?
        datasetName = 'pdf extract %s' % source['name']
        print(fileId)
        print(pageNumber)
        print(analysis)
        print datasetName

        minerva_metadata = {
            'dataset_type': 'text', # HACK very limited support
            'source': 'pdf_table_extraction',
            'source_id': sourceId,
            'file_id': fileId,
            'page_number': pageNumber
        }

        datasetResource = Dataset()
        dataset = datasetResource.constructDataset(datasetName,
                                                   minerva_metadata,
                                                   'created by pdf table extraction')

        print(dataset)

        params = {
            'fileId': fileId,
            'pageNumber': pageNumber
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
            title='pdf table extraction: %s' % datasetName,
            user=currentUser,
            type='bsve.pdfextraction',
            public=False,
            kwargs=kwargs,
            module='girder.plugins.minerva.jobs.pdf_table_extraction',
            async=True)  # TODO change
        addJobOutput(job, dataset)
        self.model('job', 'jobs').scheduleJob(job)
        return job

    pdfTableExtractionAnalysis.description = (
        Description('Create a job to extract a table from a pdf item source.')
        .param('sourceId', 'ID of the Item Source with the PDF file.')
        .param('pageNumber', 'The page number to extract from the PDF file.'))
