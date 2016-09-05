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
import xml.etree.ElementTree as ET

from girder.api import access
from girder.api.rest import Resource

from owslib.wms import WebMapService
import requests


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
    def _generate_url(wms_url, **kwargs):
        """ Generates different urls(wfs or wcs) from a wms url """

        scheme, netloc, path, query_string, fragment = urlsplit(wms_url)

        if kwargs:
            query_string = kwargs

        new_query_string = urlencode(query_string, doseq=True)

        return urlunsplit((scheme, netloc, path, new_query_string, fragment))

    @staticmethod
    def _get_xml_response(url):
        """ Get xml response from the request """

        response = requests.get(url)
        tree = ET.fromstring(response.content)

        return tree

    @staticmethod
    def _get_attributes(xml_response):
        """ Gets the attributes from a vector layer """

        attributes = {}

        keys = xml_response\
               .iterfind('.//{http://www.w3.org/2001/XMLSchema}element')

        for elem in keys:
            attribute = {}
            # the_geom should be ignored
            if elem.get('name') != 'the_geom':
                if elem.get('type') == 'xsd:string':
                    attribute['type'] = 'text'
                else:
                    attribute['type'] = 'numeric'
                attributes[elem.get('name')] = attribute

        return attributes

    @staticmethod
    def _get_vector_type(xml_response):
        """ Gets the vector type """

        vector_type = "unknown"

        keys = xml_response\
               .iterfind('.//{http://www.w3.org/2001/XMLSchema}element')

        for elem in keys:
            type_guess = elem.get('type')
            if type_guess.startswith('gml'):
                if "Line" in type_guess:
                    vector_type = "line"
                elif "Point" in type_guess:
                    vector_type = "point"
                elif "Surface" in type_guess:
                    vector_type = "polygon"
                elif "Geometry" in type_guess:
                    vector_type = "polygon"

        return vector_type

    @access.user
    def createWmsStyle(self, params):

        # Create WMS instance
        wms = WebMapService(params['baseURL'])

        # Get the layer
        type_name = wms[params['typeName']]

        # Guess the layer type
        layer_type = self._guess_type(type_name)

        layer_params = {}

        if layer_type == 'vector':

            # Generate wfs url
            wfs_url = self._generate_url(params['baseURL'],
                                         service='wfs',
                                         request='describefeaturetype',
                                         version='1.0.0',
                                         typename=params['typeName'])

            wfs_response = self._get_xml_response(wfs_url)
            layer_params['layerType'] = layer_type
            layer_params['vectorType'] = self._get_vector_type(wfs_response)
            layer_params['attributes'] = self._get_attributes(wfs_response)

        elif layer_type == 'raster':
            layer_params['layerType'] = layer_type

        return layer_params
