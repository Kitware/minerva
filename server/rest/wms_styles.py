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
        self._type_name = None
        self._base_url = None

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

    def _get_attributes(self, xml_response):
        """ Gets the attributes from a vector layer """

        attributes = {}

        keys = xml_response\
               .iterfind('.//{http://www.w3.org/2001/XMLSchema}element')

        for elem in keys:
            attribute = {}
            # the_geom should be ignored
            if elem.get('name') != 'the_geom' and elem.get('name') != 'wkb_geometry':
                if elem.get('type') == 'xsd:string':
                    attribute['type'] = 'text'
                    attribute['entry'] = self._get_unique_entries(elem.get('name'))
                else:
                    attribute['type'] = 'numeric'
                    attribute['range'] = self._get_attribute_range(elem.get('name'))
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

    @staticmethod
    def _get_number_of_features(xml_response):
        """ Gets number of features """

        return int(xml_response.get('numberOfFeatures'))

    def _parse_min_max_response(self, url, attribute):
        """ Parses the min and max parameter """

        response = self._get_xml_response(url)

        try:
            for elem in response.getiterator():
                if attribute in elem.tag:
                    value = elem.text
            return value
        except UnboundLocalError:
            return None

    @staticmethod
    def _get_bands(xml_response):
        """ Gets the name of the bands """

    def _get_attribute_range(self, attribute):
        """ Gets the min max value for a given numeric attribute """
        wcs_namespace = "{http://www.opengis.net/wcs/1.1.1}"
        ows_namespace = "{http://www.opengis.net/ows/1.1}"

        # Create the url for each attribute
        # "+D" is for descending
        # "+A" is for ascending
        max_range_url = self._generate_url(self._base_url,
                                           service='wfs',
                                           request='getfeature',
                                           typename=self._type_name,
                                           version='1.1.0',
                                           maxfeatures=1,
                                           propertyname=attribute,
                                           filter="<Not><PropertyIsNull><PropertyName>{}</PropertyName>" \
                                           "<Literal></Literal></PropertyIsNull></Not>".format(attribute),
                                           sortby=attribute) + "+D"
        bands = []
        minimum = []
        maximum = []

        min_range_url = self._generate_url(self._base_url,
                                           service='wfs',
                                           request='getfeature',
                                           typename=self._type_name,
                                           version='1.1.0',
                                           maxfeatures=1,
                                           propertyname=attribute,
                                           filter="<Not><PropertyIsNull><PropertyName>{}</PropertyName>" \
                                           "<Literal></Literal></PropertyIsNull></Not>".format(attribute),
                                           sortby=attribute) + "+A"
        for elem in xml_response.iter():
            if elem.tag == "{}{}".format(wcs_namespace, "Key"):
                bands.append(elem.text)
            elif elem.tag == "{}{}".format(ows_namespace, "MinimumValue"):
                minimum.append(elem.text)
            elif elem.tag == "{}{}".format(ows_namespace, "MaximumValue"):
                maximum.append(elem.text)

        maximum = self._parse_min_max_response(max_range_url, attribute)
        minimum = self._parse_min_max_response(min_range_url, attribute)
        if len(bands) == 1:
            return {bands[0]:
                    {'properties':
                     {'min': minimum[0],
                      'max': maximum[0]}}}
        elif len(bands) > 1:
            return bands

        if maximum and minimum:
            return {'min': minimum, 'max': maximum}
        return bands

    def _get_unique_entries(self, attribute):
        """ Returns a list of unique entries for a given attribute """

        entry_url = self._generate_url(self._base_url,
                                       service='wfs',
                                       request='getfeature',
                                       typename=self._type_name,
                                       version='1.1.0',
                                       propertyname=attribute)

        entry_xml = self._get_xml_response(entry_url)

        entries = []

        for elem in entry_xml.getiterator():
            if attribute in elem.tag:
                entries.append(elem.text)

        return list(set(entries))


    @access.user
    def createWmsStyle(self, params):

        self._base_url = params['baseURL']
        self._type_name = params['typeName']

        # Create WMS instance
        wms = WebMapService(self._base_url)

        # Get the layer
        layer = wms[self._type_name]

        # Guess the layer type
        layer_type = self._guess_type(layer)

        layer_params = {}

        if layer_type == 'vector':

            # Generate wfs url
            wfs_url = self._generate_url(self._base_url,
                                         service='wfs',
                                         request='describefeaturetype',
                                         version='1.0.0',
                                         typename=self._type_name)

            wfs_response = self._get_xml_response(wfs_url)
            layer_params['layerType'] = layer_type
            layer_params['vectorType'] = self._get_vector_type(wfs_response)
            layer_params['attributes'] = self._get_attributes(wfs_response)

            # Construct the url for getting the number of features
            count_url = self._generate_url(self._base_url,
                                           service='wfs',
                                           request='getfeature',
                                           version='1.1',
                                           typename=self._type_name,
                                           resultType='hits')

            count_response = self._get_xml_response(count_url)
            layer_params['numberOfFeatures'] = self._get_number_of_features(count_response)

        elif layer_type == 'raster':
            layer_params['layerType'] = layer_type

            # Generate a wcs url
            wcs_url = self._generate_url(self._base_url,
                                         service='wcs',
                                         request='describecoverage',
                                         version='1.1.1',
                                         identifiers=self._type_name)

            wcs_response = self._get_xml_response(wcs_url)
            bands = self._get_bands(wcs_response)
            layer_params['bands'] = bands
            if isinstance(bands, dict):
                    layer_params['rasterType'] = 'singleband'
            elif isinstance(bands, list):
                    layer_params['rasterType'] = 'multiband'

        return layer_params
