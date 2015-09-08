from __future__ import absolute_import

from celery import shared_task
from .processors import *


@shared_task()
def gfms_task():
    gfms = GFMSProcessor()
    gfms.run()

@shared_task
def forecast_io_task():
    fio = ForecastIOAirTempProcessor()
    fio.run()
