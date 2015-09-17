from __future__ import absolute_import

from celery import shared_task
from .forecastio_air import ForecastIOAirTempProcessor


@shared_task
def forecast_io_task():
    processor = ForecastIOAirTempProcessor()
    processor.run()


