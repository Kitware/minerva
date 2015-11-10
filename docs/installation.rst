Installation
============

Install of system dependencies
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Ubuntu 14.04
^^^^^^^^^^^^

This includes all system dependencies necessary for running Girder. So
if you have a running Girder installation, many of these will already be
satisfied.

::

    sudo apt-get update
    sudo apt-get install curl g++ git libffi-dev make python-dev python-pip libfreetype6-dev libpng12-dev pkg-config libgdal-dev
    sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
    echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen'     | sudo tee /etc/apt/sources.list.d/mongodb.list
    sudo apt-get update
    sudo apt-get install mongodb-org-server
    curl -sL https://deb.nodesource.com/setup | sudo bash -
    sudo apt-get install nodejs

Fedora 22
^^^^^^^^^

::

    sudo dnf install git gcc-c++ libffi-devel make python-devel python-pip freetype-devel geos-devel gdal-devel netcdf-devel hdf5-devel

-  See `installing mongo on Red Hat`_
-  See `installing node.js on Red Hat`_

.. _installing mongo on Red Hat: http://docs.mongodb.org/manual/tutorial/install-mongodb-on-red-hat/#install-mongodb
.. _installing node.js on Red Hat: https://nodejs.org/en/download/package-manager/#enterprise-linux-and-fedora

Install of Minerva as a Girder plugin
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-  clone Minerva into the Girder plugins dir
-  pip install the ``minerva/requirements.txt``

   pip install -r requirements.txt

-  run npm install at the top level ``girder`` directory to get all javascript
   dependencies and build the girder application

   npm install

-  copy the ``minerva.dist.cfg`` file, located in the server/conf
   directory, to ``minerva.local.cfg`` in that same directory. Any
   property in ``minerva.local.cfg`` will take precedent over any
   property with the same name in ``minerva.dist.cfg``. Change the
   ``encrypt_key`` value in ``minerva.local.cfg`` file; the value should
   be a 32 byte url-safe base-64 encoded string. You can either replace
   the existing string with one of equal length, using letters and
   numbers, and ending with an ‘=’, or generate one within python with
   the following code::

::

    from cryptography.fernet import Fernet
    Fernet.generate_key()

-  enable the Minerva plugin through the Girder Admin console
-  restart Girder through the Girder Admin console

This will server Minerva as your top level application. Girder will now
be served at your top level path with ``/girder``.

Example:

Pre-Minerva:

http://localhost:8080 => serves Girder

Post-Minerva:

http://localhost:8080 => serves Minerva http://localhost:8080/girder =>
serves Girder
