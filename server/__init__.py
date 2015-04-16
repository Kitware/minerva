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
import os
import time

from girder.api import access
from girder.api.rest import Resource, loadmodel
from girder.api.describe import Description
from girder.constants import AccessType
from girder.utility import assetstore_utilities

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
              href="${staticRoot}/built/app.min.css">
        <link rel="stylesheet"
              href="${staticRoot}/built/plugins/minerva/minerva.min.css">
        <link rel="stylesheet"
              href="${staticRoot}/built/plugins/jobs/plugin.min.css">
        <link rel="icon"
              type="image/png"
              href="${staticRoot}/img/Girder_Favicon.png">

      </head>
      <body>
        <div id="g-global-info-apiroot" class="hide">${apiRoot}</div>
        <div id="g-global-info-staticroot" class="hide">${staticRoot}</div>
        <script src="${staticRoot}/built/libs.min.js"></script>
        <script src="${staticRoot}/built/app.min.js"></script>
        <script src="${staticRoot}/built/plugins/jobs/plugin.min.js"></script>
        <script src="${staticRoot}/built/plugins/gravatar/plugin.min.js">
        </script>
        <script src="${staticRoot}/built/plugins/minerva/minerva.libs.min.js">
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


class Shapefile(Resource):



    def _createWorkDir(self, item):
        tmpdir = os.path.join(os.getcwd(), 'tmp')
        if not os.path.exists(tmpdir):
            os.makedirs(tmpdir)
        # TODO clean up tmpdir if exception
        # TODO deal with tmpdir name collision
        tmpdir = os.path.join(tmpdir, str(time.time()) + str(item['_id']))
        if not os.path.exists(tmpdir):
            os.makedirs(tmpdir)
        tmpdir = os.path.join(tmpdir, item['name'])
        if not os.path.exists(tmpdir):
            os.makedirs(tmpdir)
        return tmpdir

    def _downloadItemFiles(self, item, tmpdir):
        # TODO this will break if S3 assetstore
        # need to catch exception, get the redirect, then
        # download from the redirect
        # possibly easier to use the girder python client
        print tmpdir
        for file in list(self.model('item').childFiles(item)):
            print file
            if file.get('assetstoreId'):
                assetstore = self.model('assetstore').load(file['assetstoreId'])
                adapter = assetstore_utilities.getAssetstoreAdapter(assetstore)
                filestream = adapter.downloadFile(file, headers=False)
                print filestream
                outfile = os.path.join(tmpdir, file['name'])
                print outfile
                with open(outfile, 'w') as writer:
                    for x in filestream():
                        writer.write(x)

    def _convertToGeoJson(self, item, tmpdir):
        from gaia.pandas import GeopandasReader, GeopandasWriter
        reader = GeopandasReader()
        reader.file_name = tmpdir
        outname = os.path.join(tmpdir, item['name'] + '.geojson')
        writer = GeopandasWriter()
        writer.file_name = outname
        writer.format = 'GeoJSON'
        writer.set_input(port=reader.get_output())
        writer.run()

    def _addGeoJsonFileToItem(self):
        pass

    def _cleanWorkDir(self, tmpdir):
        pass

    @access.public
    @loadmodel(model='item', level=AccessType.WRITE)
    def createGeoJson(self, item, params):
        # grab all the files
        # write them out to a temp dir
        # convert them with gaia
        print "createGeoJson"
        tmpdir = self._createWorkDir(item)
        self._downloadItemFiles(item, tmpdir)
        self._convertToGeoJson(item, tmpdir)
        self._addGeoJsonFileToItem()
        self._cleanWorkDir(tmpdir)
        return "OK"

    createGeoJson.description = (
        Description('Convert an item holding a shapefile into geojson.')
        .param('id', 'The Item ID', paramType='path')
        .errorResponse('ID was invalid.')
        .errorResponse('Write permission denied on the Item.', 403))


def load(info):
    # Move girder app to /girder, serve minerva app from /
    info['serverRoot'], info['serverRoot'].girder = (CustomAppRoot(),
                                                     info['serverRoot'])
    info['serverRoot'].api = info['serverRoot'].girder.api

    shapefile = Shapefile()
    info['apiRoot'].item.route('POST', (':id', 'geojson'), shapefile.createGeoJson)

