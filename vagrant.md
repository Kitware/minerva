# Using Vagrant to provision Minerva

## Prerequisites

You'll need to have the following installed

  * Virtualbox
  * Vagrant
  * Ansible [version >= 2.0]

## Vagrant commands

Run all of these from this (the minerva repo top level) directory with the Vagrantfile, on your host machine.

The root user/password on your VM is vagrant/vagrant.

The Vagrant name of the VM will be 'minerva', and the name of the vm on virtualbox will be close to 'minerva_minerva'.

### vagrant up

    vagrant up

when run for the first time will create a new VM, and will provision
the Minerva client/server stack on that VM using Ansible.

The VM will be running Ubuntu 14.04, and will be running CherryPy serving Girder and Minerva, Mongo, RabbitMQ and the Romanesco celery worker.
Spark will not be running.

If the VM has been created previously, this command will start the Minerva VM
running, if it is not currently running.

### vagrant ssh

    vagrant ssh

will ssh into your Minerva VM.

### vagrant provision

    vagrant provision

will re-provision your Minerva VM with ansible.


### vagrant halt

    vagrant halt

will shut down your Minerva VM.

## Minerva web application

By default the Vagrantfile forwards VM port 8080 to host port 8080.


In a browser on your host machine, navigate to

    http://localhost:8080

to get to the Minerva web application.

Navigate to

    http://localhost:8080/girder

to get to the Girder web application backing Minerva.

You may change the VM port that girder is running on by setting the ```GIRDER_GUEST_PORT```
Similarly you may change the host port by settting ```GIRDER_HOST_PORT```

The username/password for the Minerva and Girder admin user are
`admin`/`letmein`.  These can be changed in the `ansible/site.yml` file.

## Setting a specific version of Girder or Minerva

By default Minerva will be installed with the hash of the current directory. This means 
if you wish to change minerva's directory you can checkout a different version and
re-provision the VM.  By default the version of girder will be read from the 
```.girder-version``` file at the root of this repository.

Both the girder version and the minerva version can be overridden by setting the 
```GIRDER_VERSION``` and the ```MINERVA_VERSION``` environment variables. 


## Development install
It is possible to develop on minerva locally and mount its folder within 
the VM for testing purposes.  This requires NFS and the vagrant plugin 
```vagrant-bindfs``` to ensure permissions and ownership are correct.

```
git clone git@github.com:Kitware/minerva.git

cd minerva

# Install NFS on local system
# This is system dependant for ubuntu:
# 
#  sudo apt-get install nfs-kernel-server
#  sudo service nfs-kernel-server restart


vagrant plugin install vagrant-bindfs

export DEVELOPMENT=1

vagrant up
```


