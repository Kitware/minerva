from __future__ import absolute_import

import glob
import json
import logging
from geoserver.catalog import Catalog
import os
import datetime
import requests
from django.conf import settings
from geonode.geoserver.helpers import ogc_server_settings
from geonode.geoserver.management.commands.updatelayers import Command as UpdateLayersCommand

logger = logging.getLogger("epidemico.geoprocessors.processors")

DEFAULT_WORKSPACE = getattr(settings, 'DEFAULT_WORKSPACE', 'geonode')
GS_DATA_DIR = getattr(settings, 'GS_DATA_DIR', '/data/geodata')

class GeoDataProcessor(object):
    """
    Base class to handle geodata retrieval and processing for import into GeoNode/GeoServer
    """

    gs_url = "http://localhost:8080/geoserver/rest/workspaces/{}/coveragestores/{}/file.geotiff"

    def __init__(self, workspace=DEFAULT_WORKSPACE, tmp_dir="/tmp"):
        self.workspace = workspace
        self.tmp_dir = tmp_dir


    def download(self, url, filename=None):
        """
        Download a file from the specified URL
        :param url: The URL to download from
        :param filename: Optional name of the downloaded file.
        :return: Name of the downloaded file (not including path).
        """
        if not filename:
            filename = url.rsplit('/')[-1]
        r = requests.get(url, stream=True)
        with open(os.path.join(self.tmp_dir, filename), 'wb') as out_file:
            for chunk in r.iter_content(chunk_size=1024):
                if chunk: # filter out keep-alive new chunks
                    out_file.write(chunk)
                    out_file.flush()
        r.raise_for_status()
        return filename

    def truncate_gs_cache(self, layer_name):
        _user, _password = ogc_server_settings.credentials
        gwc_url = "{base_url}gwc/rest/seed/{ws}:{layer}.json".format(
            base_url=ogc_server_settings.LOCATION,
            ws=self.workspace,
            layer=layer_name
        )
        truncate_json = json.dumps({'seedRequest':
                    {'name': 'geonode:{}'.format(layer_name),
                     'srs': {'number': 900913},
                     'zoomStart': 0,
                     'zoomStop': 19,
                     'format': 'image/png',
                     'type': 'truncate',
                     'threadCount': 4
                     }
                })

        res = requests.post(url=gwc_url, data=truncate_json,
                           auth=(_user, _password), headers={"Content-type": "application/json"})
        res.raise_for_status()

    def post_geoserver(self, tif_file, layer_name):
        """
        Upload a GeoTIFF to GeoServer as a coverage layer
        :param tif_file: Full path&name of GeoTIFF to import
        :param layer_name: Name of the coverage layer
        """
        # Post to Geoserver
        gs_url = self.gs_url.format(self.workspace, layer_name)
        data = None
        with open(os.path.join(self.tmp_dir, tif_file), 'rb') as tif_binary:
            data = tif_binary.read()
        _user, _password = ogc_server_settings.credentials
        res = requests.put(url=gs_url,
                            data=data,
                            auth=(_user, _password),
                            headers={'Content-Type': 'image/tif'})

        res.raise_for_status()
        return res.content

    def update_geonode(self, layer_name, title="", bounds=None):
        """
        Update a layer and it's title in GeoNode
        :param layer_name: Name of the layer
        :param title: New title for layer
        """
        # Update the layer in GeoNode
        ulc = UpdateLayersCommand()
        ulc.handle(verbosity=1, filter=layer_name)

        if title:
            from geonode.layers.models import Layer
            lyr = Layer.objects.get(typename='geonode:{}'.format(layer_name))
            lyr.title = title
            lyr.save()
            if bounds:
                from geonode.layers.models import Layer
                res = lyr.gs_resource
                res.native_bbox = bounds
                _user, _password = ogc_server_settings.credentials
                url = ogc_server_settings.rest
                gs_catalog = Catalog(url, _user, _password)
                gs_catalog.save(res)


    def cleanup(self):
        """
        Remove any files in the temp directory matching the processor class prefix
        """
        filelist = glob.glob("{}*.*".format(os.path.join(self.tmp_dir, self.prefix)))
        for f in filelist:
            os.remove(f)

    def run(self):
        raise NotImplementedError


class GeoDataMosaicProcessor(GeoDataProcessor):
    """
    Processor for handling raster mosaic data stores
    http://docs.geoserver.org/latest/en/user/tutorials/imagemosaic_timeseries/imagemosaic_timeseries.html
    http://geoserver.geo-solutions.it/multidim/en/rest/index.html
    """

    gs_url = "http://localhost:8080/geoserver/rest/workspaces/{}/coveragestores/{}/external.imagemosaic"
    mosaic_url = gs_url.replace('external.imagemosaic', 'coverages/{}/index/granules')
    archive_hours = ("T12:00:00.000Z",)
    days_to_keep = 30
    data_dir = "{gsd}/data/{ws}/{layer}/{file}"

    def del_mosaic_image(self, url):
        """
        Remove an image from a mosaic store
        :param url: Geoserver REST URL indicating which image from which mosaic to delete
        :return: response status and content
        """
        _user, _password = ogc_server_settings.credentials
        r = requests.delete(url, auth=(_user, _password))
        r.raise_for_status()
        return r.status_code, r.content

    def post_geoserver(self, filepath, layer_name):
        """
        Add another image to a mosaic datastore
        :param filepath: Full path&name of GeoTIFF to import
        :param layer_name: Name of the mosaic layer & store (assumed to be same)
        """
        gs_url = self.gs_url.format(self.workspace, layer_name)
        data = "file://{}".format(filepath)
        _user, _password = ogc_server_settings.credentials
        res = requests.post(url=gs_url,
                            data=data,
                            auth=(_user, _password),
                            headers={'Content-Type': 'text/plain'})

        res.raise_for_status()
        return res.content


    def remove_mosaic_granules(self, mosaic_url, mosaic_query):
        _user, _password = ogc_server_settings.credentials
        r = requests.get("{url}.json?filter={query}".format(
            url=mosaic_url, query=mosaic_query),
            auth=(_user, _password))
        r.raise_for_status()
        fc = json.loads(r.content)
        for feature in fc['features']:
            dst_file = self.data_dir.format(gsd=GS_DATA_DIR, ws=self.workspace,
                                            layer=self.layer_name, file=feature['properties']['location'])
            if os.path.isfile(dst_file):
                os.remove(dst_file)
            self.del_mosaic_image("{}/{}".format(mosaic_url, feature['id']))

    def drop_old_hourly_images(self, nowtime, layer_name):
        """
        Remove any of today's previous hourly images from the mosaic, except for the archive hour.
        :param nowtime: Current date/time
        :param layer_name: Geoserver mosaic store/layer name
        """
        today = nowtime.strftime("%Y-%m-%dT%H:00:00.000Z")
        morn = nowtime.strftime("%Y-%m-%dT00:00:00.000Z")
        archive_query = ""

        #Remove today's old images
        for hour in self.archive_hours:
            archive_query += (" AND ingestion<>" + nowtime.strftime("%Y-%m-%d{}".format(hour)))
        mosaic_index_url = self.mosaic_url.format(self.workspace, layer_name, layer_name)
        mosaic_query = "ingestion<{now} AND ingestion>={morn}{archive_query}".format(
            now=today, morn=morn, archive_query=archive_query)
        self.remove_mosaic_granules(mosaic_index_url, mosaic_query)

        #Remove yesterday's old images if any remaining
        yesterday = nowtime - datetime.timedelta(days=1)
        archive_query = ""
        for hour in self.archive_hours:
            archive_query += (" AND ingestion<>" + yesterday.strftime("%Y-%m-%d{}".format(hour)))
        mosaic_query = "ingestion<{morn} AND ingestion>={yestermorn}{archive_query}".format(
            morn=morn, archive_query=archive_query, yestermorn=yesterday.strftime("%Y-%m-%dT00:00:00.000Z"))
        self.remove_mosaic_granules(mosaic_index_url, mosaic_query)


    def drop_old_daily_images(self, nowtime, layer_name):
        """
        Remove any images from the mosaic older than the 'days_to_keep' property (default is 30).
        :param nowtime: Current date/time
        :param layer_name: Geoserver mosaic store/layer name
        """
        _user, _password = ogc_server_settings.credentials
        month_cutoff = (nowtime - datetime.timedelta(days=self.days_to_keep)).strftime("%Y-%m-%dT00:00:00.000Z")
        mosaic_index_url = self.mosaic_url.format(self.workspace, layer_name, layer_name)
        mosaic_query = "ingestion<={}".format(month_cutoff)
        self.remove_mosaic_granules(mosaic_index_url, mosaic_query)

