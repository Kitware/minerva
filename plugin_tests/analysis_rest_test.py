import os
import json

# Need to set the environment variable before importing girder
girder_port = os.environ.get('GIRDER_TEST_PORT', '20200')
os.environ['GIRDER_PORT'] = girder_port  # noqa

from tests import base
import unittest


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


#       def test_create_remove_analysis(self):
#    #       from pudb.remote import set_trace; set_trace(term_size=(209, 64))
#           created = self._register_analysis("sum_vararg.py", name='sum')
#           resp = self.request(path='/minerva_analysis/sum',
#                               method='GET', user=self._user)
#
#           for key in ['_id', 'name', 'path', 'type']:
#               self.assertTrue(key in resp.json)
#               self.assertTrue(key in created.json)
#               self.assertEquals(resp.json[key], created.json[key])
#
#           self._unregister_analysis(resp.json['_id'])
#
#           resp = self.request(path='/minerva_analysis/sum',
#                               method='GET', user=self._user)
#           self.assertStatus(resp, 400)
#           self.assertEquals(resp.json['message'], "No such analysis: sum")
#
#       def test_analysis_meta(self):
#           analysis = self._register_analysis("params_and_type.py", name='analysis')
#
#           resp = self.request(path='/minerva_analysis/analysis/meta',
#                               method="GET", user=self._user)
#
#           self.assertComplexEquals(resp.json,
#                                    [{'kwarg': False, 'name': 'a',
#                                      'vararg': False,
#                                      'type': 'int',
#                                      'optional': False,
#                                      'description': 'description of a'},
#                                     {'kwarg': False,
#                                      'name': 'b',
#                                      'vararg': False,
#                                      'type': 'int',
#                                      'optional': False,
#                                      'description': 'description of b'},
#                                     {'kwarg': False,
#                                      'name': 'c',
#                                      'vararg': False,
#                                      'default': None,
#                                      'type': 'int',
#                                      'optional': True,
#                                      'description': 'description of c'}])
#
#           self._unregister_analysis(analysis.json['_id'])
#
#       def test_run_no_inputs(self):
#           pass
#
#       def test_no_outputs(self):
#           pass
#
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
