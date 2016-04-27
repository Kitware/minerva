import ast
from docutils import nodes, writers, core
from collections import OrderedDict


class BaseAnalysis(object):
    valid_attributes = ['name', 'path']

    def __init__(self, *args, **kwargs):
        for k, v in kwargs.items():
            if k in self.valid_attributes:
                setattr(self, k, v)


class PythonDocParser(writers.Writer):

    class PythonDocTranslator(nodes.SparseNodeVisitor):
        def __init__(self, *args, **kwargs):
            nodes.SparseNodeVisitor.__init__(self, *args, **kwargs)
            self.output = {}

        def visit_field_list(self, node):
            for field in node:
                try:
                    name, body = field
                    assert (isinstance(name, nodes.field_name) and
                            isinstance(body, nodes.field_body) and
                            isinstance(body[0], nodes.paragraph))

                    name, body = str(name[0]), str(body[0][0])

                except (ValueError, IndexError, AssertionError):
                    continue

                if len(name.split()) == 2 and \
                   name.split()[0] in ['param', 'type']:
                    kind, var_name = name.split()[0], name.split()[1]
                    if var_name not in self.output:
                        self.output[var_name] = {}

                    if kind == 'param':
                        self.output[var_name].update({'description': body})

                    if kind == 'type':
                        self.output[var_name].update({'type': body})

    def __init__(self):
        writers.Writer.__init__(self)
        self.translator_class = self.PythonDocTranslator

    def translate(self):
        visitor = self.translator_class(self.document)
        self.document.walk(visitor)
        self.output = visitor.output


class PythonAnalysis(BaseAnalysis):

    class PythonInputParser(ast.NodeVisitor):
        RUN_FUNCTION_NAME = "run"

        def __init__(self, path):
            super(PythonAnalysis.PythonInputParser, self).__init__()
            self.path = path
            self._inputs = None

            with open(self.path, "r") as fh:
                self.__st = ast.parse(fh.read(), filename=self.path)

            self.visit(self.__st)

        def __v(self, node):
            """Get the values of various ast types."""
            if isinstance(node, ast.Name):
                return node.id if node.id != 'None' else None

            elif isinstance(node, ast.Num):
                return node.n
            elif isinstance(node, ast.Str):
                return node.s
            elif isinstance(node, ast.Tuple):
                return tuple([self.__v(n) for n in node.elts])

        def __extend_inputs(self, arg):
            if self._inputs is None:
                self._inputs = OrderedDict()

            if 'name' in arg:
                key = arg['name']
                if key in self._inputs:
                    self._inputs[key].update(arg)
                else:
                    self._inputs[key] = arg

        def __handle_run(self, node):
            if node.args.args:
                # Key word boundary - if defaults exists marke the boundary
                # in kwb,  otherwise set the kwb to the length of args (e.g.
                # we only have regular args,  no kwargs)

                kwb = len(node.args.args) - len(node.args.defaults) \
                    if node.args.defaults else len(node.args.args)

                for a in node.args.args[0:kwb]:
                    self.__extend_inputs({'name': self.__v(a),
                                          'vararg': False,
                                          'kwarg': False,
                                          'optional': False})

            if node.args.vararg is not None:
                # Note: we mark optional as true here. This may not be
                #       correct in all cases (e.g. if a function takes
                #       variable arguments but must have at least one
                #       argument).
                self.__extend_inputs({'name': node.args.vararg,
                                      'vararg': True,
                                      'kwarg': False,
                                      'default': [],
                                      'optional': True})

            if node.args.defaults:
                kwb = len(node.args.args) - len(node.args.defaults) \
                    if node.args.defaults else len(node.args.args)
                for a, d in zip(node.args.args[kwb:],
                                node.args.defaults):
                    self.__extend_inputs({'name': self.__v(a),
                                          'vararg': False,
                                          'kwarg': False,
                                          'optional': True,
                                          'default': self.__v(d)})

            if node.args.kwarg is not None:
                self.__extend_inputs({'name': node.args.kwarg,
                                      'vararg': False,
                                      'kwarg': True,
                                      'default': {},
                                      'optional': True})

            # Function was found but has no arguments
            if self._inputs is None:
                self._inputs = OrderedDict()

        def visit_FunctionDef(self, node):
            if node.name == self.RUN_FUNCTION_NAME:
                self.__handle_run(node)
                if ast.get_docstring(node):
                    docs = core.publish_string(ast.get_docstring(node),
                                               writer=PythonDocParser())

                    for var_name, values in docs.items():
                        if var_name in self._inputs:
                            self._inputs[var_name].update(values)

            self.generic_visit(node)

        @property
        def inputs(self):
            # If inputs was never set,  we nver found a
            # RUN_FUNCTION_NAME function in the file
            if self._inputs is None:
                raise Exception('%s function not found in %s' %
                                (self.INTERFACE_FUNCTION_NAME, self.path))

            return self._inputs

    def __init__(self, *args, **kwargs):
        super(PythonAnalysis, self).__init__(*args, **kwargs)
        self._parser = None

    @property
    def inputs(self):
        if self._parser is None:
            self._parser = self.PythonInputParser(self.path)
        return self._parser.inputs.values()

    def __call__(self, args, kwargs, opts=None):
        pass


def get_analysis_obj(params):
    atype = params.pop("type", "python")
    return analysis_types[atype](**params)

analysis_types = {
    "python": PythonAnalysis
}
