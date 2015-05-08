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

from constants import PluginSettings
from girder.utility.model_importer import ModelImporter

def findMinervaFolder(user):
    folders = [ModelImporter.model('folder').filter(folder, user) for folder in ModelImporter.model('folder').childFolders(parent=user, parentType='user', user=user,
        filters={'name': PluginSettings.MINERVA_FOLDER})]
    # folders should have len of 0 or 1, since we are looking in a
    # user folder for a folder with a certain name
    if len(folders) == 0:
        return None
    else:
        return folders[0]
