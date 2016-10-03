import json
import os

import pymongo

_mongo = pymongo.MongoClient().minerva_test.tweets
json_tweets = json.load(open(
    os.path.join(os.path.dirname(__file__), "tweets100.json")
))
from datetime import datetime
dateformat = '%Y-%m-%dT%H:%M:%S'

for tweet in json_tweets:
    d = datetime.strptime((tweet['created_at']), dateformat)
    tweet['created_at'] = int((d - datetime(1970,1,1)).total_seconds())
    _mongo.insert(tweet)
