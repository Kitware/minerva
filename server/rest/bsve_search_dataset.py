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
from datetime import datetime
from tempfile import NamedTemporaryFile
import json

from girder.api import access
from girder.api.describe import Description
from girder.api.rest import loadmodel, RestException
from girder.constants import AccessType

from girder.plugins.minerva.rest.dataset import Dataset
from girder.plugins.minerva.utility.bsve import BsveUtility
from girder.plugins.minerva.utility.minerva_utility import decryptCredentials


class BsveSearchDataset(Dataset):

    def __init__(self):
        self.resourceName = 'minerva_dataset_bsve_search'
        self.route('POST', (), self.createBsveSearchDataset)

    @access.user
    @loadmodel(map={'bsveSourceId': 'source'}, model='item',
               level=AccessType.READ)
    def createBsveSearchDataset(self, source, params):

        self.requireParams('name', params)
        name = params['name']

        # get info from the source item
        metadata = source.get('meta', {}).get('minerva', {})
        if metadata.get('source_type') != 'bsve':
            raise RestException('Invalid source type', 403)

        bp = metadata['bsve_params']
        username = bp['username']
        apikey = bp['apikey']
        secretkey = decryptCredentials(bp['secretkey'])
        baseurl = bp['baseurl']

        today = str(datetime.today().date())
        # construct dataset metadata
        metadata = {
            'dataset_type': 'bsve_search',
            'source_id': source['_id'],
            'term': params['term'],
            'start': params['start'],
            'end': params.get('end', today)
        }

        bsve = BsveUtility(username, apikey, secretkey, baseurl)
        data = bsve.search(
            bsve.construct_search_query(
                term=metadata['term'],
                from_date=metadata['start'],
                to_date=metadata['end']
            )
        )
        data = json.dumps(data, default=str)

        dataset = self.constructDataset(name, metadata)
        with NamedTemporaryFile() as data_file:
            data_file.file.write(data)
            data_file.file.flush()

            # calling a private parent method because lazy...
            self._addFileToItem(dataset['_id'], data_file.name)

        return dataset

    createBsveSearchDataset.description = (
        Description('Create a new dataset from a BSVE search.')
        .responseClass('Item')
        .param('name', 'The name of the dataset', required=True)
        .param('sourceId', 'Item ID of the BSVE Source item', required=True)
        .param('term', 'A search term', required=True)
        .param('start', 'The start date', required=True)
        .param('end', 'The end date (default today)', required=False)
        .errorResponse('ID was invalid.')
        .errorResponse('Read permission denied on the Item.', 403))
