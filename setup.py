from setuptools import setup, find_packages
from pip.req import parse_requirements

install_reqs = list(parse_requirements('requirements.txt', session=False))
reqs = [str(ir.req) if not ir.original_link else str(ir.req).split('-')[0] for ir in install_reqs]
dep_links = [str(ir.original_link) for ir in install_reqs if ir.original_link]

setup(name='minerva.geo',
      version='0.0.0.dev1',
      description='Minerva: client/server/services for analysis and visualization',
      url='https://github.com/kitware/minerva',
      install_requires=reqs,
      dependency_links=dep_links,
      author='Kitware Inc',
      author_email='minerva-developers@kitware.com',
      license='Apache v2',
      classifiers=[
          'Development Status :: 2 - Pre-Alpha',
          'License :: OSI Approved :: Apache Software License'
          'Topic :: Scientific/Engineering :: GIS',
          'Intended Audience :: Science/Research',
          'Natural Language :: English',
          'Programming Language :: Python'
      ],
      packages=find_packages(exclude=['tests*', 'server*', 'docs']),
      entry_points={
          'gaia.plugins': [
              "gaia_tasks.inputs = gaia_tasks.inputs",
          ],
          'girder_worker_plugins': [
              'gaia_tasks = gaia_tasks:GaiaTasks',
          ]
      },
      zip_safe=False)
