from girder.api import access
from girder.api.describe import Description
from girder.api.rest import Resource


class FeatureInfo(Resource):

    def __init__(self):
        self.resourceName = 'minerva_get_feature_info'
        self.route('GET', (), self.getFeatureInfo)

    @access.user
    def getFeatureInfo(self, user, params):
        pass

    getFeatureInfo.description = (
        Description('Query values for overlayed datasets for a given lat long')
        .param('activeLayers', 'Active layers on map')
        .param('bbox', 'Bounding box')
        .param('x', 'X', dataType='long')
        .param('y', 'Y', dataType='long')
        .param('width', 'Width', dataType='long')
        .param('height', 'Height', dataType='long')
    )
