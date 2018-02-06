import json
import re
from girder_worker.app import app
from girder_worker.utils import girder_job
from gaia.parser import deserialize


@girder_job()
@app.task(bind=True)
def gaia_task(self, kwargs):
    datasetId = str(kwargs['dataset']['_id'])
    token = kwargs['token']
    analysis = json.loads(kwargs['analysis'])

    for input in analysis['inputs']:
        input['token'] = token['_id']

    filename = re.sub('\s|\.', '_', kwargs['dataset']['name'])
    filename = '{}.json'.format(
        ''.join([c for c in filename if re.match(r'\w', c)]))

    if 'output' not in analysis:
        analysis['output'] = {
            'filename': filename,
            '_type':
                'gaia_tasks.inputs.MinervaVectorIO',
            'item_id': datasetId,
            'token': token['_id']
        }
    else:
        analysis['output']['item_id'] = datasetId
        analysis['output']['token'] = token['_id']

    process = json.loads(json.dumps(analysis), object_hook=deserialize)
    process.compute()
