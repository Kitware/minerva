from tweepy.streaming import StreamListener
from tweepy import OAuthHandler
from tweepy import Stream

import tangelo

# Go to http://dev.twitter.com and create an app.
# The consumer key and secret will be generated for you after
CONSUMER_KEY = ""
CONSUMER_SECRET = ""

# After the step above, you will be redirected to your app's page.
# Create an access token under the the "Your access token" section
ACCESS_KEY = ""
ACCESS_SECRET = ""

# Global for now
stream = 0
list_of_tweets = []
new_tweets = []

class StdOutListener(StreamListener):
    """ A listener handles tweets are the received from the stream.
    This is a basic listener that just prints received tweets to stdout.

    """
    def on_data(self, data):
        import json
        json_data = json.loads(data)
        if json_data['geo'] is not None:
            list_of_tweets.append(json_data['geo'])
        #tangelo.log("example tweets", str(json_data['geo']))
        return True

    def on_error(self, status):
        print status

    def on_timeout(self):
        sys.stderr.write("Timeout, sleeping for 60 seconds...\n")
        time.sleep(60)
        return

def stream():
    global stream
    global new_tweets
    listn = StdOutListener()
    auth = OAuthHandler(CONSUMER_KEY, CONSUMER_SECRET)
    auth.set_access_token(ACCESS_KEY, ACCESS_SECRET)
    stream = Stream(auth, listn)
    stream.filter(track=['ebola'], async=True)

    while True:
        new_tweets = list_of_tweets[len(new_tweets):]
        yield new_tweets

    stream.disconnect()

if __name__ == '__main__':
    l = StdOutListener()
    auth = OAuthHandler(CONSUMER_KEY, CONSUMER_SECRET)
    auth.set_access_token(ACCESS_KEY, ACCESS_SECRET)

    stream = Stream(auth, l)
    stream.filter(track=['ebola'])


