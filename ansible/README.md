## Test install
To test the minerva NEX deployment run the following commands
```
git clone git@github.com:OpenGeoscience/nex.git
cd nex/deploy/minerva
vagrant up
```

### Note
You may use ```GIRDER_VERSION```, ```CUMULUS_VERSION```, and ```MINERVA_VERSION```
environment variables to specify a git-ish version of each of the packages
will be installed.  e.g.

```sh
MINERVA_VERSION=cumulus_frontend_update vagrant up
```

where ```cumulus_frontend_update``` is the name of a branch you wish to test.

## Development install
It is possible to develop on cumulus/minerva locally and mount those
folders within the VM for testing purposes.  This requires NFS and the
vagrant plugin ```vagrant-bindfs``` to ensure permissions etc are correct.

```
git clone git@github.com:OpenGeoscience/nex.git

# Optional - only include if you wish to edit minerva source code
git clone git@github.com:Kitware/minerva.git

# Optional - only include if you wish to edit cumulus source code
git clone git@github.com:Kitware/cumulus.git

cd nex/deploy/minerva

# Install NFS on local system
# This is system dependant for ubuntu:
# 
#  sudo apt-get install nfs-kernel-server
#  sudo service nfs-kernel-server restart


vagrant plugin install vagrant-bindfs

export DEVELOPMENT=1

vagrant up
```
