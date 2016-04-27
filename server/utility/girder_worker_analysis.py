from analysis import PythonParser, PythonDocTranslator, PythonAnalysis
from docutils import nodes
from collections import OrderedDict


SCRIPT_INPUTS_NO_OUTPUTS = """
import imp
fp, pathname, desc = imp.find_module('{module}', ['{path}'])
module = imp.load_module('{module}', fp, pathname, desc)
module.run({arguments})
"""

SCRIPT_OUTPUTS_NO_INPUTS = """
import imp
fp, pathname, desc = imp.find_module('{module}', ['{path}'])
module = imp.load_module('{module}', fp, pathname, desc)
{output} = module.run()
"""

SCRIPT_INPUTS_AND_OUTPUTS = """
import imp
fp, pathname, desc = imp.find_module('{module}', ['{path}'])
module = imp.load_module('{module}', fp, pathname, desc)
{output} = module.run({arguments})
"""

SCRIPT_NO_INPUTS_NO_OUTPUTS = """
import imp
fp, pathname, desc = imp.find_module('{module}', ['{path}'])
module = imp.load_module('{module}', fp, pathname, desc)
module.run()
"""


class GirderWorkerInputPythonDocTranslator(PythonDocTranslator):
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
               name.split()[0] in ['type', 'format',
                                   'target', 'filename']:
                kind, var_name = name.split()[0], name.split()[1]
                if var_name not in self.output:
                    self.output[var_name] = {}

                self.output[var_name].update({kind: body})


class GirderWorkerPythonInputParser(PythonParser):
    DOC_TRANSLATOR_CLASS = GirderWorkerInputPythonDocTranslator

    def handle_run(self, node):

        if node.args.vararg is not None or node.args.kwarg is not None:
            raise Exception("Girder worker requires explicitly " +
                            "defined args and kwargs.")

        if node.args.args:
            # Key word boundary - if defaults exists mark the boundary
            # in kwb,  otherwise set the kwb to the length of args (e.g.
            # we only have regular args,  no kwargs)

            kwb = len(node.args.args) - len(node.args.defaults) \
                if node.args.defaults else len(node.args.args)

            for a in node.args.args[0:kwb]:
                self._extend_data({'id': self._v(a)}, key='id')

        if node.args.defaults:
            kwb = len(node.args.args) - len(node.args.defaults) \
                if node.args.defaults else len(node.args.args)
            for a, d in zip(node.args.args[kwb:],
                            node.args.defaults):
                self._extend_data({'id': self._v(a),
                                   'default': self._v(d)}, key='id')


class GirderWorkerOutputPythonDocTranslator(PythonDocTranslator):
    # Outputs must be ordered correctly so set output to OrderedDict
    # instead of just a regular dictionary
    def __init__(self, *args, **kwargs):
        PythonDocTranslator.__init__(self, *args, **kwargs)
        self.output = OrderedDict()

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

            if len(name.split()) == 3 and \
               name.split()[0] == 'return' and \
               name.split()[1] in ['type', 'format', 'target', 'filename']:
                kind, var_name = name.split()[1], name.split()[2]
                if var_name not in self.output:
                    self.output[var_name] = {'id': var_name}

                self.output[var_name].update({kind: body})


class GirderWorkerPythonOutputParser(PythonParser):
    DOC_TRANSLATOR_CLASS = GirderWorkerOutputPythonDocTranslator

    # Noop on the AST,  we're only interested in the documentation
    def handle_run(self, node):
        pass


class GirderWorkerPythonAnalysis(PythonAnalysis):
    INPUT_PARSER_CLASS = GirderWorkerPythonInputParser
    OUTPUT_PARSER_CLASS = GirderWorkerPythonOutputParser

    def __init__(self, *args, **kwargs):
        super(GirderWorkerPythonAnalysis, self).__init__(*args, **kwargs)
        self._input_parser = None
        self._output_parser = None

    @property
    def inputs(self):
        if self._input_parser is None:
            self._input_parser = self.INPUT_PARSER_CLASS(self.path)
        return self._input_parser.data.values()

    @property
    def outputs(self):
        if self._output_parser is None:
            self._output_parser = self.OUTPUT_PARSER_CLASS(self.path)
        return self._output_parser.data.values()

    @property
    def spec(self):
        path, name = self._get_path_and_module()

        if len(self.inputs):
            if len(self.outputs):
                script = SCRIPT_INPUTS_AND_OUTPUTS.format(
                    **{'module': name,
                       'path': path,
                       'arguments': ', '.join([a['id'] for a in self.inputs]),
                       'output': ', '.join([o['id'] for o in self.outputs])})
            else:
                script = SCRIPT_INPUTS_NO_OUTPUTS.format(
                    **{'module': name,
                       'path': path,
                       'arguments': ', '.join([a['id'] for a in self.inputs])})
        elif len(self.outputs):
            script = SCRIPT_OUTPUTS_NO_INPUTS.format(
                **{'module': name,
                   'path': path,
                   'output': ', '.join([o['id'] for o in self.outputs])})
        else:
            script = SCRIPT_OUTPUTS_NO_INPUTS.format(
                **{'module': name,
                   'path': path})

        return {"mode": "python",
                "script": script,
                "inputs": self.inputs,
                "output": self.outputs}

if __name__ == "__main__":
    p = GirderWorkerPythonAnalysis(name='sum', path='/tmp/sum.py')
    from pprint import pprint
    pprint(p.spec)
