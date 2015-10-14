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

-  run npm install in the ``minerva`` directory to get Minerva’s JS
   dependencies

   npm install

-  grunt at the top level in the ``girder`` directory to build Minerva

   grunt

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

Installing a specific version of GeoJs for development
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

This is to get around the fact that npm is for installing packages, not
managing source repositories. So when npm installs geojs, it doesn’t
install it as a git repo with the .git dir.

Minerva currently tracks the latest released version of geojs from npm.

If you need to use Minerva with a specific reference of geojs that isn't the current release version held in npm, do the following

1. from the minerva top level dir, cd node_modules
2. remove or move geojs, e.g. mv geojs geojs_fromnpm
3. git clone https://github.com/OpenGeoscience/geojs.git
4. cd geojs
5. checkout from git whatever branch or reference you are interested in, e.g. git checkout experimental_branch

From here, you are just following the geojs build instructions.

1. git submodule init
2. git submodule update
3. npm install
4. grunt
   
At this point geojs/dist/built/geo.min.js should be rebuilt, and this will be included the next time minerva is built by grunt-ing at the top level of girder. Note that if geojs/dist/* exists geojs/dist/built/geo.min.js will be used rather than geojs/geo.min.js

.. toctree::
   :maxdepth: 2

   installation
   api-documentation
   creating-a-source
