.. Minerva documentation master file, created by
   sphinx-quickstart on Mon Oct 12 19:45:21 2015.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

Minerva: A Girder plugin for geospatial visualization
=====================================================

What is Minerva?
----------------

Minerva is an open source platform for geospatial visualization using `Girder`_ as it's datastore.

Glossary
--------

Source
~~~~~~
A source produces data. A source itself cannot be visualized, but a source can create a dataset that can be visualized, or it can be the input to an analysis, which then creates a dataset that can be visualized.

.. seealso::

   Information on creating a source can be found `here`_.

.. _here: https://google.com

Dataset
~~~~~~~
A dataset contains data and can be visualized, either on a map or through some other means.

Analysis
~~~~~~~~
An analysis creates a dataset, but running some client side or server side process, and potentially using datasets and sources as inputs.

Session
~~~~~~~


.. _Girder: https://girder.readthedocs.org

Table of Contents
-----------------

.. toctree::
   :maxdepth: 2

   developer-documentation

