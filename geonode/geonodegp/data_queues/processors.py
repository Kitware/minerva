import csv
from ftplib import FTP
import glob
import json
import logging
import urllib
from geoserver.catalog import Catalog
import os
import datetime
import struct
import re
from time import sleep
from geopy.exc import GeocoderQuotaExceeded
import requests
from bs4 import BeautifulSoup as bs
from geopy.geocoders import GoogleV3
from pymongo import MongoClient, GEOSPHERE
from geonodegp.settings import GPM_ACCOUNT, GS_DATA_DIR, HEALTHMAP_AUTH, MONGODB
from geonodegp.data_queues.csv_helpers import UnicodeWriter, UnicodeReader
from geonodegp.data_queues.helpers import get_band_count, gdal_translate, cdo_invert, postgres_query, ogr2ogr_exec
from geonodegp.settings import DEFAULT_WORKSPACE
from geonode.geoserver.helpers import ogc_server_settings, OGC_Servers_Handler
from geonode.geoserver.management.commands.updatelayers import Command as UpdateLayersCommand
import shutil

logger = logging.getLogger("geonodegp.data_queues.processors")

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


class SPIEProcessor(GeoDataProcessor):
    """
    Class for processing data from the SPEI Global Drought Monitor
    (http://sac.csic.es/spei/map/maps.html)
    """
    prefix = "spei"
    spei_files = ('spei01', 'spei03')
    base_url = "http://notos.eead.csic.es/spei/nc/"

    def run(self):
        """
        Retrieve and process all SPEI image files listed in the SPEIProcess object's spei_files property.
        """
        for file in self.spei_files:
            self.download("{}{}.nc".format(self.base_url, file))
            tif_file = "{}.tif".format(file)
            cdo_transform = cdo_invert(os.path.join(self.tmp_dir, file))
            band = get_band_count(cdo_transform)
            gdal_translate(cdo_transform, os.path.join(self.tmp_dir, tif_file),
                           bands=[band], projection='EPSG:4326')
            self.post_geoserver(tif_file, file)
            #self.update_geonode(file)
            self.truncate_gs_cache(file)
            self.cleanup()


class USGSQuakeProcessor(GeoDataProcessor):
    """
    Class for retrieving and processing the latest earthquake data from USGS.
    """

    tables = ("quakes_weekly", "quakes_monthly", "quakes_yearly", "quakes_archive")

    def purge_old_data(self):
        """
        Remove old data from weekly, monthly, and yearly PostGIS tables
        """
        today = datetime.date.today()
        last_week = (today - datetime.timedelta(days=7)).strftime("%s000")
        last_month = (today - datetime.timedelta(days=30)).strftime("%s000")
        last_year = (today - datetime.timedelta(days=365)).strftime("%s000")

        for interval, table in zip([last_week, last_month, last_year], self.tables):
            postgres_query("DELETE FROM {} where CAST(time as numeric) < {};".format(table, interval), commit=True)

    def run(self):
        """
        Retrieve the latest USGS earthquake data and append to all PostGIS earthquake tables, then remove old data
        :return:
        """
        rss = self.download("http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson")
        db = ogc_server_settings.datastore_db
        for table in self.tables:
            ogr2ogr_exec("-append -skipfailures -f PostgreSQL \
                \"PG:host={db_host} user={db_user} password={db_pass} dbname={db_name}\" \
                {rss} -nln {table}".format(db_host=db["HOST"], db_user=db["USER"], db_pass=db["PASSWORD"],
                                           db_name=db["NAME"], rss="{}".format(os.path.join(self.tmp_dir, rss)),
                                           table=table))
            self.truncate_gs_cache(table)
        self.purge_old_data()


class HealthMapProcessor(GeoDataProcessor):
    """
    Retrieve latest data from Healthmap for a given API account
    and update the relevant collection in a Mongo database
    """

    base_url = "http://www.healthmap.org/HMapi.php?auth={}&".format(HEALTHMAP_AUTH)
    collection = 'healthmap90days'
    dbname = MONGODB['NAME']

    healthmap_params = {}
    prefix = "healthmap90days"

    def __init__(self, *args, **kwargs):
        for key in kwargs.keys():
            if key == 'collection':
                self.collection = kwargs['collection']
            else:
                self.healthmap_params[key] = kwargs.get(key)
        self.tmp_collection = 'tmp_{}'.format(self.collection)

        if 'sdate' not in self.healthmap_params:
            today = datetime.date.today()
            self.healthmap_params['sdate'] = (today - datetime.timedelta(days=90)).strftime("%Y-%m-%d")

        super(HealthMapProcessor, self).__init__(*args)


    def init_db(self, db):
        """
        Initiate the pubmed collection with indices if it doesn't exist yet
        :param db: The Mongo database object to create the collection in
        :return: None
        """
        for coll in [self.collection, self.tmp_collection, 'hmalternate']:
            if coll not in db.collection_names():
                db.create_collection(coll)
                db[coll].create_index("country")
                db[coll].create_index("place_name")
                db[coll].create_index([("the_geom", GEOSPHERE)])

    def download(self, url, filename=None):
        """
        Retrieve HealthMap JSON
        :param url: The URL to download from
        :param username: Required username?
        :param password: Required password?
        :return: Name of the downloaded file (not including path).
        """
        return super(HealthMapProcessor, self).download(url + urllib.urlencode(self.healthmap_params),
                                                        filename=filename)


    def update_db(self, filename):
        client = MongoClient(host=MONGODB['HOST'], port=MONGODB['PORT'])
        db = client[self.dbname]
        tmp_collection = db[self.tmp_collection]
        tmp_collection.drop()
        self.init_db(db)
        alerts = []
        with open(os.path.join(self.tmp_dir, filename)) as jsonfile:
            jsondata = json.loads(jsonfile.read())
            for item in jsondata:
                for alert in item['alerts']:
                    alert['country'] = item['country']
                    alert['place_name'] = item['place_name']
                    alert['lat'] = float(item['lat'])
                    alert['lng'] = float(item['lng'])
                    alert['country_id'] = item['country_id']
                    alert['the_geom'] = {
                        'type': 'Point',
                        'coordinates': [alert['lng'], alert['lat']]
                    }
                    alerts.append(alert)
        alerts_json = json.loads(json.dumps(alerts))


        results = tmp_collection.insert_many(alerts_json)
        logger.info("Inserted into {}: {}".format(self.tmp_collection, results.inserted_ids))
        if len(results.inserted_ids) > 0:
            delete_name = '{}_delete'.format(self.collection)
            try:
                db[self.collection].rename(delete_name)
                tmp_collection.rename(self.collection)
                db[delete_name].drop()
            except Exception as e:
                if delete_name in db.collection_names():
                    db[delete_name].rename(db[self.collection])
                raise

    def run(self):
        output_file = self.download(self.base_url, filename='{}.json'.format(self.prefix))
        self.update_db(output_file)
        self.update_geonode(self.prefix)
        self.truncate_gs_cache(self.prefix)
        self.cleanup()


class GDACSProcessor(GeoDataProcessor):
    """
    Class for processing data from the Global Disaster Alerts & Coordination System website
    (http://gdacs.org/)
    """

    tables = ("gdacs_alerts",)

    def run(self):
        today = datetime.date.today()
        last_week = (today - datetime.timedelta(days=7)).strftime("%Y-%m-%d")
        today = today.strftime("%Y-%m-%d")

        rss = self.download("http://www.gdacs.org/rss.aspx?profile=ARCHIVE&from={}&to={}".format(
            last_week, today), filename="gdacs.rss")

        db = ogc_server_settings.datastore_db

        for table in self.tables:
            ogr2ogr_exec("-append -skipfailures -f PostgreSQL \
                \"PG:host={db_host} user={db_user} password={db_pass} dbname={db_name}\" \
                {rss} -nln {table}".format(db_host=db["HOST"], db_user=db["USER"], db_pass=db["PASSWORD"],
                                           db_name=db["NAME"], rss="{}".format(os.path.join(self.tmp_dir, rss)),
                                           table=table))
            self.truncate_gs_cache(table)


class GPMProcessor(GeoDataMosaicProcessor):
    """
    Class for processing the latest NASA IMERG Rainfall estimates combining data
    from all passive-microwave instruments in the GPM Constellation.  Uses the 'early'
    (possibly less accurate) images for most timely information (generated within 6-8
    hours of observation).
    """

    base_url = "jsimpson.pps.eosdis.nasa.gov"
    layername_prefix = 'nasa_gpm_'
    prefix = '3B-HHR-E.MS.MRG.3IMERG.'
    layer_name = 'nasa_gpm_24hr'
    archive_hours = ("T12:00:00.000Z", "T12:30:00.000Z")

    def download(self, filename=None, auth_account=GPM_ACCOUNT, tmp_dir="/tmp", days=1):

        ftp = FTP(self.base_url)
        ftp.login(auth_account, auth_account)
        ftp.cwd('/NRTPUB/imerg/gis/early')

        file_list = ftp.nlst()

        pattern = '.+\.1day\.tif' if days == 1 else '.+\-S120000\-.+\.1day\.tif'

        re_1day = re.compile(pattern)

        files = sorted([x for x in file_list if re_1day.search(x)])[-days:]

        for file_1day in files:
            with open(os.path.join(self.tmp_dir, file_1day), 'wb') as outfile:
                ftp.retrbinary('RETR %s' % file_1day, outfile.write)

            tfw_file = file_1day.replace('.tif', '.tfw')
            with open(os.path.join(self.tmp_dir, tfw_file), 'wb') as outfile:
                ftp.retrbinary('RETR %s' % tfw_file, outfile.write)

        return files

    def parse_name(self, tifname):
        name_subs = re.search('IMERG\.(\d{8}-S\d{6}).+\.(3hr|30min|1day)\.tif', tifname)
        imgtime = datetime.datetime.strptime(name_subs.group(1), "%Y%m%d-S%H%M%S")
        imgstrtime = imgtime.strftime("%Y-%m-%d %H:00")
        layer_title = "NASA Global Precipitation Estimate ({}) - {} UTC".format(name_subs.group(2), imgstrtime)
        return layer_title, imgtime

    def run(self, days=1):

        tifs = self.download(days=days)

        for tif_file in tifs:
            layer_title, imgtime = self.parse_name(tif_file)

            time_format = imgtime.strftime('%Y%m%dT%H0000000Z')
            tif_out = "{prefix}_{time}.tif".format(
                    prefix=self.layer_name,
                    time=time_format)

            # Use gdal_translate to embed projection info
            gdal_translate(os.path.join(self.tmp_dir, tif_file), os.path.join(self.tmp_dir, tif_out),
                           nodata=0, projection="EPSG:4326")

            dst_file = self.data_dir.format(gsd=GS_DATA_DIR, ws=self.workspace, layer=self.layer_name, file=tif_out)
            if dst_file.endswith('.tif'):
                os.rename(os.path.join(self.tmp_dir, tif_out), dst_file)
                self.post_geoserver(dst_file, self.layer_name)

        layer_title, imgtime = self.parse_name(tifs[-1])
        self.drop_old_hourly_images(imgtime, self.layer_name)
        self.drop_old_daily_images(imgtime, self.layer_name)

        self.update_geonode(self.layer_name, title=layer_title,
                            bounds=('-180.0', '180.0', '-90.0', '90.0', 'EPSG:4326'))
        self.truncate_gs_cache(self.layer_name)
        self.cleanup()


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
        if dst_file.endswith('.tif'):
            shutil.copy2(os.path.join(self.tmp_dir, tif_file), dst_file)
            self.post_geoserver(dst_file, self.layer_name)

        self.drop_old_hourly_images(now, self.layer_name)
        self.drop_old_daily_images(now, self.layer_name)

        self.update_geonode(self.layer_name, title=self.parse_name(now),
                            bounds=('-180.0', '180.0', '-90.0', '90.0', 'EPSG:4326'))
        self.truncate_gs_cache(self.layer_name)
        self.cleanup()


class NYVehicleCollisionsProcess(GeoDataProcessor):
    """
    Download full csv from site

    Find latest date/time of previously imported data if any

    Iterate through each row
        If date/time > last imported date:
            if latitude and longitude:
                dump into new good csv
            else if on street or cross street or off street:
                dump into geocoding csv
            else:
                dump into bad csv

    For each record in geocoding csv up to API limit:
        Use geopy to find location based on streets
            if found:
                append to good csv
                remove from geocoding csv
            else:
                dump into bad csv

    Use ogr2ogr to load good csv into DB
    """
    prefix = "nyc_vehicle_collisions"
    base_url = 'https://data.cityofnewyork.us/api/views/h9gi-nx95/rows.csv?accessType=DOWNLOAD'
    last_date = None
    csv_dl = prefix + '_download.csv'
    csv_up = prefix + '_upload.csv'
    csv_gc = prefix + '_geocode.csv'
    csv_bd = prefix + '_bad.csv'
    csv_tmp = prefix + '_tmp.csv'
    layer_name = prefix
    date = None
    fieldnames = None
    ON_ST = 'ON STREET NAME'
    OFF_ST = 'OFF STREET NAME'
    CROSS_ST = 'CROSS STREET NAME'

    vrt_content = (
"""<OGRVRTDataSource>
    <OGRVRTLayer name="{name}">
        <SrcDataSource>{dir}/{name}.csv</SrcDataSource>
        <GeometryType>wkbPoint</GeometryType>
        <LayerSRS>WGS84</LayerSRS>
        <GeometryField encoding="PointFromColumns" x="LONGITUDE" y="LATITUDE"/>
    </OGRVRTLayer>
</OGRVRTDataSource>
""")

    def __init__(self, *args, **kwargs):
        super(NYVehicleCollisionsProcess, self).__init__(*args, **kwargs)
        vrt_file = os.path.join(self.tmp_dir, self.csv_up.replace('.csv', '.vrt'))
        if not os.path.exists(vrt_file):
            with open(vrt_file, 'w') as vrt:
                vrt.write(self.vrt_content.format(name=self.csv_up.replace(".csv", ""), dir=self.tmp_dir))
        if 'date' in kwargs:
            self.date = kwargs['date']

    def process_dl_rows(self):
        csv_file = open(os.path.join(self.tmp_dir, self.csv_dl), 'r')
        csv_upload = open(os.path.join(self.tmp_dir, self.csv_up), 'w')
        csv_geocode = open(os.path.join(self.tmp_dir, self.csv_gc), 'a')
        csv_bad = open(os.path.join(self.tmp_dir, self.csv_bd), 'a')
        try:
            csv_input_reader = csv.DictReader(csv_file)
            self.fieldnames = csv_input_reader.fieldnames
            csv_upload_writer = csv.DictWriter(csv_upload, fieldnames=self.fieldnames)
            csv_geocode_writer = csv.DictWriter(csv_geocode, fieldnames=self.fieldnames)
            csv_bad_writer = csv.DictWriter(csv_bad, fieldnames=self.fieldnames)
            for row in csv_input_reader:
                #05/18/2015,14:20
                rowtime = datetime.datetime.strptime("{} {}".format(row['DATE'], row['TIME']),
                                                     "%m/%d/%Y %H:%M")
                if self.date is None or self.date >= rowtime:
                    if row['LATITUDE'] and row['LONGITUDE']:
                        csv_upload_writer.writerow(row)
                    elif row[self.ON_ST] or row[self.CROSS_ST] or row[self.OFF_ST]:
                        csv_geocode_writer.writerow(row)
                    else:
                        csv_bad_writer.writerow(row)
        finally:
            csv_file.close()
            csv_upload.close()
            csv_geocode.close()
            csv_bad.close()

    def geocode_rows(self):
        if not self.fieldnames:
            csv_file = open(os.path.join(self.tmp_dir, self.csv_dl), 'r')
            try:
                csv_input_reader = csv.DictReader(csv_file)
                self.fieldnames = csv_input_reader.fieldnames
            finally:
                csv_file.close()
        csv_geocode = open(os.path.join(self.tmp_dir, self.csv_gc), 'r')
        csv_upload = open(os.path.join(self.tmp_dir, self.csv_up), 'a')
        csv_geocoder_new = open(os.path.join(self.tmp_dir, self.csv_tmp), 'w')
        csv_bad = open(os.path.join(self.tmp_dir, self.csv_bd), 'a')
        try:
            csv_geocode_reader = csv.DictReader(csv_geocode, fieldnames=self.fieldnames)
            csv_geocode_writer = csv.DictWriter(csv_geocoder_new, fieldnames=self.fieldnames)
            csv_bad_writer = csv.DictWriter(csv_bad, fieldnames=self.fieldnames)
            csv_upload_writer = csv.DictWriter(csv_upload, fieldnames=self.fieldnames)
            geocoder = GoogleV3()
            failure = False
            for row in csv_geocode_reader:
                address = None
                if not failure:
                    if row[self.ON_ST] and row[self.CROSS_ST]:
                        address = '{},{}'.format(row[self.ON_ST], row[self.CROSS_ST])
                    elif row[self.ON_ST] and row[self.OFF_ST]:
                        address = '{},{}'.format(row[self.ON_ST], row[self.OFF_ST])
                    elif row[self.ON_ST]:
                        address = row[self.ON_ST]
                    elif row[self.OFF_ST]:
                        address = row[self.OFF_ST]
                    try:
                        loc = geocoder.geocode(address, exactly_one=True, bounds=[40.461540, -74.494492,
                                                                                  41.084491, -73.486496])
                        if loc:
                            row['LONGITUDE'] = loc.longitude
                            row['LATITUDE'] = loc.latitude
                            csv_upload_writer.writerow(row)
                        else:
                            csv_bad_writer.writerow(row)
                        sleep(3)
                    except Exception as e:
                        failure = True
                        csv_geocode_writer.writerow(row)
                        pass
                else:
                    csv_geocode_writer.writerow(row)
            if failure:
                csv_geocode.close()
                csv_geocoder_new.close()
                os.rename(csv_geocoder_new.name, csv_geocode.name)

        finally:
            csv_geocode.close()
            csv_upload.close()
            csv_geocoder_new.close()
            csv_bad.close()

    def run(self):
        self.download(self.base_url, filename=self.csv_dl)
        self.process_dl_rows()
        self.geocode_rows()
        db = ogc_server_settings.datastore_db
        ogr2ogr_exec("-append -skipfailures -f PostgreSQL \
            \"PG:host={db_host} user={db_user} password={db_pass} dbname={db_name}\" \
            {csv} -nln {table}".format(db_host=db["HOST"], db_user=db["USER"], db_pass=db["PASSWORD"],
                                       db_name=db["NAME"], csv="{}".format(os.path.join(self.tmp_dir, self.csv_up)),
                                       table=self.layer_name))

        #self.update_geonode(self.layer_name)



class ChinaPollutionIPEProcessor(GeoDataProcessor):

    prefix = "cn_pollution"
    years = [x for x in xrange(2006,2016)]
    valleys = ["{0:02d}".format(v) for v in xrange(1, 11)]
    types = {0: "cn_pollution_corps_supervision",
            1: "cn_pollution_monitored_enterprises"}
    base_url = ("http://www.ipe.org.cn/pollution/ajax/getpoints.ashx?" +
        "isEn=1&name=&year={year}&space=&type={type}&valley={valley}&itemtype=0" +
        "&swLat=&swLng=&neLat=&neLng=&zoom=4&showcount=1000")

    vrt_content = (
"""<OGRVRTDataSource>
    <OGRVRTLayer name="{name}">
        <SrcDataSource>{dir}/{name}.csv</SrcDataSource>
        <GeometryType>wkbPoint</GeometryType>
        <LayerSRS>WGS84</LayerSRS>
        <GeometryField encoding="PointFromColumns" x="lng" y="lat"/>
    </OGRVRTLayer>
</OGRVRTDataSource>
""")


    def download(self):
        for type in self.types:
            keys = None
            item_set = set()
            for year in self.years:
                for valley in self.valleys:
                    url = self.base_url.format(year=year, valley=valley, type=type)
                    print url
                    r = requests.get(url)
                    data = json.loads(r.content)

                    for idx, item in enumerate(data.items()[1][1]):
                        if not keys:
                            try:
                                keys = data.items()[1][1][0].keys()
                            except:
                                print "==========================", data.items()[1][1]
                        item['emissionyears'] = ','.join(item['emissionyears'])
                        item['years'] = ','.join(item['years'])
                        item_sorted = tuple([unicode(item[key]) for key in sorted(keys)])
                        if float(item['lng']) >= 74.0 and float(item['lat']) <= 55.0:
                            item_set.add(item_sorted)

            csv_file = os.path.join(self.tmp_dir, self.types[type] + '.csv')
            with open(csv_file, 'w') as out:
                uniwriter = UnicodeWriter(out)
                uniwriter.writerow(sorted(keys))
                for item in item_set:
                    uniwriter.writerow(list(item))
            with open(csv_file.replace('.csv', '.vrt'), 'w') as vrt:
                vrt.write(self.vrt_content.format(name=self.types[type], dir=self.tmp_dir))
        return ("{}.vrt".format(name) for name in self.types.values())

    def run(self):
        db = ogc_server_settings.datastore_db
        for vrt in self.download():
            vrtfile = os.path.join(self.tmp_dir, vrt)
            ogr2ogr_exec('-overwrite -skipfailures -f PostgreSQL -a_srs EPSG:4326 ' +
                '"PG:host={db_host} user={db_user} password={db_pass} dbname={db_name}" {vrt} -nln {table}'.format(
                    db_host=db["HOST"], db_user=db["USER"], db_pass=db["PASSWORD"], db_name=db["NAME"],
                    vrt=vrtfile, table=vrt.rstrip(".vrt")))


class EmpresMERSProcessor(GeoDataProcessor):
    base_url = "http://empres-i.fao.org/eipws3g/report?filename=Outbreak%5Flist4384592634278746302%2Ecsv"
    prefix = "mers_empres"
    vrt_content = (
"""<OGRVRTDataSource>
    <OGRVRTLayer name="{name}">
        <SrcDataSource>{dir}/{name}.csv</SrcDataSource>
        <GeometryType>wkbPoint</GeometryType>
        <LayerSRS>WGS84</LayerSRS>
        <GeometryField encoding="PointFromColumns" x="Longitude" y="Latitude"/>
    </OGRVRTLayer>
</OGRVRTDataSource>
""")

    def download(self, url, filename=None):
        tmp_file = "tmp_mers.csv"
        data = []
        dl_file = super(EmpresMERSProcessor, self).download(url, filename=tmp_file)
        with open(os.path.join(self.tmp_dir, dl_file), 'r') as infile:
            unireader = UnicodeReader(infile)
            for item in unireader:
                if not data:
                    for idx in range(len(item)):
                        item[idx] = item[idx].replace(" ", "_")
                    data.append(item)
                else:
                    data.append(item)
        csv_file = os.path.join(self.tmp_dir, filename)
        with open(csv_file, 'w') as out:
            uniwriter = UnicodeWriter(out)
            for item in data:
                uniwriter.writerow(item)

    def generate_vrt(self):
        vrt_file = os.path.join(self.tmp_dir, self.prefix + ".vrt")
        vrt_content = self.vrt_content.format(dir=self.tmp_dir, name=self.prefix)
        if not os.path.exists(vrt_file):
            with open(vrt_file, 'w') as vrt:
                vrt.write(vrt_content)
        return vrt_file

    def run(self):
        self.download(self.base_url, filename="{}.csv".format(self.prefix))
        vrtfile = self.generate_vrt()
        db = ogc_server_settings.datastore_db
        ogr2ogr_exec('-overwrite -skipfailures -f PostgreSQL -a_srs EPSG:4326 ' +
            '"PG:host={db_host} user={db_user} password={db_pass} dbname={db_name}" {vrt} -nln {table}'.format(
                db_host=db["HOST"], db_user=db["USER"], db_pass=db["PASSWORD"], db_name=db["NAME"],
                vrt=vrtfile, table=self.prefix))
        #self.update_geonode(self.prefix)
        self.cleanup()


class ThreatRiskProcessor(GeoDataProcessor):
    prefix = 'malaria_risk_dynamic'



if __name__ == '__main__':
    fio = ForecastIOAirTempProcessor()
    fio.run()
    # gpm = GPMProcessor()
    # gpm.run(days=5)
    # chi = ChinaPollutionIPEProcessor()
    # chi.run()
    #nyv = NYVehicleCollisionsProcess()
    #nyv.run()
    # mers = EmpresMERSProcessor()
    # mers.run()
    # hmp = HealthMapProcessor()
    # hmp.run()

