"""This modules extends importing to allow dumping raw json."""

import os

from bson.json_util import dumps as dump_bson
from json import dumps as dump_json
from .import_data import read_geonames


def dump_geonames(chunksize=100000, path='.', basename='geonames',
                  bson=True):
    """Dump the geonames database as json."""
    global ifile
    ifile = 0
    base = os.path.join(os.path.abspath(path), basename)
    if bson:
        dumps = dump_bson
    else:
        dumps = dump_json

    def save_chunk(data, *arg, **kw):
        """Save a chunk of data as a file."""
        global ifile

        fname = base + '_%05i.json' % ifile
        geojson = {
            'type': 'FeatureCollection',
            'features': data
        }

        open(fname, 'w').write(dumps(geojson, default=str))
        ifile += 1

    read_geonames(chunksize=chunksize, handler=save_chunk)


if __name__ == '__main__':
    import sys
    dest = '.'
    if len(sys.argv) > 1:
        dest = sys.argv[1]
    dump_geonames(path=dest)
