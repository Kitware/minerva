import pymongo
import tangelo
import bson.json_util

def stream():
    mongo = pymongo.MongoClient().ebola.minerva
    start = 0
    while True:
        result = mongo.find(skip=start, limit=100)
        start += 100
        yield bson.json_util.dumps(list(result))