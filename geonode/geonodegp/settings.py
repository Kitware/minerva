# -*- coding: utf-8 -*-
#########################################################################
#
# Copyright (C) 2012 OpenPlans
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see <http://www.gnu.org/licenses/>.
#
#########################################################################

# Django settings for the GeoNode project.
import os
from geonode.settings import *
from celery.schedules import crontab

#
# General Django development settings
#

SITENAME = 'geonodegp'

# Defines the directory that contains the settings file as the LOCAL_ROOT
# It is used for relative settings elsewhere.
LOCAL_ROOT = os.path.abspath(os.path.dirname(__file__))

WSGI_APPLICATION = "geonodegp.wsgi.application"




# Additional directories which hold static files
STATICFILES_DIRS.append(
    os.path.join(LOCAL_ROOT, "static"),
)

# Note that Django automatically includes the "templates" dir in all the
# INSTALLED_APPS, se there is no need to add maps/templates or admin/templates
TEMPLATE_DIRS = (
    os.path.join(LOCAL_ROOT, "templates"),
) + TEMPLATE_DIRS

# Location of url mappings
ROOT_URLCONF = 'geonodegp.urls'

# Location of locale files
LOCALE_PATHS = (
    os.path.join(LOCAL_ROOT, 'locale'),
    ) + LOCALE_PATHS

INSTALLED_APPS = ('geonodegp',
                  'geonodegp.data_queues',
                  'geonodegp.data_queues.forecastio',
                  'geonodegp.data_queues.gfms') + INSTALLED_APPS

TIME_ZONE = 'America/New_York'

# CELERY SETTINGS
BROKER_URL = 'redis://localhost:6379/0'
BROKER_TRANSPORT = 'redis'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_RESULT_BACKEND = 'redis://'
CELERY_ALWAYS_EAGER = False
CELERY_SEND_TASK_ERROR_EMAILS = True
CELERYD_POOL_RESTARTS = True
CELERY_ENABLE_REMOTE_CONTROL = True

# Email address for logging in to GPM FTP server
GPM_ACCOUNT = 'Enter your GPM email address'
#Location of GeoServer data directory
GS_DATA_DIR = '/usr/share/geoserver/data'
#Directory where temporary data_queues geoprocessing files should be downloaded
GS_TMP_DIR = GS_DATA_DIR + '/tmp'
#Time to wait before updating Geoserver mosaic (keep at 0 unless Geoserver is on a different server.
#In that case, there will need to be an automated rsync between GS_TMP_DIR where celery is running and
#GS_DATA_DIR where GeoServer is running.
RSYNC_WAIT_TIME = 0

#MongoDB data connection for data_queues processors
MONGODB = {
        'HOST': 'localhost',
        'PORT': 27017,
        'NAME': 'geonodemongo'
}

HEALTHMAP_AUTH = 'Enter_your_API_key'

#Add more scheduled geoprocessors here (ideally in local_settings.py file)
CELERYBEAT_SCHEDULE = {
    'gfms': {
        'task': 'geonodegp.data_queues.gfms.tasks.gfms_task',
        'schedule': crontab(minute='*/3'),
        'args': ()
    },
    'forecast_io': {
        'task': 'geonodegp.data_queues.forecastio.tasks.forecast_io_task',
        'schedule': crontab(minute='*/2'),
        'args': ()
    },
}

# Load more settings from a file called local_settings.py if it exists
try:
    from local_settings import *
except ImportError:
    pass

# define the urls after the settings are overridden
if 'geonode.geoserver' in INSTALLED_APPS:
    MAP_BASELAYERS[0] = {
        "source_only": True,
        "source": {
            "ptype": "gxp_wmscsource",
            "url": OGC_SERVER['default']['PUBLIC_LOCATION'] + "wms",
            "restUrl": "/gs/rest"
        }
    }
