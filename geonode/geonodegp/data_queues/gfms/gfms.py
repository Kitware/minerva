from __future__ import absolute_import

import logging
import os
import datetime
import struct
import re
import requests
from bs4 import BeautifulSoup as bs
from ..helpers import gdal_translate
from ..processor_base import GeoDataProcessor


logger = logging.getLogger("epidemico.geoprocessors.processors")


class GFMSProcessor(GeoDataProcessor):
    """
    Class for processing data from the Global Flood Management System
    """

    rows = 800
    cols = 2458

    header = """ncols        {cols}
    nrows        {rows}
    xllcorner    -127.5
    yllcorner    -50.0
    cellsize     0.125
    NODATA_value -9999
    """.format(cols=cols, rows=rows)

    base_url = "http://eagle1.umd.edu/flood/download/"
    layer_future = "gfms_latest"
    layer_current = "gfms_current"
    prefix = 'Flood_byStor_'

    def get_latest_future(self):
        """
        Get the URL for the latest image of future projected flood intensity
        :return: URL of the latest image
        """
        today  = datetime.datetime.now()
        month = today.strftime("%m")
        year = today.strftime("%Y")
        base_url = self.base_url + "{year}/{year}{month}".format(year=year, month=month)

        r = requests.get(base_url)
        html = bs(r.text)
        latest_img =html.find_all('a')[-1].get('href')
        img_url = "{}/{}".format(base_url, latest_img)
        return img_url

    def get_most_current(self):
        """
        Get the URL for the image of projected flood intensity, closest to current date/time
        :return: URL of the current image
        """
        today = datetime.datetime.utcnow()
        month = today.strftime("%m")
        year = today.strftime("%Y")
        day = today.strftime("%d")
        hour = today.strftime("%H")

        if int(hour) > 21:
            hour = 21
        else:
            hour = int(hour) - (int(hour) % 3)
        hour = '{0:02d}'.format(hour)

        base_url = self.base_url + "{year}/{year}{month}".format(year=year, month=month)
        latest_img = "{prefix}{year}{month}{day}{hour}.bin".format(prefix=self.prefix, year=year,
                                                                   month=month, day=day, hour=hour)
        img_url = "{}/{}".format(base_url, latest_img)
        return img_url

    def convert(self, img_file):
        """
        Convert a raw GFMS image into a GeoTIFF
        :param img_file: Name of raw image file from GFMS (assumed to be in temp directory)
        :return: Name of converted GeoTIFF file
        """
        basename = os.path.splitext(img_file)[0]
        aig_file = "{}.aig".format(basename)
        tif_file = "{}.tif".format(basename)

        outfile = open(os.path.join(self.tmp_dir, aig_file), "w")
        infile = open(os.path.join(self.tmp_dir, img_file), "rb")

        try:
            coords = struct.unpack('f'*self.rows*self.cols, infile.read(4*self.rows*self.cols))
            outfile.write(self.header)

            for idx, value in enumerate(coords):
                #print idx, value
                outfile.write(str(value) + " ")
                if (idx + 1) % 2458 == 0:
                    outfile.write("\n")
                    #print idx
        finally:
            outfile.close()
            infile.close()

        gdal_translate(os.path.join(self.tmp_dir, aig_file), os.path.join(self.tmp_dir, tif_file),
                       projection="EPSG:4326")
        return tif_file

    def parse_title(self, tif_file):
        """
        Determine title of layer based on date/time within the image filename
        :param tif_file: GFMS GeoTIFF image filename
        :return: New title for layer
        """
        latest_img_datestamp = re.findall("\d+", tif_file)[0]
        latest_img_date = datetime.datetime.strptime(latest_img_datestamp, '%Y%m%d%H')
        return "Flood Detection/Intensity - {}".format(latest_img_date.strftime("%m-%d-%Y %H:%M UTC"))

    def import_future(self):
        """
        Retrieve and process the GFMS image furthest into the future.
        """
        img_url = self.get_latest_future()
        img_file = self.download(img_url)
        tif_file = self.convert(img_file)
        new_title = self.parse_title(tif_file)
        self.post_geoserver(tif_file, self.layer_future)
        self.update_geonode(self.layer_future, title=new_title)
        self.truncate_gs_cache(self.layer_future)

    def import_current(self):
        """
        Retrieve and process the GFMS image closest to the current date/time.
        """
        img_url = self.get_most_current()
        img_file = self.download(img_url)
        tif_file = self.convert(img_file)
        new_title = self.parse_title(tif_file)
        self.post_geoserver(tif_file, self.layer_current)
        self.update_geonode(self.layer_current, title=new_title)
        self.truncate_gs_cache(self.layer_current)

    def run(self):
        """
        Retrieve and process both current and future GFMS images
        :return:
        """
        self.import_current()
        self.import_future()
        self.cleanup()


if __name__ == '__main__':
    processor = GFMSProcessor()
    processor.run()
