## Minerva: A Girder plugin for geospatial visualization

Assumes you have a running version of Girder.

### Running Minerva

#### Install of system dependencies

##### Ubuntu 14.04

This includes all system dependencies necessary for running Girder.  So if you have a running Girder installation, many of these
will already be satisfied.

- sudo apt-get update
- sudo apt-get install curl g++ git libffi-dev make python-dev python-pip libfreetype6-dev libpng12-dev pkg-config libgdal-dev
- sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
- echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen'     | sudo tee /etc/apt/sources.list.d/mongodb.list
- sudo apt-get update
- sudo apt-get install mongodb-org-server
- curl -sL https://deb.nodesource.com/setup | sudo bash -
- sudo apt-get install nodejs

##### Fedora 22

- sudo dnf install git gcc-c++ libffi-devel make python-devel python-pip freetype-devel geos-devel gdal-devel netcdf-devel hdf5-devel
- See [installing mongo on Red Hat](http://docs.mongodb.org/manual/tutorial/install-mongodb-on-red-hat/#install-mongodb)
- See [installing node.js on Red Hat](https://nodejs.org/en/download/package-manager/#enterprise-linux-and-fedora)

#### Install of Minerva as a Girder plugin

- clone Minerva into the Girder plugins dir
- pip install the `minerva/requirements.txt`

    pip install -r requirements.txt

- run npm install in the `minerva` directory to get Minerva's JS dependencies

    npm install

- grunt at the top level in the `girder` directory to build Minerva

    grunt

- enable the Minerva plugin through the Girder Admin console
- restart Girder through the Girder Admin console

This will server Minerva as your top level application.  Girder will
now be served at your top level path with `/girder`.

Example:

Pre-Minerva:

http://localhost:8080           => serves Girder

Post-Minerva:

http://localhost:8080           => serves Minerva
http://localhost:8080/girder    => serves Girder


#### Installing a specific version of GeoJs for development

This is to get around the fact that npm is for installing packages, not managing source repositories.  So when npm installs geojs, it doesn't install it as a git repo with the .git dir.

Minerva currently tracks the latest released version of geojs from npm.

If you need to use Minerva with a specific reference of geojs that isn't the current release version held in npm, do the following

  1. from the minerva top level dir, `cd node_modules`
  2. remove or move geojs, e.g. `mv geojs geojs_fromnpm`
  3. `git clone https://github.com/OpenGeoscience/geojs.git`
  4. `cd geojs`
  5. checkout from git whatever branch or reference you are interested in, e.g. `git checkout experimental_branch`

From here, you are just following the geojs build instructions.

  6. `git submodule init`
  7. `git submodule update`
  8. `npm install`
  9. `grunt`

At this point geojs/dist/built/geo.min.js should be rebuilt, and this will be included the next time minerva is built by `grunt`-ing at the top level of girder. Note that if geojs/dist/* exists geojs/dist/built/geo.min.js will be used rather
than geojs/geo.min.js

#### Setup for NEX/Spark/Romanesco mean_contour_analysis

  1. From the minerva top level dir, install the mean_contour_analysis in your minerva instance

```
$> cd utility
$> python import_analyses.py \
--username user \
--password password \
--port 8080 \
--path /path/to/minerva/analyses/NEX/
```

  Now you should see the mean_contour_analysis in your `Analysis Panel` in minerva.
  
  2. Clone romanesco into the `girder/plugins` directory

```
$> cd /path/to/girder/plugins
$> git clone https://github.com/Kitware/romanesco.git
```

  3. install Romanesco dependencies via pip

```
$> cd /path/to/girder/plugins/romanesco
$> pip install -r requirements.txt
```

  4. Install Spark.  You can install in a local cluster mode, and you'll want a Java 7 jvm.

```
These are taken from the .travis.yml file and may need to be revised.  These are more like guidelines than exact commands to run.

Download spark somewhere reasonable: 
-wget http://psg.mtu.edu/pub/apache/spark/spark-1.3.1/spark-1.3.1-bin-hadoop2.4.tgz
Untar it somewhere
- export SPARK_HOME=$HOME/spark-1.3.1-bin-hadoop2.4
- export SPARK_MASTER_IP=localhost
Run the spark master
- $SPARK_HOME/sbin/start-master.sh
Run the spark slave (you may need to look in the master log to find the spark address to attach to)
- $SPARK_HOME/sbin/start-slave.sh worker1 spark://localhost:7077
```

  5. create and configure Romanesco's `worker.local.cfg` in the same dir as `worker.dist.cfg` with content
  
```
[celery]
app_main=romanesco
broker=mongodb://localhost/romanesco

[romanesco]
# Root dir where temp files for jobs will be written
tmp_root=tmp
# Comma-separated list of plugins to enable
plugins_enabled=spark
# Colon-separated list of additional plugin loading paths
plugin_load_path=
```

  6. start the Romanesco worker

```
$> cd /path/to/girder/plugins/romanesco
$> export SPARK_HOME=$HOME/spark-1.3.1-bin-hadoop2.4
$> python -m romanesco
If things are correct it will output 'Loaded plugin "spark"'
```

  7. grunt at the top level of Girder
  8. refresh your Girder web UI page
  9. enable the Romanesco plugin in the Girder web UI admin page, and restart Girder
  10. configure the Romanesco plugin in Girder to allow user or group or folder access, to make it easy, and not safe for production, you can add your Girder username to the users list.
