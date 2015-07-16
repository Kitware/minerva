## Minerva: A Girder plugin for geospatial visualization

Assumes you have a running version of Girder.

### Running Minerva

#### Install of system dependencies

##### Ubuntu 14.04

This includes all system dependencies necessary for running Girder.  So if you have a running Girder installation, many of these
will already be satisfied.

- sudo apt-get update
- sudo apt-get install curl g++ git libffi-dev make python-dev python-pip libfreetype6-dev libpng12-dev pkg-config libgdal-dev
- sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
- echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen'     | sudo tee /etc/apt/sources.list.d/mongodb.list
- sudo apt-get update
- sudo apt-get install mongodb-org-server
- curl -sL https://deb.nodesource.com/setup | sudo bash -
- sudo apt-get install nodejs

#### Install of Minerva as a Girder plugin

- clone Minerva into the Girder plugins dir
- pip install the `minerva/requirements.txt`

    pip install -r requirements.txt

- run npm install in the `minerva` directory to get Minerva's JS dependencies

    npm install

- grunt at the top level in the `girder` directory to build Minerva

    grunt

- enable the Minerva plugin through the Girder Admin console
- restart Girder through the Girder Admin console

This will server Minerva as your top level application.  Girder will
now be served at your top level path with `/girder`.

Example:

Pre-Minerva:

http://localhost:8080           => serves Girder

Post-Minerva:

http://localhost:8080           => serves Minerva
http://localhost:8080/girder    => serves Girder


#### Installing a specific version of GeoJs for development

This is to get around the fact that npm is for installing packages, not managing source repositories.  So when npm installs geojs, it doesn't install it as a git repo with the .git dir.

  1. change the reference in the `geojs` line of package.json to point to the correct branch or sha reference
  2. run `npm install` from the top level `minerva` directory
  3. `cd node_modules/geojs`
  4. `rm -rf vgl`
  5. `git clone https://github.com/OpenGeoscience/vgl.git`
  6. find the hash of vgl from the geojs branch
  7. `cd vgl; git checkout $HASH_FROM_GEOJS_BRANCH; cd ..`
  8. `npm install` (this time inside geojs)
  9. `grunt` (inside geojs)

At this point geo.min.js should be rebuilt with the checked out version of vgl, and this will be included the next time minerva is built by `grunt`-ing at the top level of girder.
