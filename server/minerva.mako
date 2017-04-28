<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <link rel="stylesheet"
          href="//fonts.googleapis.com/css?family=Droid+Sans:400,700">
    <link rel="stylesheet"
          href="${staticRoot}/lib/bootstrap/css/bootstrap.min.css">
    <link rel="stylesheet"
          href="${staticRoot}/lib/fontello/css/fontello.css">
    <link rel="stylesheet"
          href="${staticRoot}/lib/fontello/css/animation.css">
    <link rel="stylesheet"
          href="${staticRoot}/lib/fontello/minerva/css/fontello.css">
    <link rel="stylesheet"
          href="${staticRoot}/built/plugins/minerva/jquery-ui.min.css">
    <link rel="stylesheet"
          href="${staticRoot}/built/plugins/minerva/datatables.min.css">
    <link rel="stylesheet"
          href="${staticRoot}/built/plugins/minerva/query-builder.default.min.css">
    <link rel="stylesheet"
          href="${staticRoot}/built/girder.app.min.css">
    % for plugin in pluginCss:
        <link rel="stylesheet" href="${staticRoot}/built/plugins/${plugin}/plugin.min.css">
    % endfor

    <link rel="icon"
          type="image/png"
          href="${staticRoot}/img/Girder_Favicon.png">
  </head>
  <body>
    <div id="g-global-info-apiroot" class="hide">${apiRoot}</div>
    <div id="g-global-info-staticroot" class="hide">${staticRoot}</div>

    <script src="${staticRoot}/built/girder.ext.min.js"></script>
    <script src="${staticRoot}/built/girder.app.min.js"></script>

    <script src="${staticRoot}/built/plugins/minerva/minerva.ext.min.js"></script>

    ## We want to include client side resources from all loaded plugins,
    ## in their proper dependency ordering,
    ## which allows Minerva to be extended by other plugins and have the
    ## client side resources of the downstream plugins be served by the
    ## Minerva application.

    % for plugin in pluginJs:
        % if plugin != 'minerva':
            <script src="${staticRoot}/built/plugins/${plugin}/plugin.min.js"></script>
        % else:
            ## We don't want to serve the plugin.min.js resource for Minerva
            ## since this is related to the Girder Admin configure plugins page for Minerva.
            <script src="${staticRoot}/built/plugins/minerva/minerva.app.min.js"></script>
        % endif
    % endfor

    % for externalJsUrl in externalJsUrls:
        <script type="text/javascript" src="${externalJsUrl}"></script>
    % endfor

    <script src="${staticRoot}/built/plugins/minerva/minerva.main.min.js"></script>
    <script type="text/javascript" src="https://cdn.datatables.net/t/dt/dt-1.10.11,b-1.1.2,b-colvis-1.1.2,sc-1.4.1/datatables.min.js"></script>

   </body>
</html>
