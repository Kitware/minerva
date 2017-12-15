#!/usr/bin/env python
# -*- coding: utf-8 -*-

###############################################################################
#  Copyright Kitware Inc. and Epidemico Inc.
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
from girder.api.rest import Resource, setRawResponse
from girder.api import access
from girder.api.describe import Description
from girder.utility import config
import cherrypy
import json
from gaia.parser import deserialize
import gaia.formats


class GeoProcess(Resource):
    """Make various gaia requests on Girder data."""

    def __init__(self):
        super(GeoProcess, self).__init__()
        self.resourceName = 'gaia_process'
        self.config = config.getConfig()
        self.route('POST', (), self.processTask)
        self.route('GET', ('classes',), self.classDictTask)

    @access.user
    def classDictTask(self, params=None):
        from gaia.parser import valid_processes
        return {
            'processes': valid_processes,
            'gaia_minerva_wms': []
        }

    classDictTask.description = (
        Description('Get a list of available Gaia processes and inputs')
        .errorResponse('An error occurred making the request', 500))

    @access.user
    def processTask(self, params=None):
        """
        Based on the process name in the URL and JSON in the request body,
        create & send a WPS request and pass on the response.
        """

        json_body = self.getBodyJson()

        process = json.loads(json.dumps(json_body),
                             object_hook=deserialize)

        # assume output is GeoJSON or GeoTIFF
        process.compute()
        if process.output.default_output == gaia.formats.PANDAS:
            result = json.loads(process.output.read(format=gaia.formats.JSON))
        else:
            result = json.loads(process.output.read())
        if not isinstance(result, dict):
            setRawResponse(True)
            cherrypy.response.headers['Content-Type'] = 'image/tiff'
        return result

    processTask.description = (
        Description('Make a gaia request and return the response')
        .param('body', 'A JSON object containing the process parameters',
               paramType='body')
        .errorResponse('An error occurred making the request', 500))
