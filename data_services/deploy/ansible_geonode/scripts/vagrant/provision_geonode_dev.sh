#!/usr/bin/env bash

which virtualenv > /dev/null &&
{ echo "Already provisioned"; exit 0; }

sudo apt-get update
sudo apt-get -y install python python-pip git zlib1g-dev openjdk-7-jdk python-dev python-lxml gdal-bin build-essential libxml2-dev libxslt-dev libgdal-dev
export CPLUS_INCLUDE_PATH=/usr/include/gdal
export C_INCLUDE_PATH=/usr/include/gdal

sudo pip install virtualenvwrapper
source /usr/local/bin/virtualenvwrapper.sh

mkvirtualenv riskinfo_lk

pip install GDAL==1.10.0

git clone https://github.com/riskinfo-lk/riskinfo_lk.git
cd riskinfo_lk/

pip install -e . 

paver setup # install geonode and downloads geoserver
paver start_geoserver
paver sync
python manage.py runserver 0.0.0.0:8000 &
