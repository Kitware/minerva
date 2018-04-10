import os

from tests import web_client_test

setUpModule = web_client_test.setUpModule
tearDownModule = web_client_test.tearDownModule


class WebClientTestCase(web_client_test.WebClientTestCase):

    def setUp(self):
        super(WebClientTestCase, self).setUp()

        admin = self.model('user').findOne({'login': 'admin'})
        item = self.model('item').findOne({'name': 'four_states.geojson'})
        self.request(path='/minerva_dataset/' +
                     str(item['_id']) + '/item', method='POST', user=admin)

        item = self.model('item').findOne({'name': 'three_states.geojson'})
        self.request(path='/minerva_dataset/' +
                     str(item['_id']) + '/item', method='POST', user=admin)

        item = self.model('item').findOne({'name': 'three_states.geojson'})
        minervaMeta = item['meta']['minerva']
        # simulate that dataset is postgres dataset
        del minervaMeta['bounds']
        self.model('item').setMetadata(item, item['meta'])

        item = self.model('item').findOne({'name': 'raster.tiff'})
        self.request(path='/minerva_dataset/' +
                     str(item['_id']) + '/item', method='POST', user=admin)

        # Create the user group for sharing feature
        self.request(path='/minerva_dataset/prepare_sharing', method='POST', user=admin)
