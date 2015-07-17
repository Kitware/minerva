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

import os
import shutil
import pymongo
import tempfile
import imp
import uuid

from girder.api import access
from girder.api.describe import Description
from girder.api.rest import Resource, loadmodel, RestException
from girder.constants import AccessType
from girder.utility import config

from girder.plugins.minerva.constants import PluginSettings
from girder.plugins.minerva.libs.carmen import get_resolver
from girder.plugins.minerva.utility.minerva_utility import findNamedFolder, findMinervaFolder

import girder_client


class S3Dataset(Resource):
    def __init__(self):
        self.resourceName = 'minerva_dataset_s3'
        self.route('POST', (':id', 'dataset'), self.createDataset)

    @access.public
    @loadmodel(model='item', level=AccessType.WRITE)
    def createDataset(self, item, params):

        assetstore = self.model('assetstore')
        user = self.getCurrentUser()
        bucket = params['bucket'].strip()
        prefix = params['prefix'].strip()
        access_key_id = params.get('accessKeyId', '').strip()
        secret = params.get('secret', '').strip()
        service = params.get('service', '').strip()
        read_only = self.boolParam('readOnly', params, default=False)



        target_assetstore = None
        # First check if we have already have asset store for this bucket with
        # the same credentials etc.
        args = {
            'bucket': bucket,
            'accessKeyId': access_key_id,
            'prefix': prefix.strip('/'),
            'secret': secret,
            'service': service,
            'readOnly': read_only
        }
        target_assetstore = assetstore.findOne(args)

        # Create a new assetstore if we don't already have one that matches
        if not target_assetstore:
            target_assetstore = assetstore.createS3Assetstore(uuid.uuid4().hex,
                                                  bucket, access_key_id,
                                                  secret, prefix, service,
                                                  read_only)

        minerva_folder = findMinervaFolder(user, user, create=True)
        s3_folder = findNamedFolder(user, user, minerva_folder,
                                    'folder', 's3', create=True)
        bucket_folder = findNamedFolder(user, user, s3_folder,
                                    'folder', bucket, create=True)

        # Create a folder to import S3 prefix
        prefix_folder = self.model('folder').createFolder(
            bucket_folder, prefix, parentType='folder', public=False,
            allowRename=True)

        params = {
            'importPath': prefix
        }

        kwargs = {
            'assetstore': target_assetstore,
            'parent': prefix_folder,
            'parentType': 'folder' ,
            'params': params,
            'progress': None,
            'user': user
        }

        job = self.model('job', 'jobs').createLocalJob(
            title='Import S3 bucket %s with prefix %s' % (bucket, prefix), user=user,
            type='s3.import', public=False, kwargs=kwargs,
            module='girder.plugins.minerva.utility.s3_import_worker', async=True)

        self.model('job', 'jobs').scheduleJob(job)

        if 'meta' in item:
            metadata = item['meta']
        else:
            metadata = {}

        minerva_metadata =  {
            'original_type': 's3',
            'bucket': 'bucket',
            'prefix': prefix,
            'assetstoreId': str(target_assetstore['_id']),
            'folderId': prefix_folder['_id']
        }

        metadata['minerva'] = minerva_metadata

        self.model('item').setMetadata(item, metadata)

        return minerva_metadata

    createDataset.description = (
        Description('Create metadata for an Item, promoting it to a S3 Dataset, and trigger import.')
        .param('id', 'The Item ID', paramType='path')
        .errorResponse('ID was invalid.'))


