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
from girder.api.describe import Description, autoDescribeRoute
from girder.api.rest import Resource
from girder.plugins.minerva.utility.minerva_utility import addJobOutput
from girder.plugins.minerva.rest.dataset import Dataset
from girder.utility import config
from gaia_tasks.tasks import gaia_task


class GaiaAnalysis(Resource):
    def __init__(self):
        super(GaiaAnalysis, self).__init__()
        self.resourceName = 'gaia_analysis'
        self.config = config.getConfig()
        self.route('POST', (), self.gaiaAnalysisTask)

    @access.user
    @autoDescribeRoute(
        Description('Run a Gaia analysis.')
        .jsonParam('analysis',
                   'JSON describing the output dataset name and Gaia process',
                   paramType='body')
    )
    def gaiaAnalysisTask(self, analysis, params):
        print analysis

        currentUser = self.getCurrentUser()

        gaia_json = json.dumps(analysis['process'])
        datasetName = analysis['datasetName']

        minerva_metadata = {
            'dataset_type': 'geojson',
            'source_type': 'gaia_process',
            'original_type': 'json',
            'process_json': gaia_json,
            'source': {
                'layer_source': 'GeoJSON'
            }
        }

        datasetResource = Dataset()
        dataset = datasetResource.constructDataset(
            datasetName,
            minerva_metadata,
            'created by Gaia'
        )

        # TODO change token to job token
        user, token = self.getCurrentUser(returnToken=True)
        kwargs = {
            'params': params,
            'user': currentUser,
            'dataset': dataset,
            'analysis': gaia_json,
            'token': token
        }
        result = gaia_task.delay(kwargs, girder_job_title=datasetName)
        job = result.job

        addJobOutput(job, dataset)

        # r = result.get()
        return job
