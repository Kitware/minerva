import tangelo

def stream():
    print "stream 1"
    listn = EbolaListener()
    auth = OAuthHandler(minerva_ebola_config["twitter"]["CONSUMER_KEY"],
                        minerva_ebola_config["twitter"]["CONSUMER_SECRET"])
    auth.set_access_token(minerva_ebola_config["twitter"]["ACCESS_KEY"],
                          minerva_ebola_config["twitter"]["ACCESS_SECRET"])
    stream = Stream(auth, listn)
    stream.filter(track=['ebola'], async=False)
    print "stream 2"

    # while not _exit:
    #     yield listn.getNewTweets()

    #stream.disconnect()