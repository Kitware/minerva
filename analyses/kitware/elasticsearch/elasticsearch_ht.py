from elasticsearch import Elasticsearch
from girder_client import GirderClient
import ConfigParser
import hashlib
import json
import os
from romanesco.utils import tmpdir
from bson import json_util

def query_elasticsearch(query=query):
    es = Elasticsearch([elastic_url])

    return es.search(index=elastic_index,
                     body={
                         'query': {
                             'filtered': {
                                 'query': {
                                     'match': {
                                         '_all': query
                                     }
                                 },
                                 'filter':  {
                                     'bool':    {
                                         'must_not': [
                                             {
                                                 'missing': {
                                                     'field': 'latitude'
                                                 }
                                             },
                                             {
                                                 'missing': {
                                                     'field': 'longitude'
                                                 }
                                             },
                                             {
                                                 'missing': {
                                                     'field': 'posttime'
                                                 }
                                             }
                                         ]
                                     }
                                 }
                             }
                         }
                     },
                     fields='id,latitude,longitude',
                     size=2000)


def store_results_as_dataset(results):
    client = GirderClient(host, port)
    client.token = token

    user = client.get('user/me')
    parameters = {
        'userId': user['_id']
    }
    dataset_folder = client.get('minerva_dataset/folder',
                                parameters=parameters)['folder']

    # Store the results in a file, and upload them
    with tmpdir(cleanup=True) as output_dir:
        outfilename = 'query_results_%s.json' % hashlib.md5(query).hexdigest()

        with open(os.path.join(output_dir, outfilename), 'wb') as outfile:
            outfile.write(json_util.dumps(results))

        output_item = client.createItem(dataset_folder['_id'],
                                        outfilename,
                                        outfilename)

        client.uploadFileToItem(output_item['_id'],
                                os.path.join(output_dir, outfilename))

        client.post('minerva_dataset/%s/dataset' % output_item['_id'])


query_results = query_elasticsearch(query)
store_results_as_dataset(query_results)

query_results = json.dumps(query_results)
