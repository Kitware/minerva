#!/usr/bin/env python
# -*- coding: utf-8 -*-

###############################################################################
#  Copyright Kitware Inc.
#
#  Licensed under the Apache License, Version 2.0 ( the "License" );
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
###############################################################################

import mako
import json
import os
import requests
import cherrypy
from base64 import b64encode
from girder import constants, events
from girder.utility.model_importer import ModelImporter

from girder.plugins.minerva.rest import \
        analysis, dataset, s3_dataset, session, shapefile, geocode, source, \
        wms_dataset, wms_source, geojson_dataset, elasticsearch_source, \
        postgres_source
from girder.plugins.minerva.utility.minerva_utility import decryptCredentials


class CustomAppRoot(object):
    """
    The webroot endpoint simply serves the main index HTML file of minerva.
    """
    exposed = True

    indexHtml = None

    vars = {
        'plugins': [],
        'apiRoot': '/api/v1',
        'staticRoot': '/static',
        'title': 'Minerva'
    }

    template = r"""
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>${title}</title>
        <link rel="stylesheet"
              href="//fonts.googleapis.com/css?family=Droid+Sans:400,700">
        <link rel="stylesheet"
              href="${staticRoot}/lib/bootstrap/css/bootstrap.min.css">
        <link rel="stylesheet" type="text/css" href="////cdn.jsdelivr.net/bootstrap/3.3.2/css/bootstrap.css"/>
        <link rel="stylesheet"
              href="${staticRoot}/lib/fontello/css/fontello.css">
        <link rel="stylesheet"
              href="${staticRoot}/lib/fontello/css/animation.css">
        <link rel="stylesheet"
              href="${staticRoot}/built/plugins/minerva/jquery.gridster.min.css">
        <link rel="stylesheet"
              href="${staticRoot}/built/plugins/minerva/c3.min.css">
        <link rel="stylesheet"
              href="${staticRoot}/built/app.min.css">
        % for plugin in pluginCss:
            <link rel="stylesheet"
            href="${staticRoot}/built/plugins/${plugin}/plugin.min.css">
        % endfor
        <link rel="stylesheet"
              href="http:////cdn.datatables.net/1.10.7/css/jquery.dataTables.css">
        <link rel="stylesheet"
              href="http:////cdn.jsdelivr.net/bootstrap.daterangepicker/1/daterangepicker-bs3.css">
        <link rel="stylesheet"
              href="${staticRoot}/built/plugins/minerva/minerva.min.css">
        <link rel="icon"
              type="image/png"
              href="${staticRoot}/img/Girder_Favicon.png">
      </head>
      <body>
        <div id="g-global-info-apiroot" class="hide">${apiRoot}</div>
        <div id="g-global-info-staticroot" class="hide">${staticRoot}</div>
        <script src="${staticRoot}/built/plugins/minerva/geo.ext.min.js">
        </script>
        <script src="${staticRoot}/built/libs.min.js"></script>
        <script src="${staticRoot}/built/plugins/minerva/jquery.gridster.js">
        </script>
        <script src="${staticRoot}/built/plugins/minerva/geo.min.js">
        </script>
        <script src="${staticRoot}/built/app.min.js"></script>
        </script>
        % for plugin in pluginJs:
            <script src="${staticRoot}/built/plugins/${plugin}/plugin.min.js">
            </script>
        % endfor
        <script src="http://cdn.datatables.net/1.10.7/js/jquery.dataTables.min.js">
        </script>
<script src="http://cdn.jsdelivr.net/momentjs/2.9.0/moment.min.js">
    </script>
<script
src="http://cdn.jsdelivr.net/bootstrap.daterangepicker/1/daterangepicker.js">
        </script>
        <script src="${staticRoot}/built/plugins/minerva/papaparse.min.js">
        </script>
        <script src="${staticRoot}/built/plugins/minerva/jsonpath.min.js">
        </script>
        <script src="${staticRoot}/built/plugins/minerva/c3.min.js">
        </script>
        <script src="${staticRoot}/built/plugins/minerva/minerva.min.js">
        </script>
        <script src="${staticRoot}/built/plugins/minerva/main.min.js"></script>

       </body>
    </html>
    """

    def GET(self):
        if self.indexHtml is None:
            self.vars['pluginCss'] = []
            self.vars['pluginJs'] = []
            builtDir = os.path.join(constants.STATIC_ROOT_DIR, 'clients',
                                    'web', 'static', 'built', 'plugins')
            # it would be nice to get the activated plugins from girder's
            # settings # but we need to reproduce this functionality in the
            # Gruntfile, so pull these from the plugin.json
            minervaPluginDir = os.path.dirname(os.path.realpath(__file__))
            pluginJson = os.path.join(minervaPluginDir, '..', 'plugin.json')
            with open(pluginJson, 'r') as pluginJsonData:
                pluginConfig = json.load(pluginJsonData)
                self.vars['plugins'] = pluginConfig['dependencies']
            for plugin in self.vars['plugins']:
                if os.path.exists(os.path.join(builtDir, plugin,
                                               'plugin.min.css')):
                    self.vars['pluginCss'].append(plugin)
                if os.path.exists(os.path.join(builtDir, plugin,
                                               'plugin.min.js')):
                    self.vars['pluginJs'].append(plugin)
            self.indexHtml = mako.template.Template(self.template).render(
                **self.vars)

        return self.indexHtml


class WmsProxy(object):
    exposed = True

    def GET(self, url, credentials, **params):
        auth = 'Basic ' + b64encode(decryptCredentials(bytes(credentials)))
        headers = {'Authorization': auth}
        r = requests.get(url, params=params, headers=headers)
        cherrypy.response.headers['Content-Type'] = r.headers['content-type']
        return r.content


def validate_settings(event):
    """Validate minerva specific settings."""
    key = event.info['key']
    val = event.info['value']

    if key == 'minerva.geonames_folder':
        ModelImporter.model('folder').load(val, exc=True, force=True)
        event.preventDefault().stopPropagation()


def load(info):
    # Move girder app to /girder, serve minerva app from /
    info['serverRoot'], info['serverRoot'].girder = (CustomAppRoot(),
                                                     info['serverRoot'])
    info['serverRoot'].api = info['serverRoot'].girder.api

    shapefileREST = shapefile.Shapefile()
    info['apiRoot'].item.route('POST', (':id', 'geojson'),
                               shapefileREST.createGeoJson)
    info['apiRoot'].item.route('GET', (':id', 'geojson'),
                               shapefileREST.findGeoJson)

    # Admin endpoint for initializing the geonames database
    info['apiRoot'].geonames = geocodeREST = geocode.Geonames()
    info['apiRoot'].geonames.route('POST', ('setup',),
                                   geocodeREST.setup)
    info['apiRoot'].geonames.route('GET', ('geocode',),
                                   geocodeREST.geocode)
    events.bind('model.setting.validate', 'minerva', validate_settings)

    info['apiRoot'].minerva_dataset = dataset.Dataset()
    info['apiRoot'].minerva_analysis = analysis.Analysis()
    info['apiRoot'].minerva_session = session.Session()
    info['apiRoot'].minerva_dataset_s3 = s3_dataset.S3Dataset()

    info['apiRoot'].minerva_source = source.Source()

    info['apiRoot'].minerva_source_wms = wms_source.WmsSource()
    info['apiRoot'].minerva_dataset_wms = wms_dataset.WmsDataset()

    info['apiRoot'].minerva_dataset_geojson = geojson_dataset.GeojsonDataset()

    info['apiRoot'].minerva_source_elasticsearch = \
        elasticsearch_source.ElasticsearchSource()
    info['apiRoot'].minerva_query_elasticsearch = \
        elasticsearch_source.ElasticsearchQuery()

    info['apiRoot'].minerva_source_postgres = \
        postgres_source.PostgresSource()

    info['serverRoot'].wms_proxy = WmsProxy()
