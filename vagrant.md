# Using Vagrant to provision Minerva

## Prerequisites

You'll need to have the following installed

  * Virtualbox
  * Vagrant
  * Ansible [version >= 1.9.3 and < 2.0]

## Vagrant commands

Run all of these from this (the minerva repo top level) directory with the Vagrantfile, on your host machine.

The root user/password on your VM is vagrant/vagrant.

The Vagrant name of the VM will be 'minervagrant', and the name of the vm on virtualbox will be close to 'minerva_minervagrant'.

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

#### vagrant provision, now with even more tags

If you already have a provisioned VM, you can set tags through environment variables
to reprovision a limited number of steps.  You can set the tags as a comma separated
list like

    export MINERVA_VAGRANT_ANSIBLE_TAGS='minerva-update,test'

##### minerva

Think of this tag as minerva with dependencies.

This tag will pull the git version of minerva defined in `minerva_version` in your site.yml
file, install system dependencies and pip dependencies defined in the minerva role,
then install the minerva plugin to girder and build the client side code.

##### minerva-update

Think of this tag as minerva without dependencies.

This tag will pull the git version of minerva defined in `minerva_version` in your site.yml
file, then install the minerva plugin to girder and build the client side code.


### vagrant halt

    vagrant halt

will shut down your Minerva VM.

## Minerva web application

The Vagrantfile forwards VM port 8080 to host port 8080.  This specific
forwarding is required, since when a Romanesco job is created, the url it is
submitted from is seen as the host, and this is where the job will have its
results uploaded to.  If e.g. the VM port 8080 was forwarded to host port
9080, then when a job is created, the url would be saved as
http://localhost:9080/...--assuming the job was submitted from a browser on
the host--and when the Romanesco celery worker tries to upload any output,
it would send them to http://localhost:9080/..., but inside the VM,
Girder is running on port 8080, so the Romanesco celery worker
wouldn't be able to connect, since it would try to reach 9080.


In a browser on your host machine, navigate to

    http://localhost:8080

to get to the Minerva web application.

Navigate to

    http://localhost:8080/girder

to get to the Girder web application backing Minerva.


The username/password for the Minerva and Girder admin user are
`girder`/`letmein`.  These can be changed in the `ansible/site.yml` file.

## Setting a specific version of Girder, Romanesco, or Minerva

Girder and Romanesco versions can be set using the files `.girder-version` and `.romanesco-version` respectively. The Minerva version is configured within `ansible/site.yml` under the key `minerva_version`. Versions can be a branch, tag, or SHA.
