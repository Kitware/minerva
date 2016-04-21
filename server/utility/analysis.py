import ast

class BaseAnalysis(object):
    valid_attributes = ['name', 'path' ]

    def __init__(self, *args, **kwargs):
        for k, v in kwargs.items():
            if k in self.valid_attributes:
                setattr(self, k, v)


class PythonAnalysis(BaseAnalysis):

    class PythonInputParser(ast.NodeVisitor):
        INTERFACE_FUNCTION_NAME = "run"

        def __init__(self, path):
            super(PythonAnalysis.PythonInputParser, self).__init__()
            self.path = path
            self._inputs = None

            with open(self.path, "r") as fh:
                self.__st = ast.parse(fh.read(), filename=self.path)

            self.visit(self.__st)

        def __v(self, node):
            """ Get the values of various ast types."""
            if isinstance(node, ast.Name):
                return node.id
            elif isinstance(node, ast.Num):
                return node.n
            elif isinstance(node, ast.Str):
                return node.s
            elif isinstance(node, ast.Tuple):
                return tuple([self.__v(n) for n in node.elts])

        def visit_FunctionDef(self, node):
            if node.name == self.INTERFACE_FUNCTION_NAME:
                if node.args.args:
                    # Key word boundary - if defaults exists marke the boundary
                    # in kwb,  otherwise set the kwb to the length of args (e.g.
                    # we only have regular args,  no kwargs)
                    kwb = len(node.args.args) - len(node.args.defaults) \
                        if node.args.defaults else len(node.args.args)

                    self._inputs = [{'name': self.__v(a),
                                     'optional': False}
                                    for a in node.args.args[0:kwb]]

                    self._inputs.extend([{'name': self.__v(a),
                                          'optional': True,
                                          'default': self.__v(d)}
                                         for a, d in zip(node.args.args[kwb:],
                                                         node.args.defaults)])
                else:
                    # Function was found but has no arguments
                    self._inputs = []

            self.generic_visit(node)

        @property
        def inputs(self):
            # If inputs was never set,  we nver found an
            # INTERFACE_FUNCTION_NAME function in the file
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
        return self._parser.inputs

    def __call__(self, args, kwargs, opts=None):
        pass


def get_analysis_obj(params):
    atype = params.pop("type", "python")
    return analysis_types[atype](**params)

analysis_types = {
    "python": PythonAnalysis
}
