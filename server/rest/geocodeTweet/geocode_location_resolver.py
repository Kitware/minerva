# -*- coding: utf-8 -*-
from hose_util import lookup, get_date1, get_date
#from generic_funs import gen_funs, geo_check_tweet
import re
import logging
logging.basicConfig(level = logging.INFO)
logger = logging.getLogger(__name__)
from carmen_properties import *
from carmen_utils import *
import math

class LengthUnit:
    KILOMETER = 0
    MILE = 1

class GeocodeLocationResolver(object):
    def __init__(self):
        self.locationMap = dict()
        self.cellSize = 100
        self.maxDistance = CarmenProperties["geocode_max_distance"]

    def distance(self, point1, point2, unit):
        return self.distanceInRadians(point1, point2) * self.getEarthRadius(unit)

    def distanceInRadians(self, point1, point2):
        lat1R = math.radians(point1[0])
        lat2R = math.radians(point2[0])
        dLatR = abs(lat2R - lat1R)
        dLngR = abs(math.radians(point2[1] - point1[1]))
        a = math.sin(dLatR / 2) * math.sin(dLatR / 2) + math.cos(lat1R) * \
            math.cos(lat2R) * math.sin(dLngR / 2) * math.sin(dLngR / 2)
        return 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    def getEarthRadius(self, unit):
        earthRadius = 6356.9
        if unit == LengthUnit.KILOMETER:
            return earthRadius
        else:
            return earthRadius * 0.621371

    def resolveLocation(self, tweet):
        givenLatLong = Utils.getLatLngFromTweet(tweet)
        return self.latlng2location(givenLatLong)

    def latlng2location(self, givenLatLong):
        if not givenLatLong:
            return None
        locations = self.getPossibleLocations(givenLatLong)
        closestLocation = None
        closestDistance = 0
        for location in locations:
            latLong = location.getLatLng()
            distanceInMiles = self.distance(givenLatLong, latLong, LengthUnit.MILE)
            if not closestLocation or closestDistance > distanceInMiles:
			closestDistance = distanceInMiles;
			closestLocation = location;
        if closestLocation and closestDistance < self.maxDistance:
            return closestLocation
        return None

    def getPossibleLocations(self, latLong):
        keys = self.getKeys(latLong)
        locationSet = []
        for key in keys:
            if self.locationMap.has_key(key):
                locations = self.locationMap[key]
                for location in locations:
                    locationSet.append(location)
        return locationSet

    def addLocation(self, location):
        if not location.getLatLng():
            return
        latLong = location.getLatLng()
        keys = self.getKeys(latLong)
        for key in keys:
            if not self.locationMap.has_key(key):
                self.locationMap[key] = []
            locations = self.locationMap[key]
            locations.append(location)

    def getKeys(self, latLong):
        latitude = latLong[0] * 100
        longitude = latLong[1] * 100
        shiftSize = self.cellSize  / 2.0
        keys = []
        keys.append('{}&&{}'.format((int) (latitude/self.cellSize),
            (int) (longitude/self.cellSize)));
        keys.append('{}&&{}'.format((int) (latitude+shiftSize/self.cellSize),
            (int) (longitude/self.cellSize)));
        keys.append('{}&&{}'.format((int) (latitude-shiftSize/self.cellSize),
            (int) (longitude/self.cellSize)));
        keys.append('{}&&{}'.format((int) (latitude/self.cellSize),
            (int) (longitude+shiftSize/self.cellSize)));
        keys.append('{}&&{}'.format((int) (latitude/self.cellSize),
            (int) (longitude-shiftSize/self.cellSize)));
        keys.append('{}&&{}'.format((int) (latitude+shiftSize/self.cellSize),
            (int) (longitude+shiftSize/self.cellSize)));
        keys.append('{}&&{}'.format((int) (latitude+shiftSize/self.cellSize),
            (int) (longitude-shiftSize/self.cellSize)));
        keys.append('{}&&{}'.format((int) (latitude-shiftSize/self.cellSize),
            (int) (longitude+shiftSize/self.cellSize)));
        keys.append('{}&&{}'.format((int) (latitude-shiftSize/self.cellSize),
            (int) (longitude-shiftSize/self.cellSize)));
        return keys
