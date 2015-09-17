from __future__ import absolute_import

import logging
import os
import datetime
import requests
from django.conf import settings
import shutil
from ..processor_base import GeoDataMosaicProcessor
from ..helpers import gdal_translate

logger = logging.getLogger("epidemico.geoprocessors.processors")

GS_DATA_DIR = getattr(settings, 'GS_DATA_DIR', '/data/geodata')

class ForecastIOAirTempProcessor(GeoDataMosaicProcessor):
    """
    Class for processing the latest 'QuickSilver' global air temperature geotiff
    from forecast.io (http://forecast.io/quicksilver/)
    """
    prefix = "forecast_io_airtemp"
    base_url = "http://maps.forecast.io/temperature"
    layer_name = "forecast_io_airtemp"

    def parse_name(self, img_date):
        imgstrtime = img_date.strftime("%Y-%m-%d %H:00")
        layer_title = "Global (near-surface) Air Temperature - {} UTC".format(imgstrtime)
        return layer_title

    def run(self, now=None):
        """
        Retrieve and process the latest global air temperature image from forecast.io
        """
        if not now:
            now = datetime.datetime.utcnow()
        raw_name = "{prefix}_{hour}.tif".format(
                prefix=self.prefix, hour='{0:02d}'.format(now.hour))
        try:
            raw_file = self.download("{url}/{year}/{month}/{day}/{hour}.tif".format(
                url=self.base_url,
                year=str(now.year), month='{0:02d}'.format(now.month),
                day='{0:02d}'.format(now.day), hour='{0:02d}'.format(now.hour)), raw_name)
        except requests.HTTPError:
            # Try the previous hour:
            now = now - datetime.timedelta(hours=1)
            raw_file = self.download("{url}/{year}/{month}/{day}/{hour}.tif".format(
                url=self.base_url,
                year=str(now.year), month='{0:02d}'.format(now.month),
                day='{0:02d}'.format(now.day), hour='{0:02d}'.format(now.hour)), raw_name)

        tif_file = "{prefix}_{year}{month}{day}T{hour}0000000Z.tif".format(
                prefix=self.prefix,
                year=str(now.year), month='{0:02d}'.format(now.month),
                day='{0:02d}'.format(now.day), hour='{0:02d}'.format(now.hour))
        gdal_translate(os.path.join(self.tmp_dir, raw_file), os.path.join(self.tmp_dir, tif_file),
                       projection='EPSG:4326', options=['COMPRESS=DEFLATE'])

        dst_file = self.data_dir.format(gsd=GS_DATA_DIR, ws=self.workspace, layer=self.layer_name, file=tif_file)
        dst_dir = os.path.dirname(dst_file)
        if not os.path.exists(dst_dir):
            os.makedirs(dst_dir)
        if dst_file.endswith('.tif'):
            shutil.move(os.path.join(self.tmp_dir, tif_file), dst_file)
            self.post_geoserver(dst_file, self.layer_name)

        self.drop_old_hourly_images(now, self.layer_name)
        self.drop_old_daily_images(now, self.layer_name)

        self.update_geonode(self.layer_name, title=self.parse_name(now),
                            bounds=('-180.0', '180.0', '-90.0', '90.0', 'EPSG:4326'))
        self.truncate_gs_cache(self.layer_name)
        self.cleanup()


if __name__ == '__main__':
    processor = ForecastIOAirTempProcessor()
    processor.run()
