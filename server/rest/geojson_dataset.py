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
import json

from girder.api import access
from girder.api.describe import Description, describeRoute
from girder.api.rest import loadmodel, RestException, GirderException
from girder.constants import AccessType
from girder.api.rest import Resource
from girder.utility import assetstore_utilities
from girder.plugins.minerva.rest.dataset import Dataset

from girder.plugins.minerva.utility.minerva_utility import findDatasetFolder, \
    updateMinervaMetadata


class GeojsonDataset(Dataset):

    def __init__(self):
        self.resourceName = 'minerva_dataset_geojson'
        self.route('POST', (), self.createGeojsonDataset)
        self.route('GET', (':id',), self.getLinkedGeojsonData)

    @access.user
    @loadmodel(map={'itemId': 'item'}, model='item',
               level=AccessType.WRITE)
    def createGeojsonDataset(self, item, params, fillColorKey=None, geometryField=None):
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
                if fillColorKey is not None:
                    minerva_metadata['visProperties'] = {
                        'line': {"fillColorKey": fillColorKey},
                        'polygon': {"fillColorKey": fillColorKey},
                        'point': {"fillColorKey": fillColorKey}
                    }
                if geometryField is not None:
                    minerva_metadata['geometryField'] = geometryField
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

    @access.user
    @loadmodel(model='item', level=AccessType.READ)
    @describeRoute(
        Description("Get linked geojson dataset.")
        .param('id', 'The ID of the item.', paramType='path')
        .errorResponse('ID was invalid.')
        .errorResponse('Dataset linking failed', 500)
        .errorResponse('Dataset is empty', 500)
    )
    def getLinkedGeojsonData(self, item, params):
        user = self.getCurrentUser()
        file = self.model('file').load(item['meta']['minerva'][
            'original_files'][0]['_id'], user=user)
        assetstore = self.model('assetstore').load(file['assetstoreId'])
        adapter = assetstore_utilities.getAssetstoreAdapter(assetstore)
        func = adapter.downloadFile(
            file, offset=0, headers=False, endByte=None,
            contentDisposition=None, extraParameters=None)
        data = json.loads(''.join(list(func())))

        geometryField = item['meta']['minerva']['geometryField']

        featureCollections = None
        if geometryField['type'] == 'link':
            try:
                item = self.model('item').load(geometryField['itemId'], force=True)
                file = list(self.model('item').childFiles(item=item, limit=1))[0]
                assetstore = self.model('assetstore').load(file['assetstoreId'])
                adapter = assetstore_utilities.getAssetstoreAdapter(assetstore)
                func = adapter.downloadFile(
                    file, offset=0, headers=False, endByte=None,
                    contentDisposition=None, extraParameters=None)
                featureCollections = json.loads(''.join(list(func())))

                valueLinks = sorted([x for x in geometryField['links']
                                     if x['operator'] == '='])
                constantLinks = [x for x in geometryField['links']
                                 if x['operator'] == 'constant']
                mappedGeometries = {}
                for feature in featureCollections['features']:
                    skip = False
                    for constantLink in constantLinks:
                        if feature['properties'][constantLink['field']] != constantLink['value']:
                            skip = True
                            break
                    if skip:
                        continue
                    try:
                        key = ''.join([feature['properties'][x['field']] for x in valueLinks])
                    except KeyError:
                        raise GirderException('missing property for key ' +
                                              x['field'] + ' in geometry link target geojson')
                    mappedGeometries[key] = feature['geometry']
            except Exception as ex:
                if isinstance(ex, GirderException):
                    raise ex
                raise GirderException('Dataset linking failed.')

            assembled = []
            for record in data:
                key = ''.join([record[x['value']] for x in valueLinks])
                if key in mappedGeometries:
                    assembled.append({
                        'type': 'Feature',
                        'geometry': mappedGeometries[key],
                        'properties': record
                    })

            if len(assembled) == 0:
                raise GirderException('Dataset is empty')

            return {
                'type': 'FeatureCollection',
                'features': assembled
            }
