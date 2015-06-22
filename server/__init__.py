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

from girder import events
from girder.utility.model_importer import ModelImporter

from girder.plugins.minerva.rest import dataset, session, shapefile, geocode


class CustomAppRoot(object):
    """
    The webroot endpoint simply serves the main index HTML file of minerva.
    """
    exposed = True

    indexHtml = None

    vars = {
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
        <link rel="stylesheet"
              href="${staticRoot}/lib/fontello/css/fontello.css">
        <link rel="stylesheet"
              href="${staticRoot}/lib/fontello/css/animation.css">
        <link rel="stylesheet"
              href="${staticRoot}/built/plugins/minerva/jquery.gridster.min.css">
        <link rel="stylesheet"
              href="${staticRoot}/built/app.min.css">
        <link rel="stylesheet"
              href="${staticRoot}/built/plugins/minerva/minerva.min.css">
        <link rel="stylesheet"
              href="http:////cdn.datatables.net/1.10.7/css/jquery.dataTables.css">
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
        <script src="${staticRoot}/built/plugins/gravatar/plugin.min.js">
        </script>
    <script src="http://cdn.datatables.net/1.10.7/js/jquery.dataTables.min.js">
        </script>
        <script src="${staticRoot}/built/plugins/minerva/papaparse.min.js">
        </script>
        <script src="${staticRoot}/built/plugins/minerva/jsonpath.min.js">
        </script>
        <script src="${staticRoot}/built/plugins/minerva/minerva.min.js">
        </script>
        <script src="${staticRoot}/built/plugins/minerva/main.min.js"></script>
      </body>
    </html>
    """

    def GET(self):
        if self.indexHtml is None:
            self.indexHtml = mako.template.Template(self.template).render(
                **self.vars)

        return self.indexHtml


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
    info['apiRoot'].minerva_session = session.Session()
