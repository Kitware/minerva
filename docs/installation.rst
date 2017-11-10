Installation
============

These installation instructions are aimed at developers and will install Girder, and Minerva from source.

The top level directory of Girder cloned by git will be GIRDER_DIR.

Install of system dependencies
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Ubuntu 14.04
^^^^^^^^^^^^

Update apt package indices before you start.

::

    sudo apt-get update

-  See `Girder system prerequisites for Ubuntu`_
-  See `Girder install from source`_

.. _Girder system prerequisites for Ubuntu: http://girder.readthedocs.org/en/latest/prerequisites.html#debian-ubuntu
.. _Girder install from source: http://girder.readthedocs.org/en/latest/installation.html#install-from-git-checkout


- Install Minerva system dependencies

::

    sudo apt-get install libgdal-dev libnetcdf-dev libpng12-dev pkg-config


Fedora 22
^^^^^^^^^

::

    sudo dnf install git gcc-c++ libffi-devel make python-devel python-pip geos-devel gdal-devel netcdf-devel hdf5-devel

-  See `installing mongo on Red Hat`_
-  See `installing node.js on Red Hat`_

.. _installing mongo on Red Hat: http://docs.mongodb.org/manual/tutorial/install-mongodb-on-red-hat/#install-mongodb
.. _installing node.js on Red Hat: https://nodejs.org/en/download/package-manager/#enterprise-linux-and-fedora


Conda
^^^^^

Conda installation and conda environment setup should be the first step in
creating a development environment for Minerva.

- Install Conda (https://conda.io/miniconda.html)

- Create minerva development environment

::

    mkdir MINERVA_DIR (pick name of your choice)
    cd MINERVA_DIR
    git clone https://github.com/Kitware/minerva.git
    cd minerva
    conda env create -f conda_env.yml python=2.7
    source activate minerva-dev

- Run mongo daemon

::

    mongod &

Notes:

- If mongod fails to start with a message related to dbpath then follow the step below

::

    mkdir MONGO_DATA (directory of your choice)
    mongod --dbpath PATH_TO_MONGO_DATA &

- Install Girder

::

    cd ..
    git clone https://github.com/girder/girder.git
    cd girder
    pip install -e .
    girder-install web

Notes:

- Make sure that conda minerva-dev environment is active (source activate minerva-dev)
  for the next steps.


Now proceed to setup Girder admin user and assetstore in the next section

Setup Girder admin user and assetstore
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

- `Run Girder`_ to ensure that it works.  Mongo should already be running,
and you should follow the instructions for a source tree install (ignore
if using conda environment instructions above).

.. _Run Girder: http://girder.readthedocs.org/en/latest/installation.html#run
- Navigate to Girder in your browser, register an admin user.
- Navigate to the Admin console in Girder, when you are logged in as an admin user, then click on the Assetstores section.
- Create a default Assetstore.

Install KTile as a Girder plugin
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

This is needed because minerva depends on Girder KTile plugin.

- Install girder_ktile plugin.

::

    git clone https://github.com/OpenGeoscience/girder_ktile
    girder-install plugin -s girder_ktile
    girder-install web --dev --plugins girder_ktile

Install database_assetstore as a Girder plugin
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

This is needed because minerva depends on database_assetstore plugin.

- Install girder_db_items plugin.

::

    git clone https://github.com/OpenGeoscience/database_assetstore
    girder-install plugin -s database_assetstore
    girder-install web --dev --plugins database_assetstore


Install of Minerva as a Girder plugin
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Notes:

- You can skip the cloning step below if you are using Conda environment.

-  Clone the Git repository.

::

    git clone https://github.com/Kitware/minerva.git

-  Install Minerva as Girder plugin.

::

    girder-install plugin -s minerva
    girder-install web --dev --plugins minerva

Notes:

- If the cryptography pip package in Girder fails to install, or fails when running Girder, try this

::

    sudo pip uninstall cffi
    sudo pip uninstall cryptography
    sudo pip install -U cryptography

Configure Minerva
~~~~~~~~~~~~~~~~~

-  copy the ``minerva.dist.cfg`` file, located in the GIRDER_DIR/plugins/minerva/server/conf
   directory, to ``minerva.local.cfg`` in that same directory. Any
   property in ``minerva.local.cfg`` will take precedent over any
   property with the same name in ``minerva.dist.cfg``. If the
   ``minerva.local.cfg`` file is absent, values will be read from
   ``minerva.dist.cfg``. Change the ``encrypt_key`` value in
   ``minerva.local.cfg`` file; the value should
   be a 32 byte url-safe base-64 encoded string. You can either replace
   the existing string with one of equal length, using letters and
   numbers, and ending with an ‘=’, or generate one within python with
   the following code

::

    from cryptography.fernet import Fernet
    Fernet.generate_key()

-  Run the Girder server

::

    cd GIRDER_DIR
    python -m girder

or

::

    girder-server



- Navigate to the Admin console in Girder, when you are logged in as an admin user, then click on the Plugins section.

- Enable the Minerva plugin, which will enable Gravatar, and Jobs plugins.  Click the button to restart the server.

This will serve Minerva as your top level application. Girder will now
be served at your top level path with ``/girder``.

- When the server is restarted, refresh the page, you will need to remove #/plugins from your URL as this is no longer valid.


Example:

Pre-Minerva:

    http://localhost:8080 => serves Girder

Post-Minerva:

    http://localhost:8080 => serves Minerva

    http://localhost:8080/girder => serves Girder

Data services
~~~~~~~~~~~~~

Several minerva components rely on having a data services server up and running.  You can
either connect to an existing server or spin up a local server using vagrant.  See
the :doc:`deploy-data-services` section for more details.
