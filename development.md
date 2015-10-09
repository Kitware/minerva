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

You should now be able to see your endpoint through the swagger api page, and
test it there.  Usually

    http://localhost:8080/api

### Testing the source api

Create a test, copy plugin_tests/wms_test.py to plugin_tests/elasticsearch_test.py.

Add the test to plugin.cmake

    add_python_test(elasticsearch PLUGIN minerva)

Run `cmake PATH_TO_GIRDER_DIR` again in your build directory to pick up the new test.

Now you should see the new test in your build directory

    ctest -N | grep minerva
      Test #110: server_minerva.dataset
      Test #111: server_minerva.source
      Test #112: server_minerva.session
      Test #113: server_minerva.analysis
      Test #114: server_minerva.geonames
      Test #115: server_minerva.s3_dataset
      Test #116: server_minerva.import_analyses
      Test #117: server_minerva.contour_analysis
      Test #118: server_minerva.wms
      Test #119: server_minerva.elasticsearch
      Test #120: server_minerva.geojson
      Test #121: server_minerva.mean_contour_analysis
      Test #122: pep8_style_minerva_constants
      Test #123: pep8_style_minerva_geonames
      Test #124: pep8_style_minerva_rest
      Test #125: pep8_style_minerva_utility
      Test #126: pep8_style_minerva_bsve
      Test #127: pep8_style_minerva_jobs
      Test #128: jshint_minerva
      Test #129: jsstyle_minerva
      Test #130: web_client_minerva

You can run the test, with extra verbosity

    ctest -R server_minerva.elasticsearch -VV


### Add the source to client side collection

Add the new source type to web/external/js/collections/SourceCollection.js,
this will prevent mysterious backbone errors later on like

    `a.on is not a function`

You're welcome.

### Add a new source model

Add a new model like web_external/js/models/ElasticsearchSourceModel.js.

### Add the source to AddSourceWidget

Add your new source type as an option in web_external/templates/widgets/addSourceWidget.jade
and deal with the new option in the `submit #m-add-source-form` event handler in
web_external/js/views/widgets/AddSourceWidget.js by creating a new add widget specific
to your source, e.g. `AddElasticsearchSourceWidget`.

Test that when you click on the add new source icon in the source panel, your
new source type is displayed as an option.

Create the widget to add your new source type, e.g. in

    web_external/js/views/widgets/AddElasticsearchSourceWidget.js
    web_external/templates/widgets/addElasticsearchSourceWidget.jade

### Display the new source in the source panel

Update the necessary in

    web_external/templates/body/sourcePanel.jade
    web_external/stylesheets/body/sourcePanel.styl
