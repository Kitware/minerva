Riskinfo.lk GeoNode
===================

Installation for development
----------------------------

Create a new virtualenv for riskinfo_lk, install GeoNode and setup your project::

    $ mkvirtualenv riskinfo_lk
    $ pip install geonode

To install the latest from GeoNode's master branch use the following command::

    $ pip install -e git+https://github.com/GeoNode/geonode.git#egg=geonode --upgrade

Setup your GeoNode for usage. Download a geoserver.war to use and start the development server::

    $ git clone https://github.com/riskinfo-lk/riskinfo_lk.git 
    $ cd riskinfo_lk
    $ paver setup # downloads geoserver
    $ paver start

Setting up a vagrant box
------------------------

To configure a local development virtual machine, you will need to have virtualbox and vagrant installed.

Note: You may need to change the IP configuration in the VagrantFile to a valid ip on the local network

For development::

	$ vagrant up dev

The basic box will be downloaded automatically and will be provisioned with GeoNode (see the bash script)::

	$ vagrant ssh [dev|production]
	$ geonode createsuperuser

For a local vagrant based production deploy, you will need to install ansible and the geonode ansible role and then::

    $ vagrant up production

Production Deployment
---------------------

In order to install for production on a remote machine, you will need to install ansible::

    $ sudo pip install ansible

Note: It is advisable to install ansible system wide using sudo

Next, you will need to install the ansible role for geonode::

    $ ansible-galaxy install ortelius.geonode

Then update `/etc/ansible/hosts` to include your webservers host or dns entry::

   [webservers]
   ###.###.###.### 

Then you can run the playbook to install GeoNode::

    $ ansible-playbook playbook.yml
