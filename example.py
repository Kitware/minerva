from tweepy.streaming import StreamListener
from tweepy import OAuthHandler
from tweepy import Stream

import sys
import time
import json
import atexit

# Go to http://dev.twitter.com and create an app.
# The consumer key and secret will be generated for you after
CONSUMER_KEY = ""
CONSUMER_SECRET = ""

# After the step above, you will be redirected to your app's page.
# Create an access token under the the "Your access token" section
ACCESS_KEY = ""
ACCESS_SECRET = ""


class EbolaListener(StreamListener):
    """ A listener handles tweets are the received from the stream.
    This is a basic listener that just prints received tweets to stdout.

    """
    def __init__(self):
        StreamListener.__init__(self)
        self._buffer = []

    def on_data(self, data):
        json_data = json.loads(data)
        if json_data['geo'] is not None:
            self._buffer.append(dict({
                "location": json_data['geo'],
                "text": json_data['text'],
                "created_at": json_data['created_at']
            }))
        return True

    def on_error(self, status):
        print status

    def on_timeout(self):
        sys.stderr.write("Timeout, sleeping for 60 seconds...\n")
        time.sleep(60)
        return

    def getNewTweets(self):
        arr = self._buffer
        self._buffer = []
        return arr

_exit = False


def exitHandler():
    global _exit
    _exit = True

atexit.register(exitHandler)


def stream():
    listn = EbolaListener()
    auth = OAuthHandler(CONSUMER_KEY, CONSUMER_SECRET)
    auth.set_access_token(ACCESS_KEY, ACCESS_SECRET)
    stream = Stream(auth, listn)
    stream.filter(track=['ebola'], async=True)

    while not _exit:
        yield listn.getNewTweets()

    stream.disconnect()
