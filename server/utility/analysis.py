from girder.utility.model_importer import ModelImporter


class BaseAnalysis(object):
    valid_attributes = ['name', 'path' ]

    def __init__(self, *args, **kwargs):
        for k, v in kwargs.items():
            if k in self.valid_attributes:
                setattr(self, k, v)

class PythonAnalysis(BaseAnalysis):
    def __init__(self, *args, **kwargs):
        super(PythonAnalysis, self).__init__(*args, **kwargs)

        self._inputs = None

    @property
    def inputs(self):
        if self._inputs is None:
            with open(self.path, "rb") as fh:
                code_string = fh.read()

            # Do AST stuff here
            inputs = code_string

            self._inputs = inputs
        return self._inputs

    def run(self, args, kwargs, opts=None):
        pass

def get_analysis_obj(params):
    atype = params.pop("type", "python")
    return analysis_types[atype](**params)

analysis_types = {
    "python": PythonAnalysis
}
