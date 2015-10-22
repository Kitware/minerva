Provisioning data services
==========================

Minerva uses `ansible playbooks`_ to provision servers for its data services.
Along with `vagrant`_ these playbooks provide a repeatable script to spin
up a new data services instance in a few simple commands.  Once you have
vagrant and ansible installed start up a new data services server as follows.::

   cd data_services/deploy/ansible
   ansible-galaxy install -r requirements.txt
   vagrant up

This will download a fresh image of Ubuntu server from vagrant's online repository and
procede to execute the playbook inside the virtual machine.  Once this process is complete
you should have several fully functional services running locally.

   1. geonode: http://192.168.33.12 user: ``admin`` password: ``geonode``
   2. geoserver: http://192.168.33.12:8080/geoserver user: ``admin`` password ``geoserver``
   3. flower: http://192.168.33.12:5555

The ``celery`` tasks exposed in flower come from `dataqs`_ and will run periodically to
ingest new data from public data sets.  The new data will show up as layers within
geonode.

.. _ansible playbooks: https://docs.ansible.com/ansible/playbooks.html
.. _vagrant: https://docs.vagrantup.com/v2/getting-started/index.html
.. _dataqs: https://github.com/OpenGeoscience/dataqs.git
