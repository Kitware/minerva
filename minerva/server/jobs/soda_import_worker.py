import json
import os
import shutil
import sys
import tempfile
import traceback
import copy
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
    'https://gist.githubusercontent.com/jbeezley/ec21c4a016a84c5def74/'
    'raw/0eb947eccbba98c01caad6ac7fbc7f8fe8334231/us-states.geojson'
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


#: A set of properties to ignore when accumulating
ignored_properties = set([
    'mmwr_week',
    'mmwr_year'
])


def accumulate(data):
    """Accumulate data by state returning a geojson object.

    The argument is expected to be structured as follows:
        [
            {
                "location_1": {
                    "city": "New York City, NY", # city, state pair
                },
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

    :param list data: A list of dicts containing mappings of keys to counts
    :returns dict: A geojson object with ``properties`` containing accumulated
        values.  The top level ``FeatureCollection`` property contains a list
        of list of keys available in the individual features.
    """
    global _states
    if _states is None:
        _states = requests.get(states_source).json()
    geojson = copy.deepcopy(_states)

    # create a abbr -> properties mappin and remove unwanted properties
    states = {}
    for feature in geojson.get('features', []):
        abbr = feature['properties']['abbr'].upper()
        name = feature['properties']['name'].upper()
        feature['properties'].clear()
        feature['properties']['abbr'] = abbr
        feature['properties']['name'] = name
        states[name] = feature['properties']

    # store all properties encountered here
    all_props = set()

    # loop over records
    for record in data:
        m = (record.get('location_1', {}).get('human_address', {})
             .get('state', '').upper())
        if m in states:  # it is a valid state

            props = states[m]
            props['num_records'] = props.get('num_records', 0) + 1

            for key, value in record.iteritems():
                if key in ignored_properties:
                    continue

                try:
                    v = float(value)
                except Exception:
                    v = float('NaN')

                # check that it's a real value
                if math.isnan(v) or math.isinf(v):
                    continue

                if v < 0:  # maybe this is a valid case?
                    print('Encountered a negative value!')

                # accumulate the field as a property
                props[key] = props.get(key, 0) + v

                # add the property to the global list of properties found
                all_props.add(key)

    # store the global list of properties
    geojson['properties'] = {
        'values': list(all_props)
    }
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

        params = kwargs['params']

        bsveUtility = BsveUtility(
            user=bsveConfig.get(
                'USER_NAME', os.environ.get('BSVE_USERNAME')),
            apikey=bsveConfig.get(
                'API_KEY', os.environ.get('BSVE_APIKEY')),
            secret=bsveConfig.get(
                'SECRET_KEY', os.environ.get('BSVE_SECRETKEY')),
            base=bsveConfig.get('BASE_URL')
        )
        data = accumulate(bsveUtility.soda_dump(count=params['count']))

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
        # TODO will probably have to change this from local to girder worker
        # so that can work on worker machine
        # at least need host connection info
        girderPort = config.getConfig()['server.socket_port']
        client = girder_client.GirderClient(port=girderPort)
        client.token = token['_id']

        client.uploadFileToItem(datasetId, humanFilepath)

        # TODO some stuff here using models will only work on a local job
        # will have to be rewritten using girder client to work in girder worker
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
        minerva_metadata['values'] = data['properties']['values']

        # set a default "color-by" attribute if possible
        if data['properties']['values']:
            minerva_metadata['colorByValue'] = data['properties']['values'][0]
        minerva_metadata['colorScheme'] = 'YlOrRd'

        mM(dataset, minerva_metadata)

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
