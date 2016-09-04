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
from urllib import urlencode
from urlparse import parse_qs, urlsplit, urlunsplit

from girder.api import access
from girder.api.rest import Resource

from owslib.wms import WebMapService


class WmsStyle(Resource):

    def __init__(self):
        self.resourceName = 'minerva_wms_style'
        self.route('POST', (), self.createWmsStyle)

    @staticmethod
    def _guess_type(layer):
        """ Helper function to guess the type of dataset """

        # If WCS is in the layer keywords it is a Raster
        if "WCS" in layer.keywords:
            return "raster"
        else:
            return "vector"

    @staticmethod
    def _generate_url(wms_url, service, request, version, typeName):
        """ Generates different urls(wfs or wcs) from a wms url """

        scheme, netloc, path, query_string, fragment = urlsplit(wms_url)
        query_params = parse_qs(query_string)

        query_params['service'] = [service]
        query_params['request'] = [request]
        query_params['typeName'] = [typeName]
        query_params['version'] = [version]
        new_query_string = urlencode(query_params, doseq=True)

        return urlunsplit((scheme, netloc, path, new_query_string, fragment))

    @access.user
    def createWmsStyle(self, params):

        # Create WMS instance
        wms = WebMapService(params['baseURL'])

        # Get the layer
        type_name = wms[params['typeName']]

        # Guess the layer type
        layer_type = self._guess_type(type_name)

        if layer_type == 'vector':

            # Generate wfs url
            wfs_url = self._generate_url(params['baseURL'],
                                         'wfs',
                                         'describefeaturetype',
                                         '1.0.0',
                                         params['typeName'])

            print wfs_url


        elif layer_type == 'raster':
            pass

        return params
