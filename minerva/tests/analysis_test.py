import os
import unittest
from minerva.analyses import PythonAnalysis


class AnalysisTestCase(unittest.TestCase):
    """Tests of the minerva analysis functionality."""

    def get_analysis(self, file_name):
        return PythonAnalysis(name=file_name,
                              path=os.path.join(
                                  os.path.dirname(__file__),
                                  "analyses", file_name))

    def setUp(self, *args, **kwargs):
        super(AnalysisTestCase, self).setUp(*args, **kwargs)
    # TODO: Analysis Model must have unique name
    # TODO: Analysis Endpoint should accept name paramater
    # TODO: Analysis Endpoint should create name from
    #       basename stirpped of extension

    # TODO: Test utility method for get_analysis

    # TODO: test model get_by_name()

    # Test PythonInputParser
    #   Test works with no arguments
    def assertComplexEquals(self, i, o):
        def dict_ordered(obj):
            if isinstance(obj, dict):
                return sorted((k, dict_ordered(v)) for k, v in obj.items())
            elif isinstance(obj, list):
                return sorted(dict_ordered(x) for x in obj)
            else:
                return obj

        self.assertEquals(dict_ordered(i), dict_ordered(o))

    def test_no_arguments(self):
        p = self.get_analysis('no_args.py')
        self.assertTrue(p.inputs == [])

    #   Test works with just args
    def test_just_args(self):
        p = self.get_analysis('just_args.py')
        self.assertComplexEquals(p.inputs,
                                 [{'name': 'a',  'optional': False,
                                   'vararg': False, 'kwarg': False},
                                  {'name': 'b', 'optional': False,
                                   'vararg': False, 'kwarg': False}])

    #   Test works with just defaults
    #     Test works with default of None
    #     Test works with default of String
    #     Test works with default of Tuple
    #     Test works with default of Number/Float
    def test_just_defaults(self):
        p = self.get_analysis('just_defaults.py')
        self.assertComplexEquals(p.inputs[0], {'default': None,      'kwarg': False, 'optional': True, 'name': 'a', 'vararg': False})
        self.assertComplexEquals(p.inputs[1], {'default': 'test',    'kwarg': False, 'optional': True, 'name': 'b', 'vararg': False})
        self.assertComplexEquals(p.inputs[2], {'default': (1, 2, 3), 'kwarg': False, 'optional': True, 'name': 'c', 'vararg': False})
        self.assertComplexEquals(p.inputs[3], {'default': 10,        'kwarg': False, 'optional': True, 'name': 'd', 'vararg': False})
        self.assertComplexEquals(p.inputs[4], {'default': 10.5,      'kwarg': False, 'optional': True, 'name': 'e', 'vararg': False})

    #   Test works with args and defaults
    def test_args_and_defaults(self):
        p = self.get_analysis('args_and_defaults.py')
        self.assertComplexEquals(p.inputs, ([{'kwarg': False, 'optional': False, 'name': 'a', 'vararg': False},
                                             {'kwarg': False, 'optional': False, 'name': 'b', 'vararg': False},
                                             {'default': 'test', 'kwarg': False, 'optional': True, 'name': 'c', 'vararg': False},
                                             {'default': None, 'kwarg': False, 'optional': True, 'name': 'd', 'vararg': False}]))

    #   Test throws exception on bad syntax
    def test_bad_syntax(self):
        with self.assertRaises(SyntaxError):
            p = self.get_analysis('bad_syntax.py')
            p.inputs

    #   Test throws exception if run couldn't be found
    def test_no_run(self):
        with self.assertRaises(Exception):
            p = self.get_analysis('no_run.py')
            p.inputs


    def test_varargs(self):
        p = self.get_analysis('varargs.py')
        self.assertComplexEquals(p.inputs,
                                 [{'default': [], 'kwarg': False,
                                   'optional': True, 'name': 'args',
                                   'vararg': True}])

    def test_kwargs(self):
        p = self.get_analysis('kwargs.py')
        self.assertComplexEquals(p.inputs,
                                 [{'default': {}, 'kwarg': True,
                                   'optional': True, 'name': 'kwargs',
                                   'vararg': False}])

    def test_varargs_kwargs(self):
        p = self.get_analysis('varargs_kwargs.py')
        self.assertComplexEquals(p.inputs,
                                 [{'default': [], 'kwarg': False,
                                   'optional': True, 'name': 'args',
                                   'vararg': True},
                                  {'default': {}, 'kwarg': True,
                                   'optional': True, 'name': 'kwargs',
                                   'vararg': False}])

    def test_empty_docstring(self):
        p = self.get_analysis('empty_docstring.py')
        self.assertComplexEquals(p.inputs,
                                 [{'kwarg': False, 'optional': False, 'name': 'a', 'vararg': False},
                                  {'kwarg': False, 'optional': False, 'name': 'b', 'vararg': False},
                                  {'default': None, 'kwarg': False, 'optional': True, 'name': 'c', 'vararg': False}])

    def test_docstring_no_field_list(self):
        p = self.get_analysis('no_field_list.py')
        self.assertComplexEquals(p.inputs,
                                 [{'kwarg': False, 'optional': False, 'name': 'a', 'vararg': False},
                                  {'kwarg': False, 'optional': False, 'name': 'b', 'vararg': False},
                                  {'default': None, 'kwarg': False, 'optional': True, 'name': 'c', 'vararg': False}])

    def test_docstring_nonrelevant_params_and_types(self):
        p = self.get_analysis('nonrelevant_params_and_types.py')
        self.assertComplexEquals(p.inputs,
                                 [{'kwarg': False, 'optional': False, 'name': 'a', 'vararg': False},
                                  {'kwarg': False, 'optional': False, 'name': 'b', 'vararg': False},
                                  {'default': None, 'kwarg': False, 'optional': True, 'name': 'c', 'vararg': False}])

    def test_docstring_params(self):
        p = self.get_analysis('params.py')
        self.assertComplexEquals(p.inputs,
                                 [{'description': 'description of a', 'kwarg': False, 'optional': False, 'name': 'a', 'vararg': False},
                                  {'description': 'description of b', 'kwarg': False, 'optional': False, 'name': 'b', 'vararg': False},
                                  {'kwarg': False, 'name': 'c', 'vararg': False, 'default': None, 'optional': True, 'description': 'description of c'}])

    def test_docstring_type(self):
        p = self.get_analysis('type.py')
        self.assertComplexEquals(p.inputs,
                                 [{'type': 'int', 'kwarg': False, 'optional': False, 'name': 'a', 'vararg': False},
                                  {'type': 'int', 'kwarg': False, 'optional': False, 'name': 'b', 'vararg': False},
                                  {'kwarg': False, 'name': 'c', 'vararg': False, 'default': None, 'optional': True, 'type': 'int'}])


    def test_docstring_params_and_type(self):
        p = self.get_analysis('params_and_type.py')
        self.assertComplexEquals(p.inputs,
                                 [{'kwarg': False, 'name': 'a', 'vararg': False, 'type': 'int', 'optional': False, 'description': 'description of a'},
                                  {'kwarg': False, 'name': 'b', 'vararg': False, 'type': 'int', 'optional': False, 'description': 'description of b'},
                                  {'kwarg': False, 'name': 'c', 'vararg': False, 'default': None, 'type': 'int', 'optional': True, 'description': 'description of c'}])



    def test_running_analysis(self):
        p = self.get_analysis('sum_vararg.py')
        self.assertEquals(p(1, 2, 3), 6)



    def test_broken_sum(self):
        p = self.get_analysis('broken_sum.py')

        self.assertEquals(len(p.inputs), 2)
        self.assertComplexEquals(p.inputs,
                                 [{'kwarg': False, 'optional': False, 'name': 'a', 'vararg': False, 'description': 'first summand'},
                                  {'kwarg': False, 'optional': False, 'name': 'b', 'vararg': False, 'description': 'second summand'}])
