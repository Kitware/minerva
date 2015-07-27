import os
import json
#import glob
import argparse
import romanesco

from girder_client import GirderClient

def import_analyses(client, analyses_path):
    # First get the minerva analysis folder
    minerva_analyses_folder = client.get('/minerva_analysis/folder')

    if not minerva_analyses_folder['folder']:
        minerva_analyses_folder = client.post('/minerva_analysis/folder')

    minerva_analyses_folder = minerva_analyses_folder['folder']

    # look for specific analysis subfolders
    # e.g. analyses/bsve

    for analysis_subfolder in os.listdir(analyses_path):
        analysis_path = os.path.join(analyses_path, analysis_subfolder)

        # If there is an analysis.json, it is a Romanesco analysis
        romanesco_analysis = os.path.join(analysis_path, 'analysis.json')
        romanesco_metadata = {}
        if os.path.exists(romanesco_analysis):
            analysis = romanesco.load(romanesco_analysis)
            analysis_name = analysis['name']
            romanesco_metadata['analysis'] = analysis
        else:
            # set the analysis name based on folder structure
            analysis_name = '_'.join((analysis_path.split('/'))[-2:])

        # See if we already have an analysis with that name
        items = client.listItem(minerva_analyses_folder['_id'], analysis_name)

        if len(items) == 0:
            analysis_item = client.createItem(minerva_analyses_folder['_id'], analysis_name, analysis_name)
        elif len(items) > 1:
            raise Exception('More than one item found with name: %s' % analysis_name)
        else:
            analysis_item = items[0]

        # Set the minerva metadata
        if romanesco_analysis:
            client.addMetadataToItem(analysis_item['_id'], romanesco_metadata)
        # add the item_id as the analysis_id
        minerva_metadata_path = os.path.join(analysis_path, 'minerva.json')
        with open(minerva_metadata_path) as minerva_metadata_file:
            minerva_metadata = json.load(minerva_metadata_file)
            minerva_metadata['minerva']['analysis_id'] = analysis_item['_id']
            client.addMetadataToItem(analysis_item['_id'], minerva_metadata)


def main():
    parser = argparse.ArgumentParser(description='Import analyses into minerva')
    parser.add_argument('--username', required=False, default=None)
    parser.add_argument('--password', required=False, default=None)
    parser.add_argument('--scheme', required=False, default='http')
    parser.add_argument('--host', required=False, default='localhost')
    parser.add_argument('--port', required=False, default='8080')
    parser.add_argument('--api-root', required=False, default='/api/v1',
                        help='path to the Girder REST API')
    parser.add_argument('--path', required=True, help='the path to import the analyses from')

    config = parser.parse_args()

    client = GirderClient(host=config.host, port=config.port,
                          apiRoot=config.api_root, scheme=config.scheme)
    client.authenticate(config.username, config.password)

    import_analyses(client, config.path)

if __name__ == '__main__':
    main()

