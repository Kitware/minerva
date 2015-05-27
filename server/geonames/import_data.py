"""This modules defines geocoding endpoints using the geonames database."""

import sys
import os
import urllib
import time
import tempfile
import zipfile
import json

import numpy as np
from girder.utility.model_importer import ModelImporter

#:  Get from geospatial plugin
GEOSPATIAL_FIELD = 'geo'

#: Put this in settings
_collection_name = 'minerva'
_collection = None
_folder_name = 'geonames'
_folder = None
_user = None

#: Columns in the TSV file for geonames
_columns = [
    'geonameid',
    'name',
    'asciiname',
    'alternatenames',
    'latitude',
    'longitude',
    'feature class',
    'feature code',
    'country code',
    'cc2',
    'admin1 code',
    'admin2 code',
    'admin3 code',
    'admin4 code',
    'population',
    'elevation',
    'dem',
    'timezone',
    'modification date'
]


# Actual types, but need NaN

#: Data types for the columns to optimize import
_types = {
    'geonameid': np.uint32,
    'latitude': np.float64,
    'longitude': np.float64,
    'population': np.object_,
    'elevation': np.object_,
    'dem': np.object_,
    'name': np.str_,
    'asciiname': np.str_,
    'alternatenames': np.str_,  # ascii comma seperated list
    'feature class': np.str_,
    'feature code': np.str_,
    'country code': np.str_,
    'cc2': np.str_,  # comma seperated list of 2 char fields
    'admin1 code': np.str_,
    'admin2 code': np.str_,
    'admin3 code': np.str_,
    'admin4 code': np.str_
}


def _type_or_default(default, typeclass):
    """Return a converter with the given default value."""
    def conv(val):
        try:
            val = float(val)
            if val < np.infty:
                return typeclass(val)
        except Exception:
            return default
    return conv


def _make_tuple(v):
    """Make a tuple out of CSV."""
    v = v.strip()
    if v:
        return tuple(v.split(','))
    else:
        return ()


#: conversion methods for dealing with nullable ints
_converters = {
    'population': _type_or_default(None, np.uint64),
    'elevation': _type_or_default(None, np.int32),
    'dem': _type_or_default(None, np.int32),
    'alternatenames': _make_tuple,
    'cc2': _make_tuple
}

# Set up default paths
#: Current directory
_mypath = os.path.abspath(os.path.dirname(__file__))

#: Path to geonames zip file
_allZip = os.path.join(_mypath, 'allCountries.zip')

#: URL of allCountries.zip
_allUrl = 'http://download.geonames.org/export/dump/allCountries.zip'

_tick = None


def pretty_print(num, suffix):
    """Pretty print a number."""
    for unit in ['', 'K', 'M', 'G', 'T', 'P', 'E', 'Z']:
        if abs(num) < 1024.0:
            return "{:.1f}{} {}".format(num, unit, suffix)
        num /= 1024.0
    return "{:.1f}{} {}".format(num, 'Y', suffix)


def progress_report(count, total, message,
                    unit=None, speed_fmt=pretty_print, stream=sys.stderr):
    """Print a progress message when output to a console."""
    global _tick
    if not stream.isatty():
        return

    if total <= 0:
        stream.write('%s: Unknown size\n')
        return

    percent = 100.0 * float(count) / total
    percent = max(min(percent, 100.9), 0.0)

    tock = time.time()
    if _tick is None:
        speed = 0
        _tick = tock
    else:
        speed = float(count) / (tock - _tick)

    if unit:
        msg = '\r%s: %4.1f%% (%s/s)' % (
            message,
            percent,
            speed_fmt(speed, unit)
        )
    else:
        msg = '\r%s: %4.1f%%' % (message, percent)

    stream.write(msg)
    stream.flush()


def done_report(stream=sys.stderr):
    """End the progress report message."""
    global _tick
    _tick = None
    if stream.isatty():
        stream.write('\n')


def download_all_countries(dest=_allZip, url=_allUrl):
    """Download the geonames data file to the given destination."""
    message = 'Downloading allCountries.zip'
    tmp = os.path.join(tempfile.gettempdir(), 'allCountries.zip')

    try:
        urllib.urlretrieve(
            url,
            tmp,
            lambda nb, bs, fs, url=url: progress_report(
                nb * bs, fs, message, 'b'
            )
        )
        done_report()
        os.rename(tmp, dest)
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)
    return dest


def read_geonames(file_name, collection=None):
    """Read a geonames dump and return a pandas Dataframe."""
    import pandas

    try:
        z = zipfile.ZipFile(file_name)
        f = z.open('allCountries.txt')
    except Exception:  # also try to open as a text file
        f = open(file_name)

    reader = pandas.read_csv(
        f,
        sep='\t',
        error_bad_lines=False,
        names=_columns,
        encoding='utf-8',
        parse_dates=[18],
        skip_blank_lines=True,
        index_col=None,
        chunksize=1000,
        dtype=_types,
        engine='c',
        converters=_converters
    )

    alldata = pandas.DataFrame()
    n = 10200000
    for i, chunk in enumerate(reader):

        i = i * 1000
        alldata = alldata.append(chunk)
        export_chunk_to_girder(chunk)

        progress_report(
            0, n, 'Reading {}'.format(file_name), 'lines'
        )
        if len(alldata) >= 1000:
            # there are about 10.1 million rows now
            progress_report(
                i, max(i, n), 'Reading {}'.format(file_name), 'lines'
            )

    done_report()
    return alldata


def export_chunk_to_girder(data):
    """Export the geonames data to mongo."""
    def is_nan(x):
        """Return true if the value is NaN."""
        if not isinstance(x, float):
            return False
        return not (x <= 0 or x >= 0)

    records = data.to_dict(orient='records')
    # features = []
    # move index to _id for mongo
    for d in records:
        # create a geojson point feature for girder's geospatial plugin
        feature = {
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
            },
            'properties': d

        }

        # remove empty/invalid fields
        for k in _columns:
            val = d.get(k)
            if is_nan(val) or val is None:
                d.pop(k)
            elif k in ('population', 'dem') and val <= 0:
                d.pop(k)

        feature['geometry']['coordinates'] = [
            d.pop('longitude'),
            d.pop('latitude')
        ]
        # features.append(feature)

        export_to_girder(feature)


def export_to_girder(data):
    """Export the geonames data to a girder folder."""
    d = data
    item = ModelImporter.model('item')
    folder = geonames_folder()
    user = get_user()

    name = d['properties']['name']
    desc = ', '.join(d['properties']['alternatenames'])
    try:
        i = item.createItem(
            name=name,
            creator=user,
            folder=folder,
            description=desc
        )
    except Exception:
        sys.stderr.write('Failed to insert item "{}"\n'.format(repr(name)))
        return

    try:
        item.setMetadata(i, d['properties'])
    except Exception:
        sys.stderr.write('Failed to write metadata:\n')
        sys.stderr.write(json.dumps(
            d,
            default=repr,
            indent=4
        ) + '\n')

    try:
        i[GEOSPATIAL_FIELD] = {
            'geometry': data['geometry']
        }
        i = item.updateItem(i)
    except Exception:
        sys.stderr.write('Failed to write geospatial data:\n')
        sys.stderr.write(json.dumps(
            i[GEOSPATIAL_FIELD],
            default=repr,
            indent=4
        ) + '\n')


# move to settings
def get_user():
    """Return the first user in the database."""
    # ^^ i'm a terrible person ^^
    global _user
    if _user is not None:
        return _user

    user = ModelImporter.model('user')
    return user.getAdmins().next()


def minerva_collection(user=None,
                       collection_name=_collection_name,
                       public=False):
    """Return the id of the minerva collection."""
    global _collection
    if _collection is not None and user is not None:
        return _collection

    collection = ModelImporter.model('collection')
    c = collection.findOne({'name': collection_name})

    if user is None:
        user = get_user()

    if c is None:
        # create the collection
        c = collection.createCollection(
            name=collection_name,
            creator=user,
            description='Contains global items for the Minerva plugin',
            public=public
        )
    _collection = c
    return _collection


def geonames_folder(collection=None, folder_name=_folder_name, public=False):
    """Return the folder containing geonames items."""
    global _folder
    if _folder is not None:
        return _folder

    if collection is None:
        collection = minerva_collection(public=public)

    folder = ModelImporter.model('folder')
    f = folder.findOne({
        'name': folder_name,
        'parentId': collection['_id']
    })

    if f is not None:
        folder.remove(f)

    # create the folder
    f = folder.createFolder(
        parent=collection,
        name=folder_name,
        description='Contains the geonames database',
        parentType='collection',
        public=public
    )
    _folder = f

    return f

if __name__ == '__main__':
    if len(sys.argv) > 1:
        _allZip = sys.argv[1]

    data_file = _allZip
    if not os.path.exists(_allZip):
        data_file = download_all_countries()

#    collection = MongoClient()['minerva']['geonames']
#    collection.drop()
#    try:
#        from pymongo import write_concern
#        collection = collection.with_options(
#            write_concern=write_concern.WriteConcern(w=0)
#        )
#    except ImportError:
#        pass

    data = read_geonames(data_file)
