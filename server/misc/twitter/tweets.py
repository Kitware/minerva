from datetime import datetime
import json
import os

import pymongo
import tweepy

from libs.carmen import get_resolver


dateformat = '%Y-%m-%dT%H:%M:%S'

def datestring_to_epoch(datestring):
    d = datestring
    if not isinstance(d, datetime):
        d = datetime.strptime(datestring, dateformat)
    epoch = int((d - datetime(1970, 1, 1)).total_seconds())
    return epoch

def search(query, pages):
    _mongo = pymongo.MongoClient().minerva[query]

    minerva_twitter_config = json.load(open(
        os.path.join(os.path.dirname(__file__), "twitter.json")
    ))
    auth = tweepy.OAuthHandler(minerva_twitter_config["twitter"]["CONSUMER_KEY"],
                        minerva_twitter_config["twitter"]["CONSUMER_SECRET"])
    auth.set_access_token(minerva_twitter_config["twitter"]["ACCESS_KEY"],
                          minerva_twitter_config["twitter"]["ACCESS_SECRET"])
    api = tweepy.API(auth)

    resolver = get_resolver()
    resolver.load_locations()

    for pageInd, page in enumerate(tweepy.Cursor(api.search, q=query, count=100).pages(pages)):
        for resultInd, result in enumerate(page):
            location = resolver.resolve_tweet(result._json)
            # only store those with geolocation
            if location:
                rec = {
                    "id": result.id_str,
                    "location": location[1].__dict__,
                    "text": result.text,
                    "created_at": datestring_to_epoch(result.created_at)
                }
                _mongo.insert(rec)

if __name__ == '__main__':
    import sys
    search(sys.argv[1], 20)
