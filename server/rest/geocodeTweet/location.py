# -*- coding: utf-8 -*-
#from generic_funs import gen_funs
import json

class Location:
    county = None
    country = None
    city = None
    state = None
    id = -1
    latitude = 0
    longitude = 0
    url = ''
    twitterId = ''
    isNone = False
    resolutionMethod = None
    knownLocation = False

    def __init__(self, country, state, county, city, latitude, longitude, id, knownLocation):
        self.country = country
        self.state = state
        self.county = county
        self.city = city
        self.id = id
        self.knownLocation = knownLocation
        self.latitude = latitude;
        self.longitude = longitude;

    def __hash__(self):
        return hash(self.getDisplayString())

    def __eq__(self, other):
        return str(self.getDisplayString()) == str(other.getDisplayString())

    def getCountry(self):
        return self.country;

    def getCity(self):
        return self.city

    def getState(self):
        return self.state

    def getCounty(self):
        return self.county;

    def equals(self, location):
        if (self.areEqual(self.city, location.city) and self.areEqual(self.state, location.state) \
            and self.areEqual(self.county, location.county) and self.areEqual(self.country, location.country) \
            and self.isNone == location.isNone):
            return True
        else:
		 return False

    def areEqual(string1, string2):
        if (string1 == ""):
            string1 = None
        if (string2 == ""):
            string2 = None
        if ((string1 == None and string2 != None) or (string1 != None and string2 == None)):
            return False
        elif string1 != None and string2 != None and string1.lower() != string2.lower():
            return False
        return True

    def hashCode(self):
        total = 0;
        if self.city != None:
            total += self.city.lower().hashCode()
        if (self.county != None):
            total += self.county.lower().hashCode()
        if (self.state != None):
            total += self.state.lower().hashCode();
        if (self.country != None):
            total += self.country.lower().hashCode();
        if (self.isNone):
            total += 1
        return total

    def getTwitterId(self):
        return self.twitterId

    def getUrl(self):
        return self.url

    def toString(self):
        sb = []
        if (self.city != None):
            sb.append("city: \"" + self.city + "\",")
        if (self.county != None):
            sb.append("county: \"" + self.county + "\",")
        if (self.state != None):
            sb.append("state: \"" + self.state + "\",")
        if (self.country != None):
            sb.append("country: \"" + self.country + "\",")
        sb.append(" (known:" + self.knownLocation + ", " + self.getId() + ")")
        return ' '.join(sb)

    def getId(self):
        return self.id;

    @staticmethod
    def getNoneLocation():
        location = Location(None, None, None, None, None, None, -1, True)
        location.isNone = True
        return location

    def getDisplayString(self):
        sb = []
        hasOpenParen = False
        if self.city:
            sb.append(self.city + ' (')
            hasOpenParen = True
        if self.county:
            sb.append(self.county)
            if not hasOpenParen:
                sb.append(' (')
                hasOpenParen = True
            else:
                sb.append(' (')
        if self.state:
            sb.append(self.state)
            if not hasOpenParen:
                sb.append(' (')
                hasOpenParen = True
            else:
                sb.append(', ')
        if self.country:
            sb.append(self.country)
            if hasOpenParen:
                sb.append(')')
        return ' '.join(sb)

    def isCountryOrStateOrCounty(self):
        return self.city == None

    def getLatLng(self):
        point = (self.latitude, self.longitude)
        return point

    def containsLocation(self, location):
        while location:
            if self.equals(location):
                return True
            location = LocationResolver.getLocationResolver().getParent(location)
        return False

    def setId(self, id):
        self.id = id

    def isNone(self):
        return self.isNone

    def setUrl(self, url):
        self.url = url

    def setTwitterId(self, twitterId):
        self.twitterId = twitterId

    def setResolutionMethod(self, resolutionMethod):
        self.resolutionMethod = resolutionMethod

    def getResolutionMethod(self):
        return self.resolutionMethod

    def isKnownLocation(self):
        return self.knownLocation

    def setKnownLocation(self, value):
        self.knownLocation = value

    def parseLocation(self, jsonString):
        locationmap = json.loads(jsonString)
        return self.parseLocationFromJsonObj(locationmap)

    @staticmethod
    def parseLocationFromJsonObj(locationmap):
        country = locationmap['country']
        state = locationmap['state']
        county = locationmap['county']
        city = locationmap['city']
        id = locationmap['id']
        latitude = float(locationmap['latitude'])
        longitude = float(locationmap['longitude'])
        return Location(country, state, county, city, latitude, longitude, id, True)

    def createJsonFromLocation(location):
        jsonObject = dict()
        jsonObject['country'] = location.getCountry()
        jsonObject['state'] = location.getState()
        jsonObject['county'] = location.getCounty()
        jsonObject['city'] = location.getCity()
        jsonObject['id'] = location.getId()
        jsonObject['latitude'] = location.getLatLng().getLatitude()
        jsonObject['longitude'] = location.getLatLng().getLongitude()
        if location.getUrl() != None and location.getUrl().length() != 0:
            jsonObject['id'] = location.getId()
        if location.getTwitterId() != None and location.getTwitterId().length() != 0:
            jsonObject['id'] = location.getId()

        return jsonObject
