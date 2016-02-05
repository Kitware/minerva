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
from celery.schedules import crontab

# Append these to INSTALLED_APPS
DATAQS_APPS = (
    'dataqs',
    'dataqs.forecastio',
    'dataqs.gfms'
)

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
GPM_ACCOUNT = '{{gpm_email}}'

# Location of GeoServer data directory
GS_DATA_DIR = '/var/lib/tomcat7/webapps/geoserver/data'

# Directory where temporary data_queues geoprocessing files should
# be downloaded
GS_TMP_DIR = '/tmp'

# Time to wait before updating Geoserver mosaic (keep at 0 unless Geoserver
# is on a different server.
# In that case, there will need to be an automated rsync between GS_TMP_DIR
# where celery is running and
# GS_DATA_DIR where GeoServer is running.
RSYNC_WAIT_TIME = 0

HEALTHMAP_AUTH = '{{healthmap_apikey}}'

# Add more scheduled geoprocessors here (ideally in local_settings.py file)
CELERYBEAT_SCHEDULE = {
    'gfms': {
        'task': 'dataqs.gfms.tasks.gfms_task',
        'schedule': crontab(minute='3'),
        'args': ()
    },
    'forecast_io': {
        'task': 'dataqs.forecastio.tasks.forecast_io_task',
        'schedule': crontab(minute='1'),
        'args': ()
    },
}


def dataqs_extend():
    from settings import INSTALLED_APPS
    INSTALLED_APPS += DATAQS_APPS

# define the urls after the settings are overridden
# if 'geonode.geoserver' in INSTALLED_APPS:
#     MAP_BASELAYERS[0] = {
#         "source_only": True,
#         "source": {
#             "ptype": "gxp_wmscsource",
#             "url": OGC_SERVER['default']['PUBLIC_LOCATION'] + "wms",
#             "restUrl": "/gs/rest"
#         }
#     }
