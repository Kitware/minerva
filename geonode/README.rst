GeoNode-GeoProcessing Project
========================

Installation
------------

Install geonode with::

    $ sudo add-apt-repository ppa:geonode/snapshots

    $ sudo apt-get update

    $ sudo apt-get install geonode

    $ sudo geonode createsuperuser

    $ sudo geonode-updateip <domain or IP>

Usage
-----

Rename the local_settings.py.sample to local_settings.py and edit it's content by setting the SITEURL and SITENAME.

Edit the file /etc/apache2/sites-available/geonode and change the following directive from:

    WSGIScriptAlias / /var/www/geonode/wsgi/geonode.wsgi

to:

    WSGIScriptAlias / /path/to/geonode-geoprocessing/geonodegp/wsgi.py

Restart apache::

    $ sudo service apache2 restart

Edit the templates in geonodegp/templates, the css and images to match your needs.

In the geonode-geoprocessing folder run::

    $ python manage.py collectstatic


Creating the ForecastIO Air Temperature Image Mosaic Datastore
--------------------------------------------------------------
Copy the entire forecast_io_airtemp folder into /usr/share/geoserver/data/data

Check the datastore.properties file and make sure the database connection parameters match
those in the local_settings.py file (either this project's or geonode's at 
/usr/local/lib/python2.7/dist-packages/geonode/local_settings.py)

In the Geoserver admin console, select 'Stores', 'Add new Store', 'ImageMosaic'

Enter 'forecast_io_airtemp' in the 'Data Source Name' field

Under 'Connection Parameters', navigate to the 'forecast_io_airtemp' folder and click 'OK'

Click 'Publish' on the 'forecast_io_airtemp' layer.

Go to the layer's 'Dimensions' tab.

Check 'Time' to enable it and select 'List' under Presentation.

Click 'OK'


