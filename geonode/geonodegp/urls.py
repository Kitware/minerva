from django.conf.urls import patterns, url

from geonode.urls import *
from geonodegp.views import *

urlpatterns = patterns('',

    # Static pages
    #url(r'^$', 'geonode.views.index', {'template': 'site_index.html'}, name='home'),
    #url(r'^/robots.txt$', TemplateView.as_view(template_name='robots.txt'), name='robots'),
    url(r'^external', 'geonodegp.views.api_proxy'),
 ) + urlpatterns

