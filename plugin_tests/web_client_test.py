import os

from tests import web_client_test

setUpModule = web_client_test.setUpModule
tearDownModule = web_client_test.tearDownModule


class WebClientTestCase(web_client_test.WebClientTestCase):

    def setUp(self):
        super(WebClientTestCase, self).setUp()

        admin = self.model('user').findOne({'login': 'admin'})
        item = self.model('item').findOne({'name': 'three_states.geojson'})
        self.request(path='/minerva_dataset/' +
                     str(item['_id']) + '/item', method='POST', user=admin)

        # simulate that dataset is postgres dataset
        item = self.model('item').findOne({'name': 'three_states.geojson'})
        minervaMeta = item['meta']['minerva']
        del minervaMeta['bounds']
        self.model('item').setMetadata(item, item['meta'])

        item = self.model('item').findOne({'name': 'raster.tiff'})
        self.request(path='/minerva_dataset/' +
                     str(item['_id']) + '/item', method='POST', user=admin)

        # Create the user group for sharing feature
        groupModel = self.model('group')
        datasetSharingGroup = groupModel.findOne(query={
            'name': 'dataset sharing'
        })
        if not datasetSharingGroup:
            groupModel.createGroup('dataset sharing', admin, public=False)
