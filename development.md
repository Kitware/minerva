# Minerva developers guide

## Adding a source

I think it's easier to work on the backend first, as you can test the api
independently of the client.  We'll work through an example using the
Elasticsearch source.

### Source api

Create an endpoint to create the source, copy server/rest/wms_source.py to
server/rest/elasticsearch_source.py and modify accordingly.

Important points are

  * use the access decorator to ensure only logged in users can call the endpoint
  * create minerva_metadata with the correct `source_type`
  * save the source using the superclass method createSource
  * return the document corresponding to the new source
  * here we store the authentication credentials after encryption
  * set the description object to display the params correctly on the swagger api page

Add the endpoint to server/loader.py

    info['apiRoot'].minerva_source_elasticsearch = elasticsearch_source.ElasticsearchSource()

