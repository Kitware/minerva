### Introduction

This Ansible Role will install GeoNode and required dependencies onto an Ubuntu
14.04 (Trusty) host. It includes tasks for PostgreSQL+PostGIS, GeoServer, GeoNode,
 nginx, uswgi and also includes tasks for using AWS RDS databases. It is meant
 to be used with a GeoNode template project by following the workflow
 described here http://github.com/geonode/geonode-project

Tested with a known minimal working Ansible version of 1.9.3.

### Installing roles from ansible galaxy

The ansible playbook that performs the provisioning depends on a few roles provided in the
ansible galaxy.  You can install these rolls with the following command in this directory:

```
ansible-galaxy install -r requirements.txt
```

### Role Variables

* `app_name` - GeoNode project name (default: `geonode`)
* `github_user` - GitHub username that owns the project (default: `GeoNode`)
* `code_repository` - URL to the Code Repository (default: `https://github.com/{{ github_user }}/{{ app_name }}.git`)

The `app_name` variable will be used to set the database names and credentials. You can override this behavior with the following variables.

* `db_data_instance` - Database instance for spatial data (default: `{{ app_name }}`)
* `db_metadata_instance` - Database instance for the application metadata (default: `{{ app_name }}_app`)
* `db_password` - Database password (default: `{{ app_name }}`)
* `db_user` - Database user (default: `{{ app_name }}`)

You can also change the war used to deploy geoserver with the following variable.

* `geoserver_url` - GeoServer war URL (default: `http://build.geonode.org/geoserver/latest/geoserver.war`)

### Setting up a vagrant box

To configure a local development virtual machine, you will need to have virtualbox and vagrant installed.
Note: You may need to change the IP configuration in the VagrantFile to a valid ip on the local network

    $ vagrant up minerva_dataservices
    $ vagrant ssh minerva_dataservices
    $ source venvs/geonode/bin/activate
    $ django-admin.py createsuperuser --settings=geonode.settings
