import json
import os
import shutil
import sys
import tempfile
import traceback
import copy
import re
import math

import requests

from girder.constants import AccessType
from girder.utility import config
from girder.utility.model_importer import ModelImporter
from girder.plugins.jobs.constants import JobStatus
from girder.plugins.minerva.utility.bsve.bsve_utility import BsveUtility
from girder.plugins.minerva.utility.minerva_utility import mM

import girder_client

# This job will accumulate and append metadata into
# the us states geojson properties.


#: geojson of state boundaries source url
states_source = (
    'https://gist.githubusercontent.com/jbeezley/82150e34cee8512815cf/'
    'raw/32549660c18149698a849b00cac6df8ddd2d1f1a/us-states.json'
)

#: cached geojson object
_states = None

# formatted like this:
"""
{
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {
                "name": "New York",
                "abbr": "NY"
            },
            "geometry": {
                "type": "MultiPolygon",
                "coordinates": [
                    [ # polygon 1
                        [ # outer ring
                           [], [], ...
                        ],
                        [ # inner ring 1
                            [], [], ...
                        ],
                        ...
                    ],
                    ...
                ]
            }
        },
        ...
    ]
"""


def accumulate(data):
    """Accumulate data by state returning a geojson object.

    The argument is expected to be structured as follows:
        [
            {
                "reporting_area": "New York City, NY", # city, state pair
                "key1": "value1",
                "key2": "value2",
                ...
            }
        ]

    The state is parsed from the `reporting_area` key.  If any error occurs,
    the record is skipped.  For the remaining keys, the
    value is coerced as a number and accumulated into the states' properties.
    Any error in the conversion causes the key to be skipped.  An additional
    key is added to each state, `num_records` indicating the number of records
    existed for that state.

    Finally, any state for which no record was encountered is filtered out of
    the returned value.
    """
    global _states
    if _states is None:
        _states = requests.get(states_source).json()
    geojson = copy.deepcopy(_states)

    # create a abbr -> properties mapping
    states = {
        feature.get('properties', {}).get('abbr'):
            feature.get('properties', {})
        for feature in geojson.get('features', [])
    }

    # city, state regex
    citystate = re.compile(r', ([A-Z][A-Z])$')

    # loop over records
    for record in data:
        m = citystate(record.pop('reporting_area', ''))
        if m and m.groups(1) in states:  # it is a valid state

            props = states[m.groups(1)]
            props['num_records'] = props.get('num_records', 0) + 1

            for key, value in record.iteritems():
                try:
                    v = float(value)
                except Exception:
                    v = float('NaN')

                # check that it's a real value
                if not (math.isnan(v) or math.isinf(v)):
                    pass

                if v < 0:  # maybe this is a valid case?
                    print('Encountered a negative value!')

                # accumulate the field as a property
                props[key] = props.get(key, 0) + v

    # filter out states that have no records
    geojson['properties'] = filter(
        lambda f: states.get(
            f.get('properties', {}).get('abbr')
        ).get('num_records', 0) >= 0,
        geojson.get('properties', [])
    )
    return geojson


def run(job):
    job_model = ModelImporter.model('job', 'jobs')
    job_model.updateJob(job, status=JobStatus.RUNNING)

    try:

        configFile = os.path.join(os.path.dirname(__file__), "bsve.json")
        if os.path.exists(configFile):
            bsveConfig = json.load(open(configFile))['bsve']
        else:
            bsveConfig = {}

        kwargs = job['kwargs']
        datasetId = str(kwargs['dataset']['_id'])

        # TODO better to create a job token rather than a user token?
        token = kwargs['token']

        bsveUtility = BsveUtility(
            user=bsveConfig.get(
                'USER_NAME', os.environ.get('BSVE_USERNAME')),
            apikey=bsveConfig.get(
                'API_KEY', os.environ.get('BSVE_APIKEY')),
            secret=bsveConfig.get(
                'SECRET_KEY', os.environ.get('BSVE_SECRETKEY')),
            base=bsveConfig.get('BASE_URL')
        )
        data = accumulate(bsveUtility.soda_dump(**kwargs))

        # write the output to a json file
        tmpdir = tempfile.mkdtemp()
        outFilepath = tempfile.mkstemp(suffix='.json', dir=tmpdir)[1]
        writer = open(outFilepath, 'w')
        writer.write(json.dumps(data))
        writer.close()

        # rename the file so it will have the right name when uploaded
        # could probably be done post upload
        outFilename = 'soda.geojson'
        humanFilepath = os.path.join(tmpdir, outFilename)
        shutil.move(outFilepath, humanFilepath)

        # connect to girder and upload the file
        # TODO will probably have to change this from local to romanesco
        # so that can work on worker machine
        # at least need host connection info
        girderPort = config.getConfig()['server.socket_port']
        client = girder_client.GirderClient(port=girderPort)
        client.token = token['_id']

        client.uploadFileToItem(datasetId, humanFilepath)

        # TODO some stuff here using models will only work on a local job
        # will have to be rewritten using girder client to work in romanesco
        # non-locally

        user_model = ModelImporter.model('user')
        user = user_model.load(job['userId'], force=True)
        item_model = ModelImporter.model('item')

        dataset = item_model.load(datasetId, level=AccessType.WRITE, user=user)
        minerva_metadata = mM(dataset)

        file_model = ModelImporter.model('file')
        existing = file_model.findOne({
            'itemId': dataset['_id'],
            'name': outFilename
        })
        if not existing:
            raise (Exception('Cannot find file %s in dataset %s' %
                   (outFilename, datasetId)))

        shutil.rmtree(tmpdir)
        minerva_metadata['dataset_type'] = 'geojson'

        existing = file_model.findOne({
            'itemId': dataset['_id'],
            'name': outFilename
        })
        if existing:
            minerva_metadata['geojson_file'] = {
                '_id': existing['_id'],
                'name': outFilename
            }
        else:
            raise (Exception('Cannot find file %s in dataset %s' %
                   (outFilename, datasetId)))

        mM(dataset, minerva_metadata)
        job_model.updateJob(job, status=JobStatus.SUCCESS)
    except Exception:
        t, val, tb = sys.exc_info()
        log = '%s: %s\n%s' % (t.__name__, repr(val), traceback.extract_tb(tb))
        # TODO only works locally
        job_model.updateJob(job, status=JobStatus.ERROR, log=log)
        raise
