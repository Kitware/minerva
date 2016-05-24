from setuptools import setup

setup(name='minerva.geo',
      version='0.0.0.dev1',
      description='Minerva: client/server/services for analysis and visualization',
      url='https://github.com/kitware/minerva',
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
      packages=['minerva'],
      zip_safe=False)
