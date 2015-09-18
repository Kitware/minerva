from romanesco import specs

class MinervaTask(specs.Task):

    __inputs__ = specs.PortList([])
    __outputs__ = specs.PortList([])

    script_template = """
from {mod} import {cls}

if __name__ == "__romanesco__":
    {outputs} = {cls}().run({inputs})
"""

    def __init__(self, *args, **kwargs):
        super(MinervaTask, self).__init__({}, **kwargs)
        self['mode'] = "python"
        self['write_script'] = True

        # The dict passed in here is a huge hack that needs to be resolved
        # Tasks should be importable in Minerva
        import pudb; pu.db
        self['script'] = self.script_template.format(**{
            "mod": self.__class__.__module__,
            "cls": self.__class__.__name__,
            "inputs": ", ".join([p['name'] for p in self.__inputs__]),
            "outputs": ", ".join([p['name'] for p in self.__outputs__])
        })

    def run(self, *args, **kwargs):
        raise Exception("run() must be implemented in a subclass")


class MinervaSparkTask(MinervaTask):
    script_template = """
from {mod} import {cls}

if __name__ == "__romanesco__":
    {outputs} = {cls}().set_context(sc).run({inputs})
"""

    def __init__(self, *args, **kwargs):
        super(MinervaSparkTask, self).__init__(*args, **kwargs)
        self['mode'] = 'spark.python'

    def set_context(self, sc=None):
        self.sc = sc
        return self


__all__ = ["MinervaTask", "MinervaSparkTask"]
