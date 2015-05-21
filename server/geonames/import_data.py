"""This modules defines geocoding endpoints using the geonames database."""

import sys
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


def read_geonames(file_name):
    """Read a geonames dump and return a pandas Dataframe."""
    import pandas

    reader = pandas.read_csv(
        file_name,
        sep='\t',
        error_bad_lines=False,
        names=_columns,
        encoding='utf-8',
        parse_dates=[18],
        skip_blank_lines=True,
        index_col=0,
        chunksize=100000,
        dtype=_types
    )

    data = pandas.DataFrame()
    for i, chunk in enumerate(reader):
        sys.stderr.flush()
        # there are about 10.2 million rows now
        percent = 100 * min(i / 102.0, 1.0)
        if sys.stderr.isatty():
            sys.stderr.write('\rReading %s: %3d%%' % (file_name, percent))
        data = data.append(chunk)
    if sys.stderr.isatty():
        sys.stderr.write(' Done.\n')

    return data

if __name__ == '__main__':
    import sys
    print read_geonames(sys.argv[1])
