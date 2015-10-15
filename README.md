## Minerva
### A Girder Plugin for Geospatial Visualization

#### Documentation

Documentation for Minerva can be found at http://minervadocs.readthedocs.org.

#### License

Copyright 2015 Kitware Inc.

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

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
