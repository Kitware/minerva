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

from girder.plugins.minerva.utility.minerva_utility import (decryptCredentials,
                                                            findAnalysisFolder,
                                                            findAnalysisByName,
                                                            findDatasetFolder)

from girder.plugins.minerva.utility.terra_utility import (getTerraConfig,
                                                          pgCursorFromPgSourceId)

from elasticsearch import Elasticsearch
from elasticsearch_dsl import Search


class Analysis(Resource):
    def __init__(self):
        self.resourceName = 'minerva_analysis'
        self.route('GET', ('folder',), self.getAnalysisFolder)
        self.route('GET', ('terra_msa_from_bbox',), self.getMsaFromBBox)
        self.route('GET', ('msa_bounding_box',), self.getMsaBBox)
        self.route('GET', ('get_ad_details',), self.getAdDetails)
        self.route('POST', ('folder',), self.createAnalysisFolder)
        self.route('POST', ('bsve_search',), self.bsveSearchAnalysis)
        self.route('POST', ('elastic_geospace',), self.elasticGeospaceAnalysis)

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

    @access.user
    def getMsaBBox(self, params):
        centroid = self.boolParam('centroid', params, default=False)
        regionQuery = 'ST_Extent(region)'

        if centroid:
            regionQuery = 'ST_Centroid(%s)' % regionQuery

        cursor, _ = pgCursorFromPgSourceId(getTerraConfig()['postgis_source_id'])
        cursor.execute(
            "select ST_AsGeoJSON(%s) from msas where name = %%s limit 1" % regionQuery,
            (params['msaName'],))
        geom = cursor.fetchone()

        if not geom or not geom[0]:
            raise RestException('MSA not found.')

        return json.loads(geom[0])
    getMsaBBox.description = (
        Description('Return the bounding box of an MSAs region.')
        .param('msaName', 'Name of the MSA')
        .param('centroid',
               'Return the centroid of the bounding box instead',
               required=False,
               dataType='boolean'))

    @access.user
    def getAdDetails(self, params):
        from collections import defaultdict
        ad_images = defaultdict(list)
        params['adIds'] = json.loads(params['adIds'])
        for adId in params['adIds']:
            int(adId)

        cursor, _ = pgCursorFromPgSourceId(getTerraConfig()['postgis_source_id'])
        # TODO is mogrify needed?
        cursor.execute(
            cursor.mogrify("select ad_id, url from ad_images where ad_id in %s",
                           tuple(params['adIds'])))

        for (ad_id, image_url) in cursor.fetchall():
            ad_images[ad_id].append(image_url)

        es, esSource = esCursorFromEsSourceId(getTerraConfig()['elastic_source_id'])
        ads = Search() \
            .using(client=es) \
            .index(esSource['elasticsearch_params']['index']) \
            .filter('terms', id=params['adIds']) \
            .execute() \
            .to_dict()

        for ad in ads['hits']['hits']:
            ad['_pg'] = {
                'images': ad_images[int(ad['_id'])]
            }

        return ads
    getAdDetails.description = (
        Description('Retrieve all known details about a set of ad ids, ES + PG')
        .param('adIds', 'JSON list of ad ids (integers)'))

    @access.user
    def getMsaFromBBox(self, params):
        cursor, _ = pgCursorFromPgSourceId(getTerraConfig()['postgis_source_id'])
        cursor.execute(("select msas.name, "
                        "ST_Area(ST_Intersection(msas.region, "
                        "(SELECT ST_SetSRID(ST_MakeEnvelope(%s, %s, %s, %s), 4326)))) as area "
                        "from msas order by area desc limit 1"),
                       (params['xMin'],
                        params['yMin'],
                        params['xMax'],
                        params['yMax']))

        return cursor.fetchone()
    getMsaFromBBox.description = (
        Description('Get the MSA which has the most area within a bounding box (such as the viewport)')
        .param('xMin', 'xMin')
        .param('yMin', 'yMin')
        .param('xMax', 'xMax')
        .param('yMax', 'yMax'))

    @access.user
    def elasticGeospaceAnalysis(self, params):
        currentUser = self.getCurrentUser()
        datasetName = params['datasetName']
        elasticSearchParams = params['elasticSearchParams']
        analysis = findAnalysisByName(currentUser, 'elastic geospace')

        try:
            elasticSearchParams = json.loads(params['elasticSearchParams'])
        except ValueError:
            raise RestException('elasticSearchParams is invalid JSON.')

        datasetFolder = findDatasetFolder(currentUser, currentUser)
        dataset = self.model('item').createItem(datasetName, currentUser,
                                                datasetFolder,
                                                'created by elastic geospace')

        params['elasticSearchParams'] = elasticSearchParams

        user, token = self.getCurrentUser(returnToken=True)
        kwargs = {
            'params': params,
            'user': currentUser,
            'dataset': dataset,
            'analysis': analysis,
            'token': token
        }

        job = self.model('job', 'jobs').createLocalJob(
            title='elastic geospace: %s' % datasetName,
            user=currentUser,
            type='elastic_geospace.search',
            public=False,
            kwargs=kwargs,
            module='girder.plugins.minerva.jobs.elastic_geospace_worker',
            async=True)

        if 'meta' in dataset:
            metadata = dataset['meta']
        else:
            metadata = {}

        minerva_metadata = {
            'dataset_id': dataset['_id'],
            'source': 'elastic_geospace',
            'elastic_search_params': elasticSearchParams,
            'original_type': 'elasticsearch'
        }
        metadata['minerva'] = minerva_metadata
        self.model('item').setMetadata(dataset, metadata)

        self.model('job', 'jobs').scheduleJob(job)

        return minerva_metadata

    elasticGeospaceAnalysis.description = (
        Description('Create the minerva analysis folder, a global resource.')
        .param('datasetName', 'Name of the dataset created by this analysis.')
        .param('elasticSearchParams',
               'JSON search parameters to send to elastic_geospace.'))
