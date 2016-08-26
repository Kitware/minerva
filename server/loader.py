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
import requests
import cherrypy
from base64 import b64encode
from girder import events
from girder.utility.webroot import Webroot
from girder.utility.model_importer import ModelImporter

from girder.plugins.minerva.rest import \
        analysis, dataset, s3_dataset, session, source, \
        wms_dataset, wms_source, geojson_dataset, elasticsearch_source, \
        s3_source, postgres_source, mongo_source, mongo_dataset
from girder.plugins.minerva.utility.minerva_utility import decryptCredentials


class WmsProxy(object):
    exposed = True

    def GET(self, url, **params):
        if 'minerva_credentials' in params:
            creds = params['minerva_credentials']
            del params['minerva_credentials']
            auth = 'Basic ' + b64encode(decryptCredentials(bytes(creds)))
            headers = {'Authorization': auth}
            r = requests.get(url, params=params, headers=headers)
        else:
            r = requests.get(url, params=params)
        cherrypy.response.headers['Content-Type'] = r.headers['content-type']
        return r.content


def validate_settings(event):
    """Validate minerva specific settings."""
    key = event.info['key']
    val = event.info['value']

def load(info):
    # Load the mako template for Minerva and serve it as the root document.
    minerva_mako = os.path.join(os.path.dirname(__file__), "minerva.mako")
    minerva_webroot = Webroot(minerva_mako)
    minerva_webroot.updateHtmlVars(info['serverRoot'].vars)
    minerva_html_vars = {'title': 'Minerva', 'externalJsUrls': []}
    minerva_webroot.updateHtmlVars(minerva_html_vars)

    def add_downstream_plugin_js_urls(downstream_plugin_js_urls):
        """ Allow additional external JS resources to be loaded from downstream plugins. """
        minerva_html_vars.setdefault('externalJsUrls', []).extend(downstream_plugin_js_urls.info)
        minerva_webroot.updateHtmlVars(minerva_html_vars)

    events.bind('minerva.additional_js_urls', 'minerva', add_downstream_plugin_js_urls)

    # Move girder app to /girder, serve minerva app from /
    info['serverRoot'], info['serverRoot'].girder = (minerva_webroot,
                                                     info['serverRoot'])
    info['serverRoot'].api = info['serverRoot'].girder.api

    events.bind('model.setting.validate', 'minerva', validate_settings)

    info['apiRoot'].minerva_dataset = dataset.Dataset()
    info['apiRoot'].minerva_analysis = analysis.Analysis()
    info['apiRoot'].minerva_session = session.Session()
    info['apiRoot'].minerva_dataset_s3 = s3_dataset.S3Dataset()

    info['apiRoot'].minerva_source = source.Source()

    info['apiRoot'].minerva_source_wms = wms_source.WmsSource()
    info['apiRoot'].minerva_source_s3 = s3_source.S3Source()
    info['apiRoot'].minerva_dataset_wms = wms_dataset.WmsDataset()

    info['apiRoot'].minerva_dataset_geojson = geojson_dataset.GeojsonDataset()

    info['apiRoot'].minerva_source_elasticsearch = \
        elasticsearch_source.ElasticsearchSource()
    info['apiRoot'].minerva_query_elasticsearch = \
        elasticsearch_source.ElasticsearchQuery()
    info['apiRoot'].minerva_source_postgres = \
        postgres_source.PostgresSource()
    info['apiRoot'].minerva_source_mongo = mongo_source.MongoSource()
    info['apiRoot'].minerva_dataset_mongo = mongo_dataset.MongoDataset()
    info['serverRoot'].wms_proxy = WmsProxy()

    # If we are started up in testing mode, then serve minerva's sources as well
    # for debugging client tests.
    if '/test' in info['config']:
        info['config']['/src/minerva'] = {
            'tools.staticdir.on': True,
            'tools.staticdir.dir': 'plugins/minerva/web_external'
        }
        info['config']['/test/minerva'] = {
            'tools.staticdir.on': True,
            'tools.staticdir.dir': 'plugins/minerva/plugin_tests/client'
        }
