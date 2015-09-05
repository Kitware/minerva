# Create superuser
sudo /home/vagrant/venvs/geonode/bin/django-admin.py createsuperuser --settings=geonode.settingsi

# Run app
venvs/geonode/bin/python manage.py runserver 0.0.0.0:8000 --settings=geone.settings
