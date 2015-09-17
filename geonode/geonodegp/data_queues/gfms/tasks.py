from __future__ import absolute_import

from celery import shared_task
from .gfms import GFMSProcessor

@shared_task()
def gfms_task():
    processor = GFMSProcessor()
    processor.run()
