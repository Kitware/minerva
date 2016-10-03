from tests import web_client_test


setUpModule = web_client_test.setUpModule
tearDownModule = web_client_test.tearDownModule


class WebClientTestCase(web_client_test.WebClientTestCase):

    def setUp(self):
        super(WebClientTestCase, self).setUp()

        self.model('user').createUser(
            login='minerva-admin',
            password='minerva-password!',
            email='minerva@email.com',
            firstName='Min',
            lastName='Erva',
            admin=True
        )
