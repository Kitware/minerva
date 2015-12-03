import json
import os
import shutil
import sys
import tempfile
import traceback

from girder.utility import config
from girder.utility.model_importer import ModelImporter
from girder.plugins.jobs.constants import JobStatus

import girder_client


def run(job):
    job_model = ModelImporter.model('job', 'jobs')
    job_model.updateJob(job, status=JobStatus.RUNNING)

    try:
        kwargs = job['kwargs']
        fileId = kwargs['params']['fileId']
        pageNumber = kwargs['params']['pageNumber']
        datasetId = str(kwargs['dataset']['_id'])
        # TODO better to create a job token rather than a user token?
        token = kwargs['token']

        print(fileId)
        print(pageNumber)
        print(datasetId)
        print(token)

        # write the output to a json file
        tmpdir = tempfile.mkdtemp()

        # connect to girder and upload the file
        # TODO will probably have to change this from local to romanesco
        # so that can work on worker machine
        # at least need host connection info
        girderPort = config.getConfig()['server.socket_port']
        client = girder_client.GirderClient(port=girderPort)
        client.token = token['_id']
        pdfPath = os.path.join(tmpdir, 'extract.pdf')
        extractPath = os.path.join(tmpdir, 'extract.txt')
        client.downloadFile(fileId, pdfPath)
        print(pdfPath)

        # HACK the shame of it
        binPath = '/home/vagrant/poppler-0.38.0/utils/pdftotext'
        cmd = [binPath, '-layout', '-f', pageNumber, '-l', pageNumber, pdfPath, extractPath]
        print(cmd)
        import subprocess
        subprocess.call(cmd)

        client.uploadFileToItem(datasetId, extractPath)
        shutil.rmtree(tmpdir)
        job_model.updateJob(job, status=JobStatus.SUCCESS)

    except Exception:
        t, val, tb = sys.exc_info()
        log = '%s: %s\n%s' % (t.__name__, repr(val), traceback.extract_tb(tb))
        # TODO only works locally
        job_model.updateJob(job, status=JobStatus.ERROR, log=log)
        raise
