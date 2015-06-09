#!/usr/bin/env python
"""
Filter Streaming API tweets on geolocation and some other stuff
(follower/ing counts, retweets)

Brendan O'Connor (brenocon.com)
"""
import sys, os, re
# sys.path.insert(0,'/h/brendano/proc')
# sys.path.insert(0,'/mal1/brendano/twi/twproc/proc')
# sys.path.insert(0, os.path.join(os.path.dirname(__file__),'../nlp'))
import twokenize
from hose_util import lookup, iterate, json


def ext_latlong(tweet):
    OneCoord = r'([-+]?\d{1,3}\.\d{3,})'
    Separator = r', ?'
    LatLong = re.compile(OneCoord + Separator + OneCoord, re.U)
    geo = lookup(tweet, 'geo')
    if geo and geo['type'] == 'Point':
        lat, lon = geo['coordinates']
        loc_type = 'OFFICIAL'
    else:
        loc = lookup(tweet, 'user.location').strip()
        if loc:
            m = LatLong.search(loc.encode('utf8'))
            if m:
                lat, lon = m.groups()
                loc_type = 'REGEX'
    lat = float(lat); lon = float(lon)
    return (lat,lon), loc_type

def Geo_C(intput):
    OneCoord = r'([-+]?\d{1,3}\.\d{3,})'
    Separator = r', ?'
    LatLong = re.compile(OneCoord + Separator + OneCoord, re.U)

    for raw, tweet in iterate(raw=True, inputList=intput):
      source = lookup(tweet, 'source')
      if "Buoy" in source:
        # print "REJECT BUOY\t" + json.dumps(tweet)
        continue

      n_fol = lookup(tweet, 'user.followers_count') or 0
      n_fri = lookup(tweet, 'user.friends_count') or 0
      if not (n_fol < 1000 and n_fri < 1000):
        # print "REJECT FOLLOWERS\t" + json.dumps(lookup(tweet,'user'))
        continue

      text = lookup(tweet, 'text')
      if not text.strip():
        # print "REJECT NO TEXT\t" + json.dumps(record)
        continue

      lat = None
      lon = None
      orig_str = ""

      loc_type = None

      geo = lookup(tweet, 'geo')
      if geo and geo['type'] == 'Point':
        lat, lon = geo['coordinates']
        loc_type = 'OFFICIAL'
      else:
        loc = lookup(tweet, 'user.location').strip()
        if not loc:
          # print "REJECT NO USERLOC\t" + json.dumps(record)
          continue
        m = LatLong.search(loc.encode('utf8'))
        if not m:
          # print "REJECT NO GEO REGEX\t" + json.dumps(record)
          continue
        lat, lon = m.groups()
        loc_type = 'REGEX'

      lat = float(lat); lon = float(lon)
      if (lat, lon) == (0, 0) or lat < -90 or lat > 90 or lon < -180 or lon > 180:
        # print "REJECT JUNK GEO\t" + json.dumps([lat,lon]) + "\t" + json.dumps(record)
        continue

      # # For our applications we usually want to kill retweets
      if lookup(tweet, 'retweeted_status'):
        # print "REJECT OFFICIAL RT\t" + json.dumps(text)
        continue
      toks = twokenize.tokenize(text)
      if any(tok == 'RT' for tok in toks):
        # print "REJECT TEXT RT\t" + json.dumps(text)
        continue

      # Build a "SmallTweet" format record
      record = {
          'id': lookup(tweet, 'id'),
          'user': lookup(tweet, 'user.screen_name'),
          'date': tweet['created_at_datetime'].strftime("%Y-%m-%dT%H:%M:%S"),
          'text': lookup(tweet, 'text')
      }

      record['lonlat'] = [lon, lat]

      if '\t' in record['user']:
        print >> sys.stderr, "WTF\t" + json.dumps(record)
        continue



      out = [
          # 'GEO ' + loc_type,
#          str(record['id']),
#          record['user'].encode('utf-8'),
#          record['date'].encode('utf-8'),
          str(record['lonlat'][0]) + '+' + str(record['lonlat'][1])
#          record['text'].encode('utf-8')
          # json.dumps(lookup(tweet, 'user.location')),
          # json.dumps(lookup(tweet, 'source')),
          # json.dumps(record),
      ]

#      TempVar = record

#      print '\t'.join(out)

      return '\t'.join(out)


