Setting up a vagrant box
------------------------
To configure a local development virtual machine, you will need to have virtualbox and vagrant installed.
Note: You may need to change the IP configuration in the VagrantFile to a valid ip on the local network

  $ vagrant up production
  $ vagrant ssh production
  $ source venvs/geonode/bin/activate
  $ django-admin.py createsuperuser --settings=geonode.settings
