#!/usr/bin/env python
# -*- coding: utf-8 -*-

###############################################################################
#  Copyright Kitware Inc.
#
#  Licensed under the Apache License, Version 2.0 ( the "License" );
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
###############################################################################
from girder.api import access
from girder.api.describe import Description
from girder.api.rest import loadmodel, RestException
from girder.constants import AccessType
from girder.plugins.minerva.rest.dataset import Dataset

from girder.plugins.minerva.utility.minerva_utility import findDatasetFolder, \
    updateMinervaMetadata


class GeojsonDataset(Dataset):
    def __init__(self):
        super(GeojsonDataset, self).__init__()
        self.resourceName = 'minerva_dataset_geojson'
        self.route('POST', (), self.createGeojsonDataset)

    @access.user
    @loadmodel(map={'itemId': 'item'}, model='item',
               level=AccessType.WRITE)
    def createGeojsonDataset(self, item, params, postgresGeojson=None):
        user = self.getCurrentUser()
        folder = findDatasetFolder(user, user, create=True)
        if folder is None:
            raise RestException('User has no Minerva Dataset folder.')
        if folder['_id'] != item['folderId']:
            raise RestException("Items need to be in user's Minerva Dataset " +
                                "folder.")
        minerva_metadata = {
            'original_type': 'geojson',
            'dataset_type': 'geojson',
        }
        # Use the first geojson or json file found as the dataset.
        for file in self.model('item').childFiles(item=item, limit=0):
            if ('geojson' in file['exts'] or 'json' in file['exts'] or
                    file.get('mimeType') in (
                        'application/json', 'application/vnd.geo+json',
                    )):
                minerva_metadata['original_files'] = [{
                    'name': file['name'], '_id': file['_id']}]
                minerva_metadata['geojson_file'] = {
                    'name': file['name'], '_id': file['_id']}
                minerva_metadata['geo_render'] = {
                    'type': 'geojson', 'file_id': file['_id']}
                minerva_metadata['original_type'] = 'geojson'
                minerva_metadata['source'] = {
                    'layer_source': 'GeoJSON'}
                minerva_metadata['source_type'] = 'item'
                if postgresGeojson is not None:
                    if postgresGeojson['field'] is not None:
                        minerva_metadata['visProperties'] = {
                            'line': {"fillColorKey": postgresGeojson['field']},
                            'polygon': {"fillColorKey": postgresGeojson['field']},
                            'point': {"fillColorKey": postgresGeojson['field']}
                        }
                    minerva_metadata['postgresGeojson'] = postgresGeojson
                break
        if 'geojson_file' not in minerva_metadata:
            raise RestException('Item contains no geojson file.')
        updateMinervaMetadata(item, minerva_metadata)
        return item
    createGeojsonDataset.description = (
        Description('Create a Geojson Dataset from an Item.')
        .responseClass('Item')
        .param('itemId', 'Item ID of the existing Geojson Item', required=True)
        .errorResponse('ID was invalid.')
        .errorResponse('Write permission denied on the Item.', 403))
