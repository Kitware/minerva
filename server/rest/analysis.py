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
from girder.constants import AccessType
from girder.api import access
from girder.api.describe import Description, describeRoute
from girder.api.rest import Resource, RestException, loadmodel, getBodyJson

from girder.plugins.minerva.utility.minerva_utility import (findAnalysisFolder,
                                                            findAnalysisByName,
                                                            addJobOutput)
from girder.plugins.minerva.rest.dataset import Dataset

from minerva.analyses import get_analysis_obj


class Analysis(Resource):
    def __init__(self):
        self.resourceName = 'minerva_analysis'

        self.route('GET', (), self.listAnalyses)
        self.route('GET', ('id', ':id',), self.getAnalysisById)
        self.route('GET', (':name',), self.getAnalysisByName)
        self.route('POST', (':name',), self.runAnalysis)
        self.route('GET', (':name', 'meta',), self.getAnalysisMeta)
        self.route('POST', (), self.createAnalysis)
        self.route('DELETE', (':id',), self.deleteAnalysis)
        self.route('GET', ('folder',), self.getAnalysisFolder)
        self.route('POST', ('folder',), self.createAnalysisFolder)
        self.route('POST', ('bsve_search',), self.bsveSearchAnalysis)
        self.route('POST', ('mmwr_import',), self.bsveMMWRAnalysis)

    @access.user
    @describeRoute(
        Description('Get a list of analyses')
        .param('name', 'Filter by name of analysis', required=False, )
        .errorResponse('name was invalid.')
        .errorResponse('Read access was denied for the analysis.', 403)
    )
    def listAnalyses(self, params):
        user = self.getCurrentUser()

        filters = {}
        if params.get('name'):
            filters['name'] = params['name']

        return self.model('analysis', 'minerva').list(user=user,
                                                      filters=filters)

    @access.user
    @loadmodel(model='analysis', plugin='minerva', level=AccessType.READ)
    @describeRoute(
        Description('Get an analysis by ID')
        .param('id', 'The ID of the analysis.', paramType='path',)
        .errorResponse('ID was invalid.')
        .errorResponse('Read access was denied for the analysis.', 403)
    )
    def getAnalysisById(self, analysis, params):
        return analysis

    @access.user
    @describeRoute(
        Description('Get an analysis by Name')
        .param('name', 'The name of the analysis.', paramType='path',)
        .errorResponse('name was invalid.')
        .errorResponse('Read access was denied for the analysis.', 403)
    )
    def getAnalysisByName(self, name, params):
        return self.model('analysis', 'minerva').get_by_name(name)

    @access.user
    @describeRoute(
        Description('Get an analysis\'s metadata')
        .param('name', 'The name of the analysis.', paramType='path',)
        .errorResponse('name was invalid.')
        .errorResponse('Read access was denied for the analysis.', 403)
    )
    def getAnalysisMeta(self, name, params):
        analysis = get_analysis_obj(
            self.model('analysis', 'minerva').get_by_name(name))

        return analysis.inputs

    @access.user
    @describeRoute(
        Description('Run an analysis')
        .param('name', 'The name of the analysis.', paramType='path',)
        .param('args', 'The name of the analysis.', paramType='body',)
        .errorResponse('name was invalid.')
        .errorResponse('Read access was denied for the analysis.', 403)
    )
    def runAnalysis(self, name, params):
        analysis = get_analysis_obj(
            self.model('analysis', 'minerva').get_by_name(name))

        body = getBodyJson()

        self.requireParams([a['name'] for a in analysis.inputs
                            if not a['optional']], body)

        # TODO:  add opts introspection to analysis class
        # pop off opts before parsing out args/kwargs
        opts = None

        arguments = {
            'args': [],
            'kwargs': [],
            'vararg': None,
            'kwarg': None}

        for arg in analysis.inputs:
            self._validate_arg(arg, body)

            if arg['vararg']:
                arguments['vararg'] = arg
                continue
            if arg['kwarg']:
                arguments['kwarg'] = arg
                continue

            if not arg['optional']:
                arguments['args'].append(arg)
            else:
                arguments['kwargs'].append(arg)

        args = [body[a['name']] for a in arguments['args']]

        kwargs = {a['name']: body[a['name']]
                  for a in arguments['kwargs'] if a['name'] in body}

        if arguments['vararg'] is not None:
            try:
                args.extend(body.get(arguments['vararg']['name'], []))
            except TypeError:
                Exception("'%s' argument must be of type list"
                          % arguments['vararg']['name'])

        if arguments['kwarg'] is not None:
            try:
                kwargs.update(body.get(arguments['kwarg']['name'], {}))
            except TypeError:
                Exception("'%s' argument must be of type dict"
                          % arguments['vararg']['name'])

        return analysis.run_analysis(args, kwargs, opts=opts)

    def _validate_arg(self, arg, body):
        assert 'name' in arg, "Argument must have a name key!"
        return True

    @access.user
    @describeRoute(
        Description('Create an analysis')
        .param('path', 'Path to the file containing the run function', )
        .param('name', 'name of analysis (default: name of file)',
               required=False)
        .param('type', 'type of analysis (default=python)', required=False)
    )
    def createAnalysis(self, params):
        self.requireParams('path', params)

        user = self.getCurrentUser()
        path = params['path'].strip()
        name = params.get('name', None)

        analysis_type = params.get('type', 'python')

        return self.model('analysis', 'minerva').create(
            path,
            analysis_type,
            name=name,
            user=user)

    @access.user
    @loadmodel(model='analysis', plugin='minerva', level=AccessType.WRITE)
    @describeRoute(
        Description('Delete an analysis')
        .param('id', 'The ID of the analysis.', paramType='path',)
        .errorResponse('Write access was denied for the analysis.', 403)
    )
    def deleteAnalysis(self, analysis, params):
        self.model('analysis', 'minerva').remove(analysis)

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
