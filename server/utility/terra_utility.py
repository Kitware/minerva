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

import psycopg2

from elasticsearch import Elasticsearch
from girder.plugins.minerva.utility.minerva_utility import decryptCredentials
from girder.utility import config
from girder.utility.model_importer import ModelImporter


def getTerraConfig():
    cur_config = config.getConfig()
    return cur_config['terra'] if 'terra' in cur_config else {}

def pgCursorFromPgSourceId(sourceId):
    """
    Throws a psycopg2.Error if it can't connect.
    """
    # TODO throw a useful error if source DNE
    source = ModelImporter.model('item').load(sourceId, force=True)
    meta = source['meta']['minerva']

    # TODO We need to allow for colons to be in passwords, tsk tsk.
    dbuser, dbpass = decryptCredentials(
        meta['postgres_params']['credentials']).split(':')
    conn = psycopg2.connect("dbname='%s' user='%s' host='%s' password='%s'" % (
        meta['postgres_params']['dbname'],
        dbuser,
        meta['postgres_params']['host_name'],
        dbpass))

    return (conn.cursor(), source)

def esCursorFromEsSourceId(sourceId):
    # TODO document exceptions thrown
    source = ModelImporter.model('item').load(sourceId, force=True)
    meta = source['meta']['minerva']

    return (Elasticsearch(['https://%s@%s' % (decryptCredentials(
        meta['elasticsearch_params']['credentials']),
        meta['elasticsearch_params']['host_name'])]), source)
