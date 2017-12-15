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

import json
import os
import tempfile
from base64 import b64encode

import fiona
import geopandas
import requests
from girder.plugins.minerva.utility.minerva_utility import decryptCredentials
from six import StringIO

from gaia.core import GaiaException
from gaia.filters import filter_pandas
from gaia.inputs import GaiaIO
from gaia import formats, types
from girder.utility import config
import girder_client


class MinervaVectorIO(GaiaIO):
    """
    Interface to Minerva item geojson
    """

    type = types.VECTOR
    default_output = formats.JSON

    def __init__(self, item_id=None, token=None, name='gaia_result.json',
                 uri='', **kwargs):
        """
        Read and write GeoJSON data to/from Girder
        :param item_id: Item id to read/write from/to
        :param uri: location of temporary file
        :param kwargs: Other keyword arguments
        """

        self.id = item_id
        self.token = token
        if uri:
            self.uri = uri
        else:
            tmpdir = tempfile.mkdtemp()
            self.uri = tempfile.mkstemp(suffix='.json', dir=tmpdir)[1]
        self.filename = name
        girderPort = config.getConfig()['server.socket_port']
        client = girder_client.GirderClient(port=girderPort)
        client.token = token
        self.client = client
        self.meta = self.client.getItem(item_id)
        super(MinervaVectorIO, self).__init__(uri=self.uri, **kwargs)

    def save_geojson(self):
        """
        Save GeoJSON from a Minerva item
        TODO: Use caching like the girder_worker.girder_io plugin
        TODO: Separate methods for saving geojson from different sources
        TODO: Get geojson via WFS calls for local WMS vector layers
        """
        minerva = self.meta['meta']['minerva']
        if 'geojson_file' in minerva:
            # Uploaded GeoJSON is stored as a file in Girder
            self.client.downloadFile(minerva['geojson_file']['_id'], self.uri)
        elif 'geojson' in minerva:
            # Mongo collection is stored in item meta
            geojson = json.loads(minerva['geojson']['data'])
            # TODO: Don't use mongo metadata for filename
            with open(self.uri, 'w') as outjson:
                json.dump(geojson, outjson)
        elif 'dataset_type' in minerva and minerva['dataset_type'] == 'wms':
            servers = config.getConfig()['gaia_minerva_wms']['servers']
            if minerva['base_url'] in servers:
                params = 'srsName=EPSG:4326&typename={name}&outputFormat=json'\
                         + '&version=1.0.0&service=WFS&request=GetFeature'
                url = '{base}?{params}'.format(
                    base=minerva['base_url'].replace('/wms', '/wfs'),
                    params=params.format(name=minerva['type_name'])

                )
                headers = {}
                if 'credentials' in minerva:
                    credentials = (minerva['credentials'])
                    basic_auth = 'Basic ' + b64encode(
                        decryptCredentials(credentials))
                    headers = {'Authorization': basic_auth}

                with open(self.uri, 'w') as outjson:
                    r = requests.get(url, headers=headers)
                    r.raise_for_status()
                    json.dump(r.json(), outjson)
            else:
                raise GaiaException('This server {} is not supported. \n{}'.format(minerva))
        else:
            raise GaiaException('Unsupported data source. \n{}'.format(minerva))

    def read(self, epsg=None, **kwargs):
        """
        Read vector data from Girder
        :param format: Format to return data in (default is GeoDataFrame)
        :param epsg: EPSG code to reproject data to
        :return: Data in GeoJSON
        """

        if self.data is None:
            self.save_geojson()
            self.data = geopandas.read_file(self.uri)
            if self.filters:
                self.filter_data()
        out_data = self.data
        if epsg and self.get_epsg() != epsg:
            out_data = geopandas.GeoDataFrame.copy(out_data)
            out_data[out_data.geometry.name] = \
                self.data.geometry.to_crs(epsg=epsg)
            out_data.crs = fiona.crs.from_epsg(epsg)
        if format == formats.JSON:
            return out_data.to_json()
        else:
            return out_data

    def write(self, filename=None, as_type='json'):
        """
        Write data (assumed geopandas) to geojson or shapefile
        :param filename: Base filename
        :param as_type: json or memory
        :return: file girder uri
        """
        filedata = self.data.to_json()
        if not filename:
            filename = self.filename
        if as_type == 'json':
            self.uri = self.uri.replace(os.path.basename(self.uri), filename)
            self.create_output_dir(self.uri)
            with open(self.uri, 'w') as outfile:
                outfile.write(filedata)
        elif as_type == 'memory':
            pass
        else:
            raise NotImplementedError('{} not a valid type'.format(as_type))

        fd = StringIO(filedata)
        upload = self.client.uploadFile(parentId=self.id, stream=fd,
                                        size=len(filedata), name=filename)
        item_meta = self.client.getItem(self.id)['meta']
        item_meta['minerva']['geojson_file'] = {
            '_id': upload['_id'],
            'name': upload['name']
        }
        item_meta['minerva']['geo_render'] = {
            'type': 'geojson',
            'file_id': upload['_id']
        }
        self.client.addMetadataToItem(self.id, item_meta)
        return os.path.join(
            self.client.urlBase, 'file', upload['_id'], 'download')

    def filter_data(self):
        """
        Apply filters to the dataset
        :return:
        """
        self.data = filter_pandas(self.data, self.filters)

PLUGIN_CLASS_EXPORTS = [
    MinervaVectorIO
]
