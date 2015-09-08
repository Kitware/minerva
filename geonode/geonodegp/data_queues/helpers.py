import os
import subprocess
from StringIO import StringIO
import psycopg2
import re
import sys
from geonode.geoserver.helpers import ogc_server_settings

__author__ = 'mbertrand'
from osgeo import gdal
import ogr2ogr

class GdalErrorHandler(object):
    """
    Don't display GDAL warnings, only errors
    """
    def __init__(self):
        self.err_level=gdal.CE_Failure
        self.err_no=0
        self.err_msg=''

    def handler(self, err_level, err_no, err_msg):
        self.err_level=err_level
        self.err_no=err_no
        self.err_msg=err_msg


err = GdalErrorHandler()
handler = err.handler
gdal.PushErrorHandler(handler)
gdal.UseExceptions()


def split_args(arg_string):
    """
    Split a string into a list based on whitespace, unless enclosed in quotes
    :param arg_string: Command-line arguments as string
    :return: list of strings
    """
    return [r.strip("\"") for r in re.findall(r'(?:"[^"]*"|[^\s"])+', arg_string)]


def get_band_count(raster_file):
    """
    Return the number of bands in a raster file
    :param raster_file: The full path & name of a raster file.
    :return: number of bands
    """
    datafile = gdal.Open(raster_file)
    return datafile.RasterCount


def gdal_translate(src_filename, dst_filename, dst_format="GTiff", bands=None, nodata=None,
                   projection=None, options=None):
    """
    Convert a raster image with the specified arguments (as if running from commandline)
    :param argstring: command line arguments as string
    :return: Result of gdal_translate process (success or failure)
    """
    from osgeo import gdal
    from osr import SpatialReference

    if not options:
        options = []

    # Open existing dataset, subsetting bands if necessary
    if bands:
        tmp_file = src_filename + ".sub"
        gdal_band_subset(src_filename, bands, tmp_file)
        src_ds = gdal.Open(tmp_file)
    else:
        src_ds = gdal.Open(src_filename)
    try:
        #Open output format driver, see gdal_translate --formats for list
        driver = gdal.GetDriverByName(dst_format)

        #Output to new format
        dst_ds = driver.CreateCopy(dst_filename, src_ds, 0, options)

        if projection:
            srs = SpatialReference()
            srs.SetWellKnownGeogCS(projection)
            dst_ds.SetProjection(srs.ExportToWkt())

        if nodata is not None:
            band = dst_ds.GetRasterBand(1)
            band.SetNoDataValue(nodata)

    finally:
        #Properly close the datasets to flush to disk
        dst_ds = None
        src_ds = None
        band = None
        if bands and tmp_file:
            os.remove(tmp_file)


def cdo_invert(filename):
    """
    Invert a NetCDF image so that gdal_translate can read it.
    :param filename: Full path * name of NetCDF image to invert
    """
    output_file = "{}.inv.nc".format(filename)
    subprocess.check_call(["cdo", "invertlat", "{}.nc".format(filename), output_file])
    return output_file


def ogr2ogr_exec(argstring):
    """
    Run an ogr2ogr command
    :param argstring: command line arguments as string
    :return: success or failure
    """
    args = ["", ]
    args.extend(split_args(argstring))
    old_stdout = sys.stdout
    result = StringIO()
    sys.stdout = result
    try:
        foo = ogr2ogr.main(args)
        if not foo:
            raise Exception(result.getvalue())
    finally:
        if old_stdout:
            sys.stdout = old_stdout


def postgres_query(query, commit=False, returnable=False):
    """
    Execute a PostgreSQL query
    :param query: Query string to execute
    :param commit: Whether or not to commit the query
    :param returnable: Whether or not to return results
    :return: Query result set or None
    """
    db = ogc_server_settings.datastore_db
    conn_string = "dbname={db_name} user={db_user} host={db_host} password={db_password}".format(
        db_name=db["NAME"], db_user=db["USER"], db_host=db["HOST"], db_password=db["PASSWORD"]
    )
    conn = psycopg2.connect(conn_string)
    cur = conn.cursor()
    try:
        cur.execute(query)
        if returnable:
            return cur.fetchall()
        if commit:
            conn.commit()
        return None
    finally:
        cur.close()
        conn.close()


def gdal_band_subset(infile, bands, dst_filename, dst_format="GTiff"):
    """
    Create a new raster image containing only the specified bands from input image
    **NOTE: numpy must be installed before GDAL to use the ReadAsArray, WriteArray methods
    :param infile: inpur raster image
    :param bands: list of bands in input image to copy
    :param dst_filename: destination image filename
    :param dst_format: destination image format (default is GTiff)
    :param nodata: NoDataValue for raster bands (default is None
    """
    ds = gdal.Open(infile)
    driver = gdal.GetDriverByName(dst_format)
    driver.Register()
    band = bands[0]
    out_ds = driver.Create(dst_filename, ds.RasterXSize, ds.RasterYSize, len(bands),
                           ds.GetRasterBand(band).DataType)
    out_ds.SetGeoTransform(ds.GetGeoTransform())


    try:
        for idx, band_num in enumerate(bands):
            inband = ds.GetRasterBand(band_num).ReadAsArray()
            outBand = out_ds.GetRasterBand(idx+1)
            outBand.WriteArray(inband)
            inband = None
            outBand = None

    finally:
        band = None
        inband = None
        outBand = None
        ds = None
        out_ds = None


