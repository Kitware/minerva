import os
from distutils.core import setup

def read(*rnames):
    return open(os.path.join(os.path.dirname(__file__), *rnames)).read()

setup(
    name="geonodegp",
    version="0.2",
    author="",
    author_email="",
    description="geonodegp project, based on GeoNode",
    long_description=(read('README.rst')),
    # Full list of classifiers can be found at:
    # http://pypi.python.org/pypi?%3Aaction=list_classifiers
    classifiers=[
        'Development Status :: 1 - Planning',
    ],
    license="BSD",
    keywords="geonode django",
    url='https://github.com/mbertrand/geonode-geonodegp',
    packages=['geonodegp',],
    install_requires=[
      'psycopg2',
      'requests',
      'celery[redis]',
      'redis',
      'flower',
      'geopy',
      'fiona',
      'unicodecsv',
      'shapely',
      'pymongo',
      'numpy',
      'gunicorn'
    ],
    include_package_data=True,
    zip_safe=False,
)
