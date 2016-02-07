import json
import os
import shutil
import sys
import tempfile
import traceback
import copy
import math
import time

import requests
import numpy as np
from scipy import stats

from girder.constants import AccessType
from girder.utility import config
from girder.utility.model_importer import ModelImporter
from girder.plugins.jobs.constants import JobStatus
from girder.plugins.minerva.utility.bsve.bsve_utility import BsveUtility
from girder.plugins.minerva.utility.minerva_utility import mM

import girder_client

def run(job):
    job_model = ModelImporter.model('job', 'jobs')
    job_model.updateJob(job, status=JobStatus.RUNNING)

    try:
        kwargs = job['kwargs']
        # will be confusing between input and output
        #outputDatasetId = str(kwargs['dataset']['_id'])

        # TODO better to create a job token rather than a user token?
        token = kwargs['token']

        inputDatasetId = kwargs['params']['datasetId']
        outputDataset = kwargs['dataset']

        # TODO something better

        # connect to girder and upload the file
        # TODO will probably have to change this from local to romanesco
        # so that can work on worker machine
        # at least need host connection info
        girderPort = config.getConfig()['server.socket_port']
        client = girder_client.GirderClient(port=girderPort)
        client.token = token['_id']

        tmpdir = tempfile.mkdtemp()

        # Write the geojson out to local path.
        client.downloadItem(inputDatasetId, tmpdir)

        user_model = ModelImporter.model('user')
        user = user_model.load(job['userId'], force=True)
        item_model = ModelImporter.model('item')
        inputDataset = item_model.load(inputDatasetId, level=AccessType.READ, user=user)

        inputGeojsonPath = os.path.join(tmpdir, inputDataset['name'])

        # Load the geojson input file.
        with open(inputGeojsonPath, 'r') as data_file:
            data = json.load(data_file)

        # Read the geojson points.
        coords = []
        for i, feature in enumerate(data['features']):
            coord = feature['geometry']['coordinates']
            coords.append(coord)

        coords = np.array(coords).T
        xs = coords[0,:]
        ys = coords[1,:]

        xmin = math.floor(xs.min())
        xmax = math.ceil(xs.max())
        ymin = math.floor(ys.min())
        ymax = math.ceil(ys.max())

        # Expand the region by 5, the magic number, in all directions.
        xmin = xmin - 5
        xmax = xmax + 5
        ymin = ymin - 5
        ymax = ymax + 5

        # Compute a 2D KDE.
        X, Y = np.mgrid[xmin:xmax, ymin:ymax]
        positions = np.vstack([X.ravel(), Y.ravel()])
        values = np.vstack([xs, ys])
        kernel = stats.gaussian_kde(values)
        f = np.reshape(kernel(positions).T, X.shape)

        # Compute the positions and z value of the output grid.
        positions = []
        for j in range(f.shape[1]):
            for i in range(f.shape[0]):
                xpos = i + xmin
                ypos = ymin + j
                zval = f[i][j]
                if zval < 0.0001:
                    zval = -9999
                positions.append({
                    'x': xpos,
                    'y': ypos,
                    'z': zval
                })

        # Create the contour_data object.
        contour_data = {
            'gridWidth': f.shape[0],
            'gridHeight': f.shape[1],
            'x0': xmin,
            'y0': ymin,
            'dx': 1,
            'dy': -1,
            'position': positions
        }

        # Write the contour_data to an output file.
        tmpOutDir = tempfile.mkdtemp()
        output_path = os.path.join(tmpOutDir, 'kde.json')
        with open(output_path, 'w') as kde_outfile:
            json.dump(contour_data, kde_outfile)

        # TODO clearly wrong
        outputDatasetId = str(outputDataset['_id'])
        client.uploadFileToItem(outputDatasetId, output_path)

        dataset = item_model.load(outputDatasetId, level=AccessType.WRITE, user=user)
        minerva_metadata = mM(dataset)

        file_model = ModelImporter.model('file')
        existing = file_model.findOne({
            'itemId': outputDataset['_id'],
            'name': 'kde.json'
        })

        if not existing:
            raise (Exception('Cannot find file in dataset %s' %
                   (outputDatasetId)))

        # TODO probably shouldn't be setting this here
        minerva_metadata['dataset_type'] = 'json'
        minerva_metadata['original_type'] = 'json'
        minerva_metadata['original_files'] = [{
            'name': existing['name'], '_id': existing['_id']}]

        mM(outputDataset, minerva_metadata)
        # Sleep to allow the job status to update in the correct order on the client.
        time.sleep(2)
        job_model.updateJob(job, status=JobStatus.SUCCESS)
    except Exception:
        t, val, tb = sys.exc_info()
        log = '%s: %s\n%s' % (t.__name__, repr(val), traceback.extract_tb(tb))
        # TODO only works locally
        job_model.updateJob(job, status=JobStatus.ERROR, log=log)
        raise
