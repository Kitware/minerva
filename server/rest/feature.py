from collections import defaultdict
from urllib import quote

from girder.api import access
from girder.api.describe import Description
from girder.api.rest import Resource
from girder.plugins.minerva.utility.cookie import getExtraHeaders

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
        """Calls geoserver to get information about
        a lat long location. Note that typeNames can
        be a list of layers"""

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

    @staticmethod
    def callBsveFeatureInfo(baseUrl, params, typeNames):
        """Call bsve api for getting information about
        a lat long locaion"""

        headers = getExtraHeaders()
        headers.update({'Content-Type': 'application/xml'})

        typeNames = ",".join(typeNames)

        parameters = quote("$filter=names eq {} and query_layers eq {} and request eq getfeatureinfo and exceptions eq application/vnd.ogc.se_xml and feature_count eq 50 and projection eq EPSG:3857 and format eq image/png and geo.bbox eq {} and width eq {} and height eq {} and x eq {} and y eq {} and format_options eq callbak:getLayerFeatures&$format=application/json".format(typeNames, typeNames, params['bbox'], params['width'], params['height'], params['x'], params['y'] ), safe='=&$ ').replace(' ', '+')

        req = requests.get(baseUrl, params=parameters, headers=headers)

        return req.content

    @access.user
    def getFeatureInfo(self, params):

        activeLayers = params['activeLayers[]']

        # Return a list for all cases
        if isinstance(activeLayers, (str, unicode)):
            activeLayers = [activeLayers]

        layerSource = []

        for i in activeLayers:
            item = self._getMinervaItem(i)
            url = item['meta']['minerva'].get(
                'base_url',
                'https://api-dev.bsvecosystem.net/data/v2/sources/geotiles/data/result')

            layerSource.append((url, item['meta']['minerva']['type_name']))

        layerUrlMap = defaultdict(list)
        for k, v in layerSource: layerUrlMap[k].append(v)

        grandResponse = []
        for baseUrl, layers in layerUrlMap.items():
            if 'bsvecosystem' in baseUrl:
                response = self.callBsveFeatureInfo(baseUrl, params, layers)
            else:
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
