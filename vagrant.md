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

The VM will be running Ubuntu 14.04, and will be running CherryPy serving Girder and Minerva, Mongo, and RabbitMQ.
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

This tag will pull the git version of minerva on your VM that is your current git revision on your host,
install system dependencies and pip dependencies defined in the minerva role,
then install the minerva plugin to girder and build the client side code.

##### minerva-update

Think of this tag as minerva without dependencies.

This tag will pull the git version of minerva on your VM that is your current git revision on your host,
then install the minerva plugin to girder and build the client side code.


### vagrant halt

    vagrant halt

will shut down your Minerva VM.

## Minerva web application

In a browser on your host machine, navigate to

    http://localhost:8080

to get to the Minerva web application.

Navigate to

    http://localhost:8080/girder

to get to the Girder web application backing Minerva.


The username/password for the Minerva and Girder admin user are
`girder`/`letmein`.  These can be changed in the `ansible/site.yml` file.

## Setting a specific version of Girder or Minerva

Girder version can be set using the file `.girder-version`.

The Minerva version is taken from the current git revision on your host, e.g., if you have your host Minerva repo on
git branch `foo_la_la`, then the VM will be provisioned with Minerva branch `foo_la_la`, as that branch currently
exists on GitHub.  If you want to change the provisioned Minerva to a different version, you can change the value
configured within `ansible/site.yml` under the key `minerva_version`. Versions can be a branch, tag, or SHA.  Note
that if you have changes local to your host Minerva repo, these will not be accessible to the provisioned VM, unless
you have filesyncing between your host and VM, which is experimental and not officially supported.
