import sys
import traceback

from girder.utility.model_importer import ModelImporter
from girder.plugins.jobs.constants import JobStatus


def run(job):
    job_model = ModelImporter.model('job', 'jobs')
    job_model.updateJob(job, status=JobStatus.RUNNING)
    assetstore_model = ModelImporter.model('assetstore')

    try:
        assetstore_model.importData(**job['kwargs'])
        job_model.updateJob(job, status=JobStatus.SUCCESS)
    except Exception:
        t, val, tb = sys.exc_info()
        log = '%s: %s\n%s' % (t.__name__, repr(val), traceback.extract_tb(tb))
        job_model.updateJob(job, status=JobStatus.ERROR, log=log)
        raise
