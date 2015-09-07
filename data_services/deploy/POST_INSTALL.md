# Create superuser
source /home/vagrant/venvs/geonode/bin/activate

# Currently there is no sane way to avoid entering password
django-admin.py createsuperuser --settings=geonode.settings


