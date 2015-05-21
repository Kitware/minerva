"""This modules defines geocoding endpoints using the geonames database."""

import sys
import os
import urllib
import time
import tempfile
import zipfile

import numpy as np
from pymongo import MongoClient

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
#    'geonameid': np.uint32,
#    'latitude': np.float64,
#    'longitude': np.float64,
#    'population': np.uint64,
#    'elevation': np.int32,
#    'dem': np.int32,

#: Data types for the columns to optimize import
_types = {
    'geonameid': np.float64,
    'latitude': np.float64,
    'longitude': np.float64,
    'population': np.float64,
    'elevation': np.float64,
    'dem': np.float64,
    'name': np.unicode_,
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

    percent = 100 * float(count) / total
    percent = max(min(percent, 100), 0)

    tock = time.time()
    if _tick is None:
        speed = 0
        _tick = tock
    else:
        speed = float(count) / (tock - _tick)

    if unit:
        msg = '\r%s: %3d%% (%s/s)' % (
            message,
            percent,
            speed_fmt(speed, unit)
        )
    else:
        msg = '\r%s: %3d%%' % (message, percent)

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


def read_geonames(file_name):
    """Read a geonames dump and return a pandas Dataframe."""
    import pandas

    z = zipfile.ZipFile(file_name)

    reader = pandas.read_csv(
        z.open('allCountries.txt'),
        sep='\t',
        error_bad_lines=False,
        names=_columns,
        encoding='utf-8',
        parse_dates=[18],
        skip_blank_lines=True,
        index_col=0,
        chunksize=10000,
        dtype=_types
    )

    data = pandas.DataFrame()
    for i, chunk in enumerate(reader):
        sys.stderr.flush()
        data = data.append(chunk)

        # there are about 10.1 million rows now
        progress_report(
            i, max(i, 1010), 'Reading {}'.format(file_name), 'lines'
        )

    done_report()
    return data

if __name__ == '__main__':
    if len(sys.argv) > 1:
        _allZip = sys.argv[1]

    data_file = _allZip
    if not os.path.exists(_allZip):
        data_file = download_all_countries()

    data = read_geonames(data_file)
