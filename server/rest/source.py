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

import pymongo

from girder.api import access
from girder.api.describe import Description
from girder.api.rest import Resource, loadmodel, RestException
from girder.constants import AccessType

from girder.plugins.minerva.utility.minerva_utility import findSourceFolder, \
    updateMinervaMetadata


class Source(Resource):
    def __init__(self):
        self.resourceName = 'minerva_source'
        self.route('GET', (), self.listSources)
        self.route('GET', ('folder',), self.getSourceFolder)
        self.route('POST', ('folder',), self.createSourceFolder)
        self.route('POST', ('wms_source',), self.createWmsSource)

    # REST Endpoints

    @access.public
    @loadmodel(map={'userId': 'user'}, model='user', level=AccessType.READ)
    def listSources(self, user, params):
        folder = findSourceFolder(self.getCurrentUser(), user)
        if folder is None:
            return []
        else:
            limit, offset, sort = \
                self.getPagingParameters(params,
                                         defaultSortDir=pymongo.DESCENDING)
            items = [self.model('item').filter(item, self.getCurrentUser()) for
                     item in self.model('folder').childItems(folder,
                     limit=limit, offset=offset, sort=sort)]
            return items
    listSources.description = (
        Description('List minerva sources owned by a user.')
        .param('userId', 'User is the owner of minerva sources.',
               required=True)
        .param('limit', "Result set size limit (default=50).", required=False,
               dataType='int')
        .param('offset', "Offset into result set (default=0).", required=False,
               dataType='int')
        .param('sort', 'Field to sort the result list by ('
               'default=name)', required=False)
        .param('sortdir', "1 for ascending, -1 for descending (default=-1)",
               required=False, dataType='int'))

    @access.public
    @loadmodel(map={'userId': 'user'}, model='user', level=AccessType.READ)
    def getSourceFolder(self, user, params):
        folder = findSourceFolder(self.getCurrentUser(), user)
        return folder
    getSourceFolder.description = (
        Description('Get the minerva source folder owned by a user.')
        .responseClass('Folder')
        .param('userId', 'User is the owner of minerva sources.',
               required=True))

    @access.public
    @loadmodel(map={'userId': 'user'}, model='user', level=AccessType.WRITE)
    def createSourceFolder(self, user, params):
        folder = findSourceFolder(self.getCurrentUser(), user, create=True)
        return folder
    createSourceFolder.description = (
        Description('Create the minerva source folder owned by a user.')
        .responseClass('Folder')
        .param('userId', 'User is the owner of minerva sources.',
               required=True))

    @access.user
    def createWmsSource(self, params):
        # assuming to create in the user space of the current user
        user = self.getCurrentUser()
        folder = findSourceFolder(user, user)
        if folder is None:
            raise RestException('User has no Minerva Source folder.')
        name = params['name']
        baseURL = params['baseURL']
        desc = 'wms source for  %s' % name
        item = self.model('item').createItem(name, user, folder, desc)
        minerva_metadata = {
            'source_id': item['_id'],
            'source_type': 'wms',
            'wms_params': {
                'baseURL': baseURL
            }
        }
        updateMinervaMetadata(item, minerva_metadata)
        return item
    createWmsSource.description = (
        Description('Create a source from an external wms server.')
        .param('name', 'The name of the wms source', required=True)
        .param('baseURL', 'URL where the wms is served', required=True)
        .errorResponse('Write permission denied on the source folder.', 403))
