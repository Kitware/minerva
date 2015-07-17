import os
import glob
import argparse
import romanesco

from girder_client import GirderClient

def import_analyses(client):
    path = os.path.dirname(os.path.realpath(__file__))
    analyses_path = os.path.join(path, 'analyses')

    # First get the analysis folder
    analyses_folder = client.get('/minerva_analysis/folder')

    if not analyses_folder['folder']:
        analyses_folder = client.post('/minerva_analysis/folder')

    analyses_folder =  analyses_folder['folder']

    for analysis_file in glob.glob(os.path.join(analyses_path, "*.json")):
        analysis = romanesco.load(analysis_file)
        analysis_name = analysis['name']

        # See if we already have an analysis with with name
        items = client.listItem(analyses_folder['_id'], analysis_name)

        if len(items) == 0:
            analysis_item = client.createItem(analyses_folder['_id'], analysis_name, analysis_name)
        elif len(items) > 1:
            raise Exception('More than one item found with name: %s' % analysis_name)
        else:
            analysis_item = items[0]

        # Set the metadata
        client.addMetadataToItem(analysis_item['_id'], {
            'analysis': analysis
        })

def main():
    parser = argparse.ArgumentParser(description='Import analyses into minerva')
    parser.add_argument('--username', required=False, default=None)
    parser.add_argument('--password', required=False, default=None)
    parser.add_argument('--scheme', required=False, default='http')
    parser.add_argument('--host', required=False, default='localhost')
    parser.add_argument('--port', required=False, default='8080')
    parser.add_argument('--api-root', required=False, default='/api/v1',
                        help='path to the Girder REST API')

    config = parser.parse_args()

    client = GirderClient(host=config.host, port=config.port,
                          apiRoot=config.api_root, scheme=config.scheme)
    client.authenticate(config.username, config.password)

    import_analyses(client)

if __name__ == '__main__':
    main()