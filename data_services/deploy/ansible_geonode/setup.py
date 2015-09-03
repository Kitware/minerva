import os
from distutils.core import setup

def read(*rnames):
    return open(os.path.join(os.path.dirname(__file__), *rnames)).read()

setup(
    name="riskinfo_lk",
    version="0.2",
    author="",
    author_email="",
    description="riskinfo_lk, based on GeoNode",
    long_description=(read('README.rst')),
    # Full list of classifiers can be found at:
    # http://pypi.python.org/pypi?%3Aaction=list_classifiers
    classifiers=[
        'Development Status :: 1 - Planning',
    ],
    license="BSD",
    keywords="riskinfo_lk geonode django",
    url='https://github.com/riskinfo-lk/riskinfo_lk2',
    packages=['riskinfo_lk',],
    include_package_data=True,
    zip_safe=False,
    install_requires=[
        'django-tastypie==0.11.0',
        'geonode==2.4b25',
    ]
)
