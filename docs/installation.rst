Installation
============

These installation instructions are aimed at developers and will install Girder, Minerva, and Romanesco from source.

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

    sudo apt-get install libfreetype6-dev libpng12-dev pkg-config libgdal-dev

- Install Romanesco dev system dependencies

::

    sudo apt-get install libxml2-dev libxslt1-dev

Fedora 22
^^^^^^^^^

::

    sudo dnf install git gcc-c++ libffi-devel make python-devel python-pip freetype-devel geos-devel gdal-devel netcdf-devel hdf5-devel

-  See `installing mongo on Red Hat`_
-  See `installing node.js on Red Hat`_

.. _installing mongo on Red Hat: http://docs.mongodb.org/manual/tutorial/install-mongodb-on-red-hat/#install-mongodb
.. _installing node.js on Red Hat: https://nodejs.org/en/download/package-manager/#enterprise-linux-and-fedora


Setup Girder admin user and assetstore
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

- `Run Girder`_ to ensure that it works.  Mongo should already be running, and you should follow the instructions for a source tree install.

.. _Run Girder: http://girder.readthedocs.org/en/latest/installation.html#run
- Navigate to Girder in your browser, register an admin user.
- Navigate to the Admin console in Girder, when you are logged in as an admin user, then click on the Assetstores section.
- Create a default Assetstore.

Install of Minerva as a Girder plugin
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-  Install Romanesco, a dependency of Minerva, into the Girder plugins dir from source.

::

    cd GIRDER_DIR/plugins
    git clone https://github.com/Kitware/romanesco.git

-  Install Minerva into the Girder plugins dir from source.

::

    cd GIRDER_DIR/plugins
    git clone https://github.com/Kitware/minerva.git

-  Install the Python dependencies of Girder plugins, including dev dependencies.

::

    cd GIRDER_DIR
    export IGNORE_PLUGINS=celery_jobs,geospatial,google_analytics,hdfs_assetstore,jquery_widgets,metadata_extractor,mongo_search,oauth,provenance,thumbnails,user_quota,vega;
    scripts/InstallPythonRequirements.py --mode=dev --ignore-plugins=${IGNORE_PLUGINS}

Notes:

- The dev Python dependency lxml in Romanesco may require a large amount of memory to install
- If the cryptography pip package in Girder fails to install, or fails when running Girder, try this

::

    sudo pip uninstall cffi
    sudo pip uninstall cryptography
    sudo pip install -U cryptography


- Build the client side of Minerva and Romanesco

::

    cd GIRDER_DIR
    npm install

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
   the following code::

::

    from cryptography.fernet import Fernet
    Fernet.generate_key()

-  Run the Girder server

::

    cd GIRDER_DIR
    python -m girder



Because Romanesco is a Girder plugin that is a dependency of Minerva, when you enable the Minerva Girder plugin, you will also enable the Romanesco Girder plugin.

To see more details about this on Romanesco, though you will not need to follow it, see `Install Romanesco as a Girder plugin`_

..  _Install Romanesco as a Girder plugin: http://romanesco.readthedocs.org/en/latest/installation.html#installing-the-girder-plugin

- Navigate to the Admin console in Girder, when you are logged in as an admin user, then click on the Plugins section.

- Enable the Minerva plugin, which will enable Gravatar, Jobs, and Romanesco plugins.  Click the button to restart the server.

This will serve Minerva as your top level application. Girder will now
be served at your top level path with ``/girder``.

- When the server is restarted, refresh the page, you will need to remove #/plugins from your URL as this is no longer valid.


Example:

Pre-Minerva:

    http://localhost:8080 => serves Girder

Post-Minerva:

    http://localhost:8080 => serves Minerva

    http://localhost:8080/girder => serves Girder

Run the Romanesco Celery Worker
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Configure Romanesco inside the GIRDER_DIR/plugins/romanesco/romanesco directory, creating worker.local.cfg and setting spark as an enabled plugin.

-  See `Configuration of Romanesco`_

.. _Configuration of Romanesco: http://romanesco.readthedocs.org/en/latest/installation.html#configuration

- Run Spark

Here we install spark to the user's home directory, though you can install it anywhere you like.  The important thing is to have the SPARK_HOME environment variable point to the install location.

::

    cd ~/
    sudo apt-get install openjdk-7-jre-headless
    wget http://www.scala-lang.org/files/archive/scala-2.10.5.tgz
    tar xzvf scala-2.10.5.tgz -C ~
    export SCALA_HOME=$HOME/scala-2.10.5
    export PATH=$PATH:$SCALA_HOME/bin
    # this may not work
    wget http://psg.mtu.edu/pub/apache/spark/spark-1.3.1/spark-1.3.1-bin-hadoop2.4.tgz
    # this may not be stable, and you only need to run this if the above didn't work
    wget http://d3kbcqa49mib13.cloudfront.net/spark-1.3.1-bin-hadoop2.4.tgz
    tar xzvf spark-1.3.1-bin-hadoop2.4.tgz -C ~
    export SPARK_MASTER_IP=localhost
    export SPARK_HOME=$HOME/spark-1.3.1-bin-hadoop2.4
    # Prevent a collision with the Girder server on 8080
    export SPARK_MASTER_WEBUI_PORT=8081
    $SPARK_HOME/sbin/start-master.sh
    $SPARK_HOME/sbin/start-slave.sh worker1 spark://localhost:7077
    # this next command should show you two java spark processes, a worker and a master
    ps aux | grep java

- Run the Romanesco (Celery) worker

::

    cd GIRDER_DIR/plugins/romanesco
    pip install -e .[spark]
    python -m romanesco

You should see in the Celery output

    Loaded plugin "spark"

- Restart Girder with the environment setup for Romanesco

::

    cd GIRDER_DIR
    export SPARK_HOME=$HOME/spark-1.3.1-bin-hadoop2.4
    export PATH=$PATH:$SPARK_HOME/bin
    python -m girder

- In the Girder Admin Console, in the Romanesco plugin config, add a user or group who can use Romanesco
