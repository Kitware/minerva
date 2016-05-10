# coding=utf-8
import os
import json

# Need to set the environment variable before importing girder
girder_port = os.environ.get('GIRDER_TEST_PORT', '20200')
os.environ['GIRDER_PORT'] = girder_port  # noqa
from tests import base




def setUpModule():
    """Enable the minerva plugin and start the server."""
    base.enabledPlugins.append('minerva')
    base.startServer(False)


def tearDownModule():
    """Stop the server."""
    base.stopServer()


class AnalysisRESTTestCase(base.TestCase):
    """Tests of the minerva analysis functionality."""

    def setUp(self):
        """Set up the test case with  a user."""
        super(AnalysisRESTTestCase, self).setUp()

        self._user = self.model('user').createUser(
            'minervauser', 'password', 'minerva', 'user',
            'minervauser@example.com')


    # Coppied from Analysis test
    # TODO:  refactor into general AnalysisTestCase object
    def assertComplexEquals(self, i, o):
        def dict_ordered(obj):
            if isinstance(obj, dict):
                return sorted((k, dict_ordered(v)) for k, v in obj.items())
            elif isinstance(obj, list):
                return sorted(dict_ordered(x) for x in obj)
            else:
                return obj

        self.assertEquals(dict_ordered(i), dict_ordered(o))

    def _register_analysis(self, file_name, name=None, kind="python"):
        path = os.path.join(os.path.dirname(__file__), "analyses", file_name)

        params = {
            'name': name,
            'path': path,
            'type': kind
        }

        resp = self.request(path='/minerva_analysis', method='POST',
                            params=params, user=self._user)
        self.assertStatusOk(resp)
        return resp

    def _unregister_analysis(self, _id):
        resp = self.request(path='/minerva_analysis/%s' % _id,
                            method='DELETE', user=self._user)
        return resp

    def test_run_simple_analysis(self):
        analysis = self._register_analysis("sum_simple.py", name='sum')
        body = {"a":  3, "b": 3}

        resp = self.request(path='/minerva_analysis/sum',
                            type="application/json",
                            method='POST', body=json.dumps(body),
                            user=self._user)

        self.assertEquals(resp.json, 6)

        self._unregister_analysis(analysis.json['_id'])

    def test_run_optional_analysis(self):
        analysis = self._register_analysis("sum_optional.py", name='sum')
        body = {"a":  3, "b": 3}

        resp = self.request(path='/minerva_analysis/sum',
                            type="application/json",
                            method='POST', body=json.dumps(body),
                            user=self._user)

        self.assertEquals(resp.json, 6)

        body['multiply'] = True

        resp = self.request(path='/minerva_analysis/sum',
                            type="application/json",
                            method='POST', body=json.dumps(body),
                            user=self._user)

        self.assertEquals(resp.json, 9)

        self._unregister_analysis(analysis.json['_id'])

    def test_run_vararg_analysis(self):
        analysis = self._register_analysis("sum_vararg.py", name='sum')

        body = {"summands":  [1, 2, 3]}

        resp = self.request(path='/minerva_analysis/sum',
                            type="application/json",
                            method='POST', body=json.dumps(body),
                            user=self._user)

        self.assertEquals(resp.json, 6)

        self._unregister_analysis(analysis.json['_id'])
