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

from girder.plugins.minerva.rest.source import Source


class MongoSource(Source):

    def __init__(self):
        self.resourceName = 'minerva_source_mongo'
        self.route('POST', (), self.createMongoSource)

    @access.user
    def createMongoSource(self, params):
        name = params['name']
        dbConnectionUri = params['dbConnectionUri']

        minerva_metadata = {
            'source_type': 'mongo',
            'mongo_connection': {
                'db_uri': dbConnectionUri
            }
        }
        desc = 'mongo source for  %s' % name
        # get the first entry in the collection, set as json_row
        # TODO integrate this with the methods for taking a row from a JSON
        # array in a file
        collectionList = self.mongoCollectionNames(dbConnectionUri)
        minerva_metadata['collections'] = collectionList
        return self.createSource(name, minerva_metadata, desc)
    createMongoSource.description = (
        Description('Create a source from an external mongo collection.')
        .param('name', 'The name of the source')
        .param('dbConnectionUri', 'Connection URI to MongoDB')
        .errorResponse('Write permission denied on the dataset folder.', 403))

    def mongoCollection(self, connectionUri, collectionName):
        # TODO not sure if this is a good idea to do this db stuff here
        # maybe this suggests a new model?
        from girder.models import getDbConnection
        dbConn = getDbConnection(connectionUri)
        db = dbConn.get_default_database()
        from girder.external.mongodb_proxy import MongoProxy
        collection = MongoProxy(db[collectionName])
        return collection

    def mongoCollectionNames(self, connectionUri):
        from girder.models import getDbConnection
        dbConn = getDbConnection(connectionUri)
        db = dbConn.get_default_database()
        return db.collection_names(include_system_collections=False)
