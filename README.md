## Minerva: A Girder plugin for geospatial visualization

Assumes you have a running version of Girder.

### Running Minerva

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
