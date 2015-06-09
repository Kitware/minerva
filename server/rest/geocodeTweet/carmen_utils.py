# -*- coding: utf-8 -*-

from carmen_properties import *
from hose_util import lookup

class Utils:

    @staticmethod
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

    @staticmethod
    def load_json_file(f):
        json_data = open(f, 'r')
        data = json.load(json_data, encoding='utf-8')
        return data


    @staticmethod
    def save_to_json_file(data, f):
        f = open(f, "w")
        f.write(json.dumps(data))
        f.close()

    @staticmethod
    def getPlaceFromTweet(tweet):
        if tweet.has_key(Constants.PLACE):
            return lookup(tweet, Constants.PLACE)
        return None

    @staticmethod
    def getUserFromTweet(tweet):
        if tweet.has_key(Constants.TWEET_USER):
            return lookup(tweet, Constants.TWEET_USER)
        return None


    @staticmethod
    def getLocationFromTweet(tweet):
        user = Utils.getUserFromTweet(tweet)
        if user:
            location = lookup(user, Constants.TWEET_USER_LOCATION)
            if location and len(location) > 0:
                return location
        return None

    @staticmethod
    def getLatLngFromTweet(tweet):
        coordinates = lookup(tweet, Constants.COORDINATES)
        if not coordinates:
            return None
        coordinateList = lookup(coordinates, Constants.COORDINATES)
        try:
            longitude = float(coordinateList[0])
            latitude = float(coordinateList[1])
        except:
            return None
        latLng = (latitude, longitude)
        return latLng

    @staticmethod
    def getNullForEmptyString(string):
        if len(string.strip()) == 0:
            return None
        return string

    @staticmethod
    def registerOption(options, option_name, arg_name, has_arg, description):
        pass

