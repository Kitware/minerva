import pymongo
import tangelo
import bson.json_util

def stream():
    mongo = pymongo.MongoClient().ebola.minerva
    start = 0
    while True:
        result = mongo.find(skip=start, limit=100)
        count = result.count(with_limit_and_skip=True)
        tangelo.log("EBOLA", "start: %d" % (start))
        tangelo.log("EBOLA", "count: %d" % (count))
        start += count
        yield bson.json_util.dumps(list(result))
