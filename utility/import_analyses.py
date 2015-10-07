import os
import json
import ConfigParser
import argparse
import romanesco

from girder_client import GirderClient

def import_analyses(client, analyses_path):
    # First get the minerva analysis folder
    minerva_analyses_folder = client.get('/minerva_analysis/folder')

    if not minerva_analyses_folder['folder']:
        minerva_analyses_folder = client.post('/minerva_analysis/folder')

    minerva_analyses_folder = minerva_analyses_folder['folder']

    # Note:  this will clobber any analyses that have the same name
    items = {v['name']: v for v in
             client.listItem(minerva_analyses_folder['_id'])}


    # look for specific analysis subfolders
    # e.g. analyses/bsve
    for analysis_subfolder in os.listdir(analyses_path):
        analysis_path = os.path.join(analyses_path, analysis_subfolder)

        # If there is an analysis.json, it is a Romanesco analysis
        romanesco_analysis = os.path.join(analysis_path, 'analysis.json')
        metadata = {}
        minerva_metadata = {}
        if os.path.exists(romanesco_analysis):
            analysis = romanesco.load(romanesco_analysis)
            analysis_name = analysis['name']
            metadata['analysis'] = analysis
            # set the analysis_type based on folder name
            minerva_metadata['analysis_type'] = analysis_path.split('/')[-1]
            minerva_metadata['analysis_name'] = analysis_name

            if os.path.exists(os.path.join(analysis_path, 'analysis.cfg')):
                config = ConfigParser.ConfigParser()
                config.read(os.path.join(analysis_path, 'analysis.cfg'))

                for task_input in analysis['inputs']:
                    try:
                        default = config.get('inputs', task_input['name'])
                    except ConfigParser.NoOptionError:
                        continue

                    task_input['default'] = {
                        'format': task_input['format'],
                        'data': default
                    }
        else:
            # look for a minerva.json
            minerva_metadata_path = os.path.join(analysis_path, 'minerva.json')
            with open(minerva_metadata_path) as minerva_metadata_file:
                minerva_metadata = json.load(minerva_metadata_file)
                analysis_name = minerva_metadata['analysis_name']

        if analysis_name not in items.keys():
            items[analysis_name] = client.createItem(minerva_analyses_folder['_id'],
                                                     analysis_name,
                                                     analysis_name)

        analysis_item = items[analysis_name]
        # Set the minerva metadata
        # add the item_id as the analysis_id
        minerva_metadata['analysis_id'] = analysis_item['_id']
        metadata['minerva'] = minerva_metadata
        client.addMetadataToItem(analysis_item['_id'], metadata)


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
