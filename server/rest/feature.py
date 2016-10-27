from girder.api import access
from girder.api.describe import Description
from girder.api.rest import Resource


class FeatureInfo(Resource):

    def __init__(self):
        self.resourceName = 'minerva_get_feature_info'
        self.route('GET', (), self.getFeatureInfo)

    def _getMinervaItem(self, itemId):
        """ Returns minerva metadata for a given item_id """

        item = self.model('item').load(itemId,
                                       user=self.getCurrentUser())
        return item

    @access.user
    def getFeatureInfo(self, params):

        activeLayers = params['activeLayers[]']

        # Return a list for all cases
        if isinstance(activeLayers, (str, unicode)):
            activeLayers = [activeLayers]

        for i in activeLayers:
            item = self._getMinervaItem(i)


        return activeLayers

    getFeatureInfo.description = (
        Description('Query values for overlayed datasets for a given lat long')
        .param('activeLayers', 'Active layers on map')
        .param('bbox', 'Bounding box')
        .param('x', 'X', dataType='int')
        .param('y', 'Y', dataType='int')
        .param('width', 'Width', dataType='int')
        .param('height', 'Height', dataType='int')
    )
