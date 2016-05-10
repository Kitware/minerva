import os
import imp
import ast
from docutils import nodes, writers, core
from collections import OrderedDict


class BaseAnalysis(object):
    """Base class for all Analysis objects
    """
    valid_attributes = ['name', 'path']

    def __init__(self, *args, **kwargs):
        for k, v in kwargs.items():
            if k in self.valid_attributes:
                setattr(self, k, v)


###############
# Utility classes used to parse script files
######

class PythonDocTranslator(nodes.SparseNodeVisitor):
    """Basic documentation translator that collets field_list items

    This class provides access to :param:  and :type: fields in a sphinx
    style documentation string.  It is not intended to be used on its own
    but as a 'visitor' defined in a PythonDocParser class. PythonDocParser
    traverses an abstract documentation tree and applies functions defined
    in this class to each node in that tree. In general this means
    PythonDocParser drives the documentation parsing,  but PythonDoctranslator
    does the heavy lifing.
    """
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
                    self.output[var_name].update(
                        {'description': body})

                if kind == 'type':
                    self.output[var_name].update({'type': body})


class PythonDocParser(writers.Writer):
    """PythonDocParser drives the parsing of the function documentation.

    This class implements a relatively generic passthrough,  such that
    it sets it's output to the output of its translator class. In general
    this means you will not need to subclass PythonDocParser,  but instead
    its translator_class (e.g. PythonDocTranslator).
    """
    def __init__(self, translator_class=None):
        writers.Writer.__init__(self)
        self.translator_class = PythonDocTranslator \
            if translator_class is None else translator_class

    def translate(self):
        visitor = self.translator_class(self.document)
        self.document.walk(visitor)
        self.output = visitor.output


class PythonParser(ast.NodeVisitor):
    """Parse a python file and provide metadata about a specific function.

    This class is used to parse a python file using python's built in abstract
    syntax trees (ASTs). This means if the file is valid python it will always
    parse. The class looks through the AST for a specific function and provides
    access to information about that function in a structured way. Information
    comes from the function definition (e.g.  def run(...)) as well as from the
    function documentation.
    """
    RUN_FUNCTION_NAME = "run"

    DOC_PARSER_CLASS = PythonDocParser
    DOC_TRANSLATOR_CLASS = PythonDocTranslator

    def __init__(self, path):
        super(PythonParser, self).__init__()

        self.doc_parser = self.DOC_PARSER_CLASS(
            translator_class=self.DOC_TRANSLATOR_CLASS)

        self.path = path

        self._data = None

        with open(self.path, "r") as fh:
            self.__st = ast.parse(fh.read(), filename=self.path)

        self.visit(self.__st)

    def _v(self, node):
        """Get the values of various ast types."""
        if isinstance(node, ast.Name):
            return node.id if node.id != 'None' else None

        elif isinstance(node, ast.Num):
            return node.n
        elif isinstance(node, ast.Str):
            return node.s
        elif isinstance(node, ast.Tuple):
            return tuple([self._v(n) for n in node.elts])

    def _extend_data(self, arg, key='name'):
        if self._data is None:
            self._data = OrderedDict()

        if key in arg:
            if arg[key] in self._data:
                self._data[arg[key]].update(arg)
            else:
                self._data[arg[key]] = arg

    def handle_run(self, node):
        if node.args.args:
            # Key word boundary - if defaults exists mark the boundary
            # in kwb,  otherwise set the kwb to the length of args (e.g.
            # we only have regular args,  no kwargs)

            kwb = len(node.args.args) - len(node.args.defaults) \
                if node.args.defaults else len(node.args.args)

            for a in node.args.args[0:kwb]:
                self._extend_data({'name': self._v(a),
                                   'vararg': False,
                                   'kwarg': False,
                                   'optional': False})

        if node.args.vararg is not None:
            # Note: we mark optional as true here. This may not be
            #       correct in all cases (e.g. if a function takes
            #       variable arguments but must have at least one
            #       argument).
            self._extend_data({'name': node.args.vararg,
                               'vararg': True,
                               'kwarg': False,
                               'default': [],
                               'optional': True})

        if node.args.defaults:
            kwb = len(node.args.args) - len(node.args.defaults) \
                if node.args.defaults else len(node.args.args)
            for a, d in zip(node.args.args[kwb:],
                            node.args.defaults):
                self._extend_data({'name': self._v(a),
                                   'vararg': False,
                                   'kwarg': False,
                                   'optional': True,
                                   'default': self._v(d)})

        if node.args.kwarg is not None:
            self._extend_data({'name': node.args.kwarg,
                               'vararg': False,
                               'kwarg': True,
                               'default': {},
                               'optional': True})

    def visit_FunctionDef(self, node):
        if node.name == self.RUN_FUNCTION_NAME:
            self.handle_run(node)

            # Function was found but has no arguments
            if self._data is None:
                self._data = OrderedDict()

            if ast.get_docstring(node) and self._data is not None:
                docs = core.publish_string(ast.get_docstring(node),
                                           writer=self.doc_parser)

                for var_name, values in docs.items():
                    # Check to make sure var_name is in self._data before
                    # we add it.  this makes the AST parse the authority on
                    # what variable exist/don't exist, allowing documentation
                    # to just augment this iff it is well formatted
                    if var_name in self._data:
                        self._data[var_name].update(values)

        self.generic_visit(node)

    @property
    def data(self):
        # If inputs was never set,  we nver found a
        # RUN_FUNCTION_NAME function in the file
        if self._data is None:
            raise Exception('%s function not found in %s' %
                            (self.INTERFACE_FUNCTION_NAME, self.path))

        return self._data


class PythonAnalysis(BaseAnalysis):
    """This class models a python analysis file, providing data about
    it's inputs and allowing you to run the analysis.
    """
    INPUT_PARSER_CLASS = PythonParser

    def __init__(self, *args, **kwargs):
        super(PythonAnalysis, self).__init__(*args, **kwargs)
        self._parser = None
        self.opts = {}

    @property
    def inputs(self):
        """Proxy through to the INPUT_PARSER_CLASS's data values

        :returns: inputs to the analysis script
        :rtype: list

        """

        if self._parser is None:
            self._parser = self.INPUT_PARSER_CLASS(self.path)
        return self._parser.data.values()

    # Provide an interface to getting the directory name and script
    # long term we may want to include more sophisticated logic
    # for dealing with scripts at different URIs (e.g. hdfs://, http://)
    # which may require generating temporary directories/files etc
    def _get_path_and_module(self):
        return (os.path.dirname(self.path),
                os.path.splitext(os.path.basename(self.path))[0])

    def run_analysis(self, args, kwargs, opts=None):
        """Run an analysis.

        Note that this function intentionally bears resemblance to the
        Celery signature interface. Options are not currently implemented.

        :param args: list of argument values
        :param kwargs: dict of optional key word arguments
        :param opts: options for how to run the analysis
        :returns: Result of the analysis
        :rtype: Any

        """
        path, name = self._get_path_and_module()

        fp, pathname, desc = imp.find_module(name, [path])

        try:
            module = imp.load_module(name, fp, pathname, desc)
            return module.run(*args, **kwargs)
        finally:
            if fp:
                fp.close()

    #
    def __call__(self, *args, **kwargs):
        """Convienence function for executing the analysis

        :returns: Results of the analysis
        :rtype: Any

        """

        args = [] if args is None else args
        kwargs = {} if kwargs is None else kwargs

        return self.run_analysis(args, kwargs, self.opts)


def get_analysis_obj(params):
    """FIXME! briefly describe function

    :param params: dictionary of paramaters including name, path and type
    :returns: an analysis object derived from BaseAnalysis
    :rtype: object

    """

    atype = params.pop("type", "python")
    return analysis_types[atype](**params)


# Mapping between minerva_analysis 'type' and class
# used by get_analysis_obj to to return the correct object
# given the type stored in the database
analysis_types = {
    "python": PythonAnalysis
}
