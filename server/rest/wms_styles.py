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
from urlparse import urlsplit, urlunsplit
import xml.etree.ElementTree as ET

from owslib.wms import WebMapService
import requests

from girder.api import access
from girder.api.rest import Resource
from girder.plugins.minerva.utility.minerva_utility import updateMinervaMetadata


def wps_template(type_name, attribute):
    return \
    """<?xml version="1.0" encoding="UTF-8"?><wps:Execute version="1.0.0" service="WPS" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.opengis.net/wps/1.0.0" xmlns:wfs="http://www.opengis.net/wfs" xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:gml="http://www.opengis.net/gml" xmlns:ogc="http://www.opengis.net/ogc" xmlns:wcs="http://www.opengis.net/wcs/1.1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 http://schemas.opengis.net/wps/1.0.0/wpsAll.xsd">
  <ows:Identifier>gs:Aggregate</ows:Identifier>
  <wps:DataInputs>
    <wps:Input>
      <ows:Identifier>features</ows:Identifier>
      <wps:Reference mimeType="text/xml" xlink:href="http://geoserver/wfs" method="POST">
        <wps:Body>
          <wfs:GetFeature service="WFS" version="1.0.0" outputFormat="GML2" xmlns:sf="http://www.openplans.org/spearfish">
            <wfs:Query typeName="{}"/>
          </wfs:GetFeature>
        </wps:Body>
      </wps:Reference>
    </wps:Input>
    <wps:Input>
      <ows:Identifier>aggregationAttribute</ows:Identifier>
      <wps:Data>
        <wps:LiteralData>{}</wps:LiteralData>
      </wps:Data>
    </wps:Input>
    <wps:Input>
      <ows:Identifier>function</ows:Identifier>
      <wps:Data>
        <wps:LiteralData>Min</wps:LiteralData>
      </wps:Data>
    </wps:Input>
    <wps:Input>
      <ows:Identifier>function</ows:Identifier>
      <wps:Data>
        <wps:LiteralData>Max</wps:LiteralData>
      </wps:Data>
    </wps:Input>
    <wps:Input>
      <ows:Identifier>function</ows:Identifier>
      <wps:Data>
        <wps:LiteralData>Count</wps:LiteralData>
      </wps:Data>
    </wps:Input>
    <wps:Input>
      <ows:Identifier>singlePass</ows:Identifier>
      <wps:Data>
        <wps:LiteralData>false</wps:LiteralData>
      </wps:Data>
    </wps:Input>
  </wps:DataInputs>
  <wps:ResponseForm>
    <wps:RawDataOutput mimeType="text/xml">
      <ows:Identifier>result</ows:Identifier>
    </wps:RawDataOutput>
  </wps:ResponseForm>
</wps:Execute>""".format(type_name, attribute)  # noqa


class WmsStyle(object):

    def __init__(self, type_name, base_url):
        self._type_name = type_name
        self._base_url = base_url

    @staticmethod
    def _guess_type(layer):
        """Helper function to guess the type of dataset"""

        # If WCS is in the layer keywords it is a Raster
        if "WCS" in layer.keywords:
            return "raster"
        else:
            return "vector"

    @staticmethod
    def _generate_url(wms_url, **kwargs):
        """Generates different urls(wfs or wcs) from a wms url"""

        scheme, netloc, path, query_string, fragment = urlsplit(wms_url)

        if kwargs:
            query_string = kwargs

        new_query_string = urlencode(query_string, doseq=True)

        return urlunsplit((scheme, netloc, path, new_query_string, fragment))

    @staticmethod
    def _get_xml_response(url):
        """Get xml response from the request"""

        response = requests.get(url)
        tree = ET.fromstring(response.content)

        return tree

    def _get_attributes(self, xml_response):
        """Gets the attributes from a vectorlayer"""

        attributes = {}

        keys = xml_response\
            .iterfind('.//{http://www.w3.org/2001/XMLSchema}element')

        for elem in keys:
            attribute = {}
            # the_geom should be ignored
            if elem.get('name') != 'the_geom' and elem.get('name') != 'wkb_geometry':

                if elem.get('type') == 'xsd:string':
                    pass
                else:
                    attribute['type'] = 'numeric'
                    attribute['properties'] = self._get_min_max_count(elem.get('name'))
                    attributes[elem.get('name')] = attribute

        return attributes

    @staticmethod
    def _get_vector_type(xml_response):
        """Gets the vector type"""

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

    def _get_min_max_count(self, attribute):
        """Gets the min max and count values for a given
        numeric attribute
        """

        url = self._base_url.split("?")[0].replace('ows', 'wps')
        headers = {'Content-Type': 'application/xml'}
        xml_data = wps_template(self._type_name, attribute)
        res = requests.post(url, data=xml_data, headers=headers)
        # Means wps is not activated
        if res.status_code == 404:
            return None
        elif 'Exception' in res.text:
            return None
        else:
            prop = {}
            xml_res = ET.fromstring(res.content)
            for elem in xml_res.iter():
                if 'Min' in elem.tag:
                    prop['min'] = elem.text
                elif 'Max' in elem.tag:
                    prop['max'] = elem.text
                elif 'Count' in elem.tag:
                    prop['count'] = elem.text
            return prop

    @staticmethod
    def _get_bands(xml_response):
        """Gets the name of the bands"""

        wcs_namespace = "{http://www.opengis.net/wcs/1.1.1}"
        ows_namespace = "{http://www.opengis.net/ows/1.1}"

        bands = []
        minimum = []
        maximum = []

        for elem in xml_response.iter():
            if elem.tag == "{}{}".format(wcs_namespace, "Key"):
                bands.append(elem.text)
            elif elem.tag == "{}{}".format(ows_namespace, "MinimumValue"):
                minimum.append(elem.text)
            elif elem.tag == "{}{}".format(ows_namespace, "MaximumValue"):
                maximum.append(elem.text)

        if len(bands) == 1:
            return 'singleband', {bands[0]: {'properties': {'min': minimum[0], 'max': maximum[0]}}}
        elif len(bands) > 1:
            band_dict = {str(k): v for k, v in dict(enumerate(bands, 1)).items()}
            return 'multiband', band_dict

    def get_layer_info(self):

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
            layer_params['subType'] = self._get_vector_type(wfs_response)
            layer_params['attributes'] = self._get_attributes(wfs_response)

        elif layer_type == 'raster':
            layer_params['layerType'] = layer_type

            # Generate a wcs url
            wcs_url = self._generate_url(self._base_url,
                                         service='wcs',
                                         request='describecoverage',
                                         version='1.1.1',
                                         identifiers=self._type_name)

            wcs_response = self._get_xml_response(wcs_url)
            sub_type, bands = self._get_bands(wcs_response)
            layer_params['bands'] = bands
            layer_params['subType'] = sub_type

        return layer_params


class Sld(Resource):

    def __init__(self):
        self.resourceName = 'minerva_style_wms'
        self.route('POST', (), self.sld_meta)

    @access.user
    def sld_meta(self, params):
        self._update_metadata(str(params['_id']), params)

    def _update_metadata(self, item_id, sld):
        """Adds a new field to metadata"""

        item = self.model('item').load(item_id, user=self.getCurrentUser())
        item['meta']['minerva']['sld_params'] = sld

        updateMinervaMetadata(item, item['meta']['minerva'])
