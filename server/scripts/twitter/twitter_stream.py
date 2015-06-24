# Requires tweepy (pip install tweepy)
from tweepy.streaming import StreamListener
from tweepy import OAuthHandler
from tweepy import Stream

import os
import sys
import time
import json
import atexit
import pymongo

# A configuration is required for authentication purposes or else
# streaming service won't work.
minerva_twitter_config = json.load(open(
    os.path.join(os.path.dirname(__file__), "twitter.json")
))

class TwitterStreamListener(StreamListener):
    """ A listener handles tweets are the received from the stream.
    This is a basic listener that just prints received tweets to stdout.

    """
    def __init__(self):
        StreamListener.__init__(self)
        self.mongo = pymongo.MongoClient().minerva.tweets
        print "self.mongo ", self.mongo

    def on_data(self, data):
        json_data = json.loads(data)
        retweet_cont = 0
        if 'retweet_cont' in json_data.keys():
            retweet_cont = json_data['retweet_cont']

        rec = {
            "id": json_data['id_str'],
            "location": json_data['geo'],
            "text": json_data['text'],
            "timestamp_ms": json_data['timestamp_ms'],
            "created_at": json_data['created_at'],
            "retweeted" : json_data['retweeted'],
            "retweet_cont" : retweet_cont
        }

        # Insert data in mongodb
        self.mongo.insert(rec)

        return True

    def on_error(self, status):
        print status

    def on_timeout(self):
        sys.stderr.write("Timeout, sleeping for 60 seconds...\n")
        time.sleep(60)
        return

_exit = False

def exitHandler():
    global _exit
    _exit = True

atexit.register(exitHandler)


def stream():
    listn = TwitterStreamListener()
    auth = OAuthHandler(minerva_twitter_config["twitter"]["CONSUMER_KEY"],
                        minerva_twitter_config["twitter"]["CONSUMER_SECRET"])
    auth.set_access_token(minerva_twitter_config["twitter"]["ACCESS_KEY"],
                          minerva_twitter_config["twitter"]["ACCESS_SECRET"])
    stream = Stream(auth, listn)
    stream.filter(track=['ebola'], async=False)

if __name__ == '__main__':
    print "main"
    stream()

