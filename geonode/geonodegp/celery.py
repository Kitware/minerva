from __future__ import absolute_import

import os

from celery import Celery

# set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'geonodegp.settings')

from django.conf import settings

from celery.schedules import crontab
settings.CELERYBEAT_SCHEDULE = {
    'gfms': {
        'task': 'geonodegp.data_queues.tasks.gfms_task',
        #'schedule': crontab(hour='*/3', minute=30),
        'schedule': crontab(minute='*/2'),
        'args': ()
    },
    'forecast_io': {
        'task': 'geonodegp.data_queues.tasks.forecast_io_task',
        'schedule': crontab(minute=2),
        'args': ()
    },
}

app = Celery('geonodegp')

# Using a string here means the worker will not have to
# pickle the object when using Windows.
app.config_from_object('django.conf:settings')
app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)


@app.task(bind=True)
def debug_task(self):
    print('Request: {0!r}'.format(self.request))

