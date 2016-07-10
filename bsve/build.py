#!/usr/bin/env python

"""Build the main index.html for the minerva BSVE application."""

from __future__ import print_function
import sys
import os
from girder.utility import server

stdout = sys.stdout
sys.stdout = sys.stderr
root = server.setup(plugins=['minerva']).root
path = os.path.abspath(os.path.dirname(__file__))
host = 'https://minerva-beta.bsvecosystem.net/'


def compile(template):
    """Compile the BSVE mako template and return HTML string."""
    root.template = template
    root.vars['host'] = host
    return root.GET()


if __name__ == '__main__':
    import sys

    template = os.path.join(path, 'index.mako')
    with open(template) as f:
        print(compile(f.read()), file=stdout)
