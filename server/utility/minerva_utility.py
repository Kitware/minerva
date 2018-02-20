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
from cryptography.fernet import Fernet
from girder.utility import config
from girder.utility.model_importer import ModelImporter
from girder.exceptions import AccessException

from girder.plugins.minerva.constants import PluginSettings


def findNamedFolder(currentUser, user, parent, parentType, name, create=False,
                    joinShareGroup=None, public=False):
    folders = \
        [ModelImporter.model('folder').filter(folder, currentUser) for folder in
         ModelImporter.model('folder').childFolders(
            parent=parent, parentType=parentType,
            user=currentUser, filters={'name': name})]
    # folders should have len of 0 or 1, since we are looking in a
    # user folder for a folder with a certain name
    if len(folders) == 0:
        if create and currentUser:
            folder = ModelImporter.model('folder').createFolder(
                parent, name, parentType=parentType, public=public,
                creator=currentUser)

            if joinShareGroup:
                groupModel = ModelImporter.model('group')
                datasetSharingGroup = groupModel.findOne(query={
                    'name': PluginSettings.DATASET_SHARING_GROUP_NAME
                })
                ModelImporter.model('folder').setGroupAccess(
                    folder, datasetSharingGroup, 0, currentUser=currentUser, save=True)
            return folder
        else:
            return None
    else:
        return folders[0]


def findMinervaFolder(currentUser, user, create=False):
    return findNamedFolder(currentUser, user, user, 'user',
                           PluginSettings.MINERVA_FOLDER, create)


def findPublicFolder(currentUser, user, create=False):
    return findNamedFolder(currentUser, user, user, 'user',
                           'Public', create)


def findSharedFolder(currentUser, user, create=False):
    minervaSharedFolder = findNamedFolder(
        currentUser, user, user, 'user', PluginSettings.MINERVA_SHARED_DATASET,
        create, joinShareGroup=True, public=False)
    return minervaSharedFolder


def findDatasetFolder(currentUser, user, create=False):
    minervaFolder = findMinervaFolder(currentUser, user, create)
    if minervaFolder is None:
        return minervaFolder
    else:
        return findNamedFolder(currentUser, user, minervaFolder, 'folder',
                               PluginSettings.DATASET_FOLDER, create)


def findSharedDatasetFolders(currentUser):
    folderModel = ModelImporter.model('folder')
    groupModel = ModelImporter.model('group')
    datasetSharingGroup = groupModel.findOne(query={
        'name': PluginSettings.DATASET_SHARING_GROUP_NAME
    })
    if not datasetSharingGroup:
        raise AccessException('user group "{0}" doesn\'t exist'.format(
            PluginSettings.DATASET_SHARING_GROUP_NAME))
    if datasetSharingGroup['_id'] not in currentUser['groups']:
        raise AccessException('user doesn\'t belong to user group "{0}"'.format(
            PluginSettings.DATASET_SHARING_GROUP_NAME))

    folders = folderModel.find({
        'baseParentType': 'user',
        'parentCollection': 'user',
        'access.groups.id': datasetSharingGroup['_id'],
        'name': PluginSettings.MINERVA_SHARED_DATASET
    })
    return folders


def findSourceFolder(currentUser, user, create=False):
    minervaFolder = findMinervaFolder(currentUser, user, create)
    if minervaFolder is None:
        return minervaFolder
    else:
        return findNamedFolder(currentUser, user, minervaFolder, 'folder',
                               PluginSettings.SOURCE_FOLDER, create)


def findSessionFolder(currentUser, user, create=False):
    minervaFolder = findMinervaFolder(currentUser, user, create)
    if minervaFolder is None:
        return minervaFolder
    else:
        return findNamedFolder(currentUser, user, minervaFolder, 'folder',
                               PluginSettings.SESSION_FOLDER, create)


def findNamedCollection(currentUser, name, create=False):
    collections = \
        [ModelImporter.model('collection').filter(c, currentUser) for c in
         ModelImporter.model('collection').textSearch(name, user=currentUser)]
    # collections should have len of 0 or 1, since we are looking
    # for a collection with a certain name
    if len(collections) == 0:
        if create:
            return ModelImporter.model('collection').createCollection(
                name, description='', public=True, creator=currentUser)
        else:
            return None
    else:
        return collections[0]


def findMinervaCollection(currentUser, create=False):
    return findNamedCollection(currentUser, PluginSettings.MINERVA_COLLECTION,
                               create)


def findAnalysisFolder(currentUser, create=False):
    minervaCollection = findMinervaCollection(currentUser,  create)
    if minervaCollection is None:
        return None
    else:
        analysisFolder = findNamedFolder(currentUser, currentUser,
                                         minervaCollection, 'collection',
                                         'analysis', create, public=True)
        return analysisFolder


def findAnalysisByName(currentUser, name):
    analysisFolder = findAnalysisFolder(currentUser)
    filters = {}
    filters['$text'] = {
        '$search': name
    }
    analyses = [ModelImporter.model('item').filter(item, currentUser)
                for item in
                ModelImporter.model('folder').childItems(folder=analysisFolder,
                                                         filters=filters)]
    if len(analyses) > 0:
        return analyses[0]
    else:
        return None


def mM(item, minerva_metadata=None):
    if minerva_metadata is None:
        if 'meta' not in item or 'minerva' not in item['meta']:
            return {}
        return item['meta']['minerva']
    else:
        return updateMinervaMetadata(item, minerva_metadata)


def updateMinervaMetadata(item, minerva_metadata):
    if 'meta' not in item:
        item['meta'] = {}
    item['meta']['minerva'] = minerva_metadata
    ModelImporter.model('item').setMetadata(item, item['meta'])
    return item['meta']['minerva']


def decryptCredentials(credentials):
    cur_config = config.getConfig()
    key = cur_config['minerva']['crypto_key']
    f = Fernet(key)
    return f.decrypt(bytes(credentials))


def encryptCredentials(credentials):
    cur_config = config.getConfig()
    key = cur_config['minerva']['crypto_key']
    f = Fernet(key)
    return f.encrypt(bytes(credentials))


def jobMM(job, minerva_metadata=None, save=True):
    if minerva_metadata is None:
        if 'meta' not in job or 'minerva' not in job['meta']:
            return {}
        return job['meta']['minerva']
    else:
        if 'meta' not in job:
            job['meta'] = {}
        job['meta']['minerva'] = minerva_metadata
        if save:
            ModelImporter.model('job', 'jobs').save(job)
        return job['meta']['minerva']


def addJobOutput(job, output, output_type='dataset', save=True):
    mm = jobMM(job)
    outputs = mm.get('outputs', [])
    job_output = None
    if output_type == 'dataset':
        job_output = {
            'type': 'dataset',
            'dataset_id': output.get('_id')
        }
    else:
        raise NotImplementedError('unknown job output %s' % output_type)
    outputs.append(job_output)
    mm['outputs'] = outputs
    jobMM(job, mm, save)
