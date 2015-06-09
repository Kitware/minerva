import os
import json
from hose_util import lookup, get_date1, get_date
import re
import sys
reload(sys)
#sys.setdefaultencoding("utf-8")
root = os.path.dirname(__file__)

OneCoord = r'([-+]?\d{1,3}\.\d{3,})'
Separator = r', ?'
LatLong = re.compile(OneCoord + Separator + OneCoord, re.U)
def geo_check_tweet(tweet):
    geo = lookup(tweet,'geo')
    if geo and geo['type'] == 'Point':
        lat,lon  = geo['coordinates']
        loc_type = 'OFFICIAL'
    else:
        loc = lookup(tweet, 'user.location').strip()
        if not loc:
            #print "REJECT NO USERLOC\t" + json.dumps(record)
            return None
        m = LatLong.search(loc.encode('utf8'))
        if not m:
          #print "REJECT NO GEO REGEX\t" + json.dumps(record)
          return None
        lat,lon = m.groups()
        loc_type = 'REGEX'
    lat=float(lat); lon=float(lon)
    if (lat,lon)==(0,0) or lat < -90 or lat > 90 or lon < -180 or lon > 180:
        #print "REJECT JUNK GEO\t" + json.dumps([lat,lon]) + "\t" + json.dumps(record)
        return None
    else:
        return (lat, lon)


if __name__ == '__main__':
    pass

