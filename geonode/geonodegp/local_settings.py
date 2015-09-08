# -*- coding: utf-8 -*-
from geonodegp.settings import INSTALLED_APPS

CELERY_ALWAYS_EAGER = False
INSTALLED_APPS = INSTALLED_APPS + ('celery', 'flower', )

