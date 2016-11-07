from collections import defaultdict

from girder import events
from girder.api import access
from girder.api.describe import Description
from girder.api.rest import Resource

import requests


class FeatureInfo(Resource):

    def __init__(self):
        self.resourceName = 'minerva_get_feature_info'
        self.route('GET', (), self.getFeatureInfo)

    def _getMinervaItem(self, itemId):
        """Returns minerva metadata for a given item_id"""

        item = self.model('item').load(itemId,
                                       user=self.getCurrentUser())
        return item

    @staticmethod
    def callFeatureInfo(baseUrl, params, typeNames):
        """Calls geoserver to get at long location information"""
        baseUrl = baseUrl.replace('GetCapabilities', 'GetFeatureInfo')
        typeNames = ",".join(typeNames)

        parameters = {
            'exceptions': 'application/vnd.ogc.se_xml',
            'feature_count': '50',
            'styles': '',
            'srs': 'EPSG:3857',
            'info_format': 'application/json',
            'format': 'image/png',
            'query_layers': typeNames,
            'layers': typeNames,
            'bbox': params['bbox'],
            'width': params['width'],
            'height': params['height'],
            'x': params['x'],
            'y': params['y'],
            'callback': 'getLayerFeatures'
        }

        req = requests.get(baseUrl, params=parameters)

        return req.content

    @access.user
    def getFeatureInfo(self, params):

        activeLayers = params['activeLayers[]']

        # Return a list for all cases
        if isinstance(activeLayers, (str, unicode)):
            activeLayers = [activeLayers]

        layerSource = []

        bsveurl = 'https://api-dev.bsvecosystem.net/data/v2/sources/' \
                  'geotiles/data/result'
        for i in activeLayers:
            item = self._getMinervaItem(i)
            url = item['meta']['minerva'].get('base_url', bsveurl)
            layerSource.append((url, item['meta']['minerva']['type_name']))

        layerUrlMap = defaultdict(list)
        for k, v in layerSource:
            layerUrlMap[k].append(v)

        grandResponse = []
        for baseUrl, layers in layerUrlMap.items():
            event = events.trigger('minerva.get_layer_info', {
                'baseUrl': baseUrl,
                'params': params,
                'layers': layers
            })
            response = event.responses
            if not event.defaultPrevented:
                response = self.callFeatureInfo(baseUrl, params, layers)

            grandResponse.append(response)
        return grandResponse

    getFeatureInfo.description = (
        Description('Query values for overlayed datasets for a given lat long')
        .param('activeLayers', 'Active layers on map')
        .param('bbox', 'Bounding box')
        .param('x', 'X', dataType='int')
        .param('y', 'Y', dataType='int')
        .param('width', 'Width', dataType='int')
        .param('height', 'Height', dataType='int')
    )
