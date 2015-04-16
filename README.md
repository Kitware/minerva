## Minerva: A Girder plugin for geospatial visualization

### Running Minerva

- clone Minerva into the Girder plugins dir
- grunt to rebuild Girder
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
