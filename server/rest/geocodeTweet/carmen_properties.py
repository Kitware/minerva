# -*- coding: utf-8 -*-

CarmenProperties = dict()
CarmenProperties['use_place'] = True
CarmenProperties['use_user_string'] = True
CarmenProperties['use_geocodes'] = True
CarmenProperties['use_unknown_places'] = True
CarmenProperties['locations'] = r'resources/locations.json'
CarmenProperties['place_name_mapping'] = r'resources/place_name_mappings.txt'
CarmenProperties['state_names_file'] = r'resources/us_states.txt'
CarmenProperties['country_names_file'] = r'resources/countries.txt'
CarmenProperties['geocode_max_distance'] = 25

class Constants:
    DS_LOCATION_NONE = "NONE"
    PLACE = "place"
    TWEET_USER = "user"
    TWEET_USER_LOCATION = "location"
    COORDINATES = "coordinates"
    NEW_LOCATION_STARTING_INDEX = 1000000

class ResolutionMethod:
    PLACE = 0
    COORDINATES = 1
    USER_LOCATION = 2
