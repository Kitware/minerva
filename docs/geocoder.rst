Geocoder
========

TwoFishes
=========

Installation
------------

Minerva Geocoder requires `Twofishes`_ to be up and running.
We need `Vagrant`_ and `Ansible`_ for this purpose.

Install ansible
::
   $ pip install ansible

Clone Twofishes
::
   $ git clone git@github.com:OpenGeoscience/fsqio.git
   $ cd fsqio/ansible

Install requirements
::
   $ ansible-galaxy install -r requirements.txt
   $ vagrant up geocoder

This operation takes some time. Once the provisioning is successful you
should see Twofishes running on http://localhost:8087.


Usage
-----

You can use `Swagger`_ to interact with the geocoder.
Currently there are 3 endpoints.

1. **Autocomplete**

   Autocompletes a given string and returns 10 matching location names.
   Following example shows how the string "bos" gets autocompleted.

     Parameters:

       **twofishes** : http://localhost:8087

       **location** : bos

     Response:
.. code-block:: json

  [
    "Boston, MA, United States",
    "Boshan, Shandong, China",
    "Bosaso, Bari, Somalia",
    "Bossier City, LA, United States",
    "Boston, Lincolnshire, United Kingdom",
    "Boscoreale, Campania, Italy",
    "Bossangoa, Central African Republic",
    "Boshkengash, Tajikistan",
    "Boskoop, Netherlands",
    "Bosanska Krupa, Bosnia and Herzegovina"
  ]

2. **Getting Geojson String**

   Gets a Geojson response for a given place name/names as a list.

     Parameters:

       **twofishes** : http://localhost:8087

       **locations** : ["utah"]

     Response:
.. code-block:: json

    {
      "features": [
        {
          "geometry": {
            "coordinates": [
              [
                [
                  -113.48151249430609,
                  42.0000040881182
                ],
                [
                  -113.29450077529052,
                  42.0000040881182
                ],
                [
                  -113.10748905627487,
                  42.0000040881182
                ],
                [
                  -112.92047733815859,
                  42.0000040881182
                ]
              ]
            ],
            "type": "Polygon"
          },
          "properties": {
            "location": "utah"
          },
          "type": "Feature"
        }
      ],
      "type": "FeatureCollection"
    }

3. **Create Minerva Dataset**

   Creates a minerva dataset from a Twofishes search result.
   Each geojson feature will include the property "location" which
   will inlude the name.

     Parameters:

       **twofishes** : http://localhost:8087

       **location** : ["san francisco", "boston"]

       **name** : some_cities.geojson

     Response:

     Similar to this response. There will be a some_cities.geojson dataset in
     minerva which you can plot on the map.

.. code-block:: json

    {
      "_id": "59396a6778e55a3f9c8fbecb",
      "assetstoreId": "5900f48778e55a10051679aa",
      "created": "2017-06-08T15:16:55.042802+00:00",
      "creatorId": "58f912e478e55a2da26776e5",
      "exts": [
        "geojson"
      ],
      "itemId": "59396a6778e55a3f9c8fbec9",
      "mimeType": "application/octet-stream",
      "name": "some_cities.geojson",
      "path": "87/b3/87b3b3d077c4ce4e16477a1c2f352f1a9f6607c979c090d75257122cbd085837c76cf55d78f1b3f7d3e8d36b090f76956ac44ee947cdf2d024a85209e499a9ea",
      "sha512": "87b3b3d077c4ce4e16477a1c2f352f1a9f6607c979c090d75257122cbd085837c76cf55d78f1b3f7d3e8d36b090f76956ac44ee947cdf2d024a85209e499a9ea",
      "size": 132745
    }
.. _Twofishes: http://twofishes.net/
.. _Vagrant: https://www.vagrantup.com/
.. _Ansible: https://www.ansible.com/
.. _Swagger: http://localhost:8080/api/v1#!/minerva_geocoder


Nominatim
=========

Nominatim requires a pbf file. A wide array of `pbf files`_ are provided by the community. Downloading the whole planet file and
creating the index is a long and demanding process. There are tools like osmium_ which makes it easy to
filter the original pbf file to customize the nominatim deployment.

.. _`pbf files`: http://wiki.openstreetmap.org/wiki/Planet.osm
.. _osmium: http://osmcode.org/osmium-tool/

Filtering Pbf file
------------------

After installing osmium the first step is to download the `planet file`_. It is roughly 40 GB file so
be prepared to wait some time (around 4-5 hours).

.. _`planet file`: http://wiki.openstreetmap.org/wiki/Planet.osm

After having the file you can run the following command to filter out different tags from your pbf file:

.. code::

   osmium tags-filter /path/to/planet-latest.osm.pbf nwr/boundary,place -o planet-latest-boundary.osm.pbf

* Different options_ are available for the osmium filter command.

.. _options: http://docs.osmcode.org/osmium/latest/osmium-tags-filter.html

* `Type of tags`_ can be modified.

.. _`Type of tags`: http://wiki.openstreetmap.org/wiki/Map_Features

There is currently a pbf file that we have created which creates a coarse geocoder with
only boundaries and places for the globe. The file is 1.1 Gb in size and can be downloaded
from `this source`_.

.. _`this source`: https://data.kitware.com/api/v1/file/5a03309a8d777f31ac64e71c/download


Docker Image
------------

There are bunch of `dockerized nominatim`_ images that are provided.

.. _`dockerized nominatim`: https://store.docker.com/search?q=nominatim&source=community&type=image

Most of them has instructions on how to replace the default pbf file with your own.

Sample instructions_ on passing a custom pbf file.

.. _instructions: https://store.docker.com/community/images/mediagis/nominatim

After the docker build process, the container can be started with a command similar to following:

.. code::

   docker run --restart=always -d -p 8080:8080 --name nominatim-planet nominatim

Which will have the geocoder up and running on port 8080. Note that building the image might take ~10 hours.

Querying
--------

There is a `public nominatim instance`_ up and running with full planet file ingested.

.. _`public nominatim instance`: http://nominatim.openstreetmap.org/

There is an exhaustive amount of queries listed in the `official nominatim documentation`_.

.. _`official nominatim documentation`: http://wiki.openstreetmap.org/wiki/Nominatim

One useful query is to get geojson from the server for the given place name. It can be invoked like the following:

.. code::

   http://nominatim.openstreetmap.org/search?format=json&limit=1&polygon_geojson=1&q=albany

We can also specify what we are searching for (is a city in this case) by doing:

.. code::

   http://nominatim.openstreetmap.org/search?format=json&limit=1&polygon_geojson=1&city=paris
