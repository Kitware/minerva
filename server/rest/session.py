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
from girder.api.rest import Resource, loadmodel
from girder.constants import AccessType

from girder.plugins.minerva.constants import PluginSettings
from girder.plugins.minerva.utility.minerva_utility import findSessionFolder


class Session(Resource):
    def __init__(self):
        self.resourceName = 'minerva_session'
        self.route('GET', (), self.listSessions)
        self.route('GET', ('folder',), self.getSessionFolder)
        self.route('POST', ('folder',), self.createSessionFolder)
        self.route('GET', (':id', 'session'), self.getSessionJson)

    @access.public
    @loadmodel(map={'userId': 'user'}, model='user', level=AccessType.READ)
    def listSessions(self, user, params):
        folder = findSessionFolder(self.getCurrentUser(), user)
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
    listSessions.description = (
        Description('List minerva sessions owned by a user.')
        .param('userId', 'User is the owner of minerva sessions.',
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
    def getSessionFolder(self, user, params):
        folder = findSessionFolder(self.getCurrentUser(), user, create=True)
        return {'folder': folder}
    getSessionFolder.description = (
        Description('Get the minerva session folder owned by a user.')
        .param('userId', 'User is the owner of minerva sessions.',
               required=True))

    @access.public
    @loadmodel(map={'userId': 'user'}, model='user', level=AccessType.WRITE)
    def createSessionFolder(self, user, params):
        folder = findSessionFolder(self.getCurrentUser(), user, create=True)
        return {'folder': folder}
    createSessionFolder.description = (
        Description('Create the minerva session folder owned by a user.')
        .param('userId', 'User is the owner of minerva sessions.',
               required=True))

    @access.public
    @loadmodel(model='item', level=AccessType.READ)
    def getSessionJson(self, item, params):
        itemSessionJson = PluginSettings.SESSION_FILENAME
        # TODO if not found try pagination
        for file in self.model('item').childFiles(item):
            if file['name'] == itemSessionJson:
                return file
        return {}
    getSessionJson.description = (
        Description('Get session json file from a minerva session item.')
        .param('id', 'The Item ID', paramType='path')
        .errorResponse('ID was invalid.')
        .errorResponse('Read permission denied on the Item.', 403))
