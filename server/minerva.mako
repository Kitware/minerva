<!DOCTYPE html>
<html lang="en">
  <head>
    <title>${title}</title>
    <link rel="stylesheet"
          href="//fonts.googleapis.com/css?family=Droid+Sans:400,700">
    <link rel="stylesheet"
          href="${staticRoot}/lib/bootstrap/css/bootstrap.min.css">
    <link rel="stylesheet" type="text/css" href="////cdn.jsdelivr.net/bootstrap/3.3.2/css/bootstrap.css"/>
    <link rel="stylesheet"
          href="${staticRoot}/lib/fontello/css/fontello.css">
    <link rel="stylesheet"
          href="${staticRoot}/lib/fontello/css/animation.css">
    <link rel="stylesheet"
          href="${staticRoot}/built/plugins/minerva/jquery.gridster.min.css">
    <link rel="stylesheet"
          href="${staticRoot}/built/plugins/minerva/jquery-ui.min.css">
    <link rel="stylesheet"
          href="${staticRoot}/built/app.min.css">
    % for plugin in pluginCss:
        % if plugin != 'minerva':
            <link rel="stylesheet"
            href="${staticRoot}/built/plugins/${plugin}/plugin.min.css">
        % endif
    % endfor
    <link rel="stylesheet"
          href="http:////cdn.datatables.net/1.10.7/css/jquery.dataTables.css">
    <link rel="stylesheet"
          href="http:////cdn.jsdelivr.net/bootstrap.daterangepicker/1/daterangepicker-bs3.css">
    <link rel="stylesheet"
          href="${staticRoot}/built/plugins/minerva/minerva.min.css">
    <link rel="icon"
          type="image/png"
          href="${staticRoot}/img/Girder_Favicon.png">
  </head>
  <body>
    <div id="g-global-info-apiroot" class="hide">${apiRoot}</div>
    <div id="g-global-info-staticroot" class="hide">${staticRoot}</div>
    <script src="${staticRoot}/built/plugins/minerva/geo.ext.min.js"></script>
    <script src="${staticRoot}/built/libs.min.js"></script>
    <script src="${staticRoot}/built/plugins/minerva/jquery.gridster.js"></script>
    <script src="${staticRoot}/built/plugins/minerva/jquery-ui.min.js"></script>
    <script src="${staticRoot}/built/plugins/minerva/geo.min.js"></script>
    <script src="${staticRoot}/built/app.min.js"></script>
    ## We want to include client side resources from all loaded plugins,
    ## which allows Minerva to be extended by other plugins and have the
    ## client side resources of the downstream plugins be served by the
    ## Minerva application.
    ## We don't want to serve the plugin.min.[cs|j]s resources for Minerva
    ## since these are related to the Girder plugins page.
    ## Same applies to CSS above.
     % for plugin in pluginJs:
        % if plugin != 'minerva':
            <script src="${staticRoot}/built/plugins/${plugin}/plugin.min.js"></script>
        % endif
    % endfor
    <script src="http://cdn.datatables.net/1.10.7/js/jquery.dataTables.min.js"></script>
    <script src="http://cdn.jsdelivr.net/momentjs/2.9.0/moment.min.js"></script>
    <script src="http://cdn.jsdelivr.net/bootstrap.daterangepicker/1/daterangepicker.js"></script>
    <script src="${staticRoot}/built/plugins/minerva/papaparse.min.js"></script>
    <script src="${staticRoot}/built/plugins/minerva/jsonpath.min.js"></script>
    <script src="${staticRoot}/built/plugins/minerva/minerva.min.js"></script>
    <script src="${staticRoot}/built/plugins/minerva/main.min.js"></script>

   </body>
</html>