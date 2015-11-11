import json
import os
import psycopg2
import shutil
import sys
import tempfile
import traceback

from elasticsearch import Elasticsearch
from elasticsearch_dsl import Search, Index, F

from girder.constants import AccessType
from girder.utility import config
from girder.utility.model_importer import ModelImporter
from girder.plugins.jobs.constants import JobStatus
from girder.plugins.minerva.utility.dataset_utility import \
    jsonArrayHead

from girder.plugins.minerva.utility.minerva_utility import decryptCredentials
from girder.plugins.minerva.utility.terra_utility import (esCursorFromEsSourceId,
                                                          pgCursorFromPgSourceId)

import girder_client


def run(job):
    job_model = ModelImporter.model('job', 'jobs')
    job_model.updateJob(job, status=JobStatus.RUNNING)

    try:
        kwargs = job['kwargs']
        # TODO better to create a job token rather than a user token?
        token = kwargs['token']
        datasetId = str(kwargs['dataset']['_id'])
        elasticSearchParams = kwargs['params']['elasticSearchParams']

        # connect to girder and upload the file
        # TODO will probably have to change this from local to romanesco
        # so that can work on worker machine
        # at least need host connection info
        girderPort = config.getConfig()['server.socket_port']
        client = girder_client.GirderClient(port=girderPort)
        client.token = token['_id']

        # Get datasource
        esCursor, esSource = esCursorFromEsSourceId(elasticSearchParams['sourceId'])
        pgCursor, pgSource = pgCursorFromPgSourceId(elasticSearchParams['pgSourceId'])

        # Find all ads within that MSA
        # todo - utilize the geojson querying
        # see: http://www.postgresonline.com/journal/archives/267-Creating-GeoJSON-Feature-Collections-with-JSON-and-PostGIS-functions.html
        pgCursor.execute(("select als.ad_id, ST_AsGeoJSON(location) "
                        "from ad_locations als, msas "
                        "where msas.name = '%s' "
                        "and ST_Contains(msas.region, als.location)" %
                        elasticSearchParams['msa']))
        ads = {k:v for (k, v) in pgCursor.fetchall()}

        esUrl = 'https://%s@%s' % (decryptCredentials(
            esSource['meta']['minerva']['elasticsearch_params']['credentials']),
            esSource['meta']['minerva']['elasticsearch_params']['host_name'])
        es = Elasticsearch([esUrl])

        # Grab fields from elasticsearch where ad ids must be in relevant MSA,
        # and lat/long/posttime fields must exist
        searchResult = Search() \
            .using(client=esCursor) \
            .index(esSource['meta']['minerva']['elasticsearch_params']['index']) \
            .fields(['id', 'latitude', 'longitude', 'title', 'posttime']) \
            .filter('terms', id=ads.keys()) \
            .filter(~F('missing', field='latitude')) \
            .filter(~F('missing', field='longitude')) \
            .filter(~F('missing', field='posttime'))

        # If they provided an ES query - pass the text into a match query
        if 'query' in elasticSearchParams and elasticSearchParams['query']:
            searchResult = searchResult.query('match', _all=elasticSearchParams['query'])

        searchRangeFilter = {}

        if 'startTime' in elasticSearchParams and elasticSearchParams['startTime']:
            searchRangeFilter['gte'] = elasticSearchParams['startTime']

        if 'endTime' in elasticSearchParams and elasticSearchParams['endTime']:
            searchRangeFilter['lte'] = elasticSearchParams['endTime']

        if searchRangeFilter:
            searchResult = searchResult.query('range',
                                              posttime=searchRangeFilter)

        # Create generator for streaming results
        searchResult = searchResult.scan()

        finalResult = {
            'type': 'FeatureCollection',
            'features': []
        }

        for result in searchResult:
            result = result.to_dict()

            finalResult['features'].append({
                'type': 'Feature',
                'properties': result,
                'geometry': {
                    'type': 'Point',
                    'coordinates': [
                        float(result['longitude'][0]),
                        float(result['latitude'][0])
                    ]
                }
            })

        # TODO use with tmpdir
        # write the output to a json file
        tmpdir = tempfile.mkdtemp()
        outFilepath = tempfile.mkstemp(suffix='.json', dir=tmpdir)[1]
        writer = open(outFilepath, 'w')
        writer.write(json.dumps(finalResult))
        writer.close()

        # rename the file so it will have the right name when uploaded
        # could probably be done post upload
        outFilename = 'search.json'
        humanFilepath = os.path.join(tmpdir, outFilename)
        shutil.move(outFilepath, humanFilepath)

        client.uploadFileToItem(datasetId, humanFilepath)

        # TODO some stuff here using models will only work on a local job
        # will have to be rewritten using girder client to work in romanesco
        # non-locally

        user_model = ModelImporter.model('user')
        user = user_model.load(job['userId'], force=True)
        item_model = ModelImporter.model('item')
        # TODO only works locally
        dataset = item_model.load(datasetId, level=AccessType.WRITE, user=user)
        metadata = dataset['meta']
        minerva_metadata = metadata['minerva']

        # TODO only works locally
        file_model = ModelImporter.model('file')
        existing = file_model.findOne({
            'itemId': dataset['_id'],
            'name': outFilename
        })
        if existing:
            minerva_metadata['original_files'] = [{
                '_id': existing['_id'],
                'name': outFilename
            }]
        else:
            raise (Exception('Cannot find file %s in dataset %s' %
                   (outFilename, datasetId)))

        jsonRow = jsonArrayHead(humanFilepath, limit=1)[0]
        minerva_metadata['json_row'] = jsonRow

        shutil.rmtree(tmpdir)

        metadata['minerva'] = minerva_metadata
        # TODO only works locally
        item_model.setMetadata(dataset, metadata)
        # TODO only works locally
        job_model.updateJob(job, status=JobStatus.SUCCESS)
    except Exception:
        t, val, tb = sys.exc_info()
        log = '%s: %s\n%s' % (t.__name__, repr(val), traceback.extract_tb(tb))
        # TODO only works locally
        job_model.updateJob(job, status=JobStatus.ERROR, log=log)
        raise
