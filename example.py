from tweepy.streaming import StreamListener
from tweepy import OAuthHandler
from tweepy import Stream

# Go to http://dev.twitter.com and create an app.
# The consumer key and secret will be generated for you after
CONSUMER_KEY = "rVmnHgHtrLXmHnJr8T65z2OWk"
CONSUMER_SECRET = "yyudgba18o7tM3QVaqJB9wRmR4gtsGq6tgBAUkS610vHyzsIfz"

# After the step above, you will be redirected to your app's page.
# Create an access token under the the "Your access token" section
ACCESS_KEY = "2411460356-2LWQfF1w522J2G5nCXs2oxGYmJfoJsKrBBNaTG0"
ACCESS_SECRET = "RZXKoS5aiGlykxRYKKfQbxSHZ3eMRrQZMh0OMZKNjIlpS"

# Global for now
list_of_tweets = []

class StdOutListener(StreamListener):
    """ A listener handles tweets are the received from the stream.
    This is a basic listener that just prints received tweets to stdout.

    """
    def on_data(self, data):
        import json
        json_data = json.loads(data)
        if json_data['geo'] is not None:
            list_of_tweets.append(json_data['geo'])
            print json_data['geo']
        return True

    def on_error(self, status):
        print status

def stream():
    yield list_of_tweets

if __name__ == '__main__':
    l = StdOutListener()
    auth = OAuthHandler(CONSUMER_KEY, CONSUMER_SECRET)
    auth.set_access_token(ACCESS_KEY, ACCESS_SECRET)

    stream = Stream(auth, l)
    stream.filter(track=['ebola'])
