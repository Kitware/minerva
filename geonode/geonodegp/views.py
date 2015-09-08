import base64
import json
from django.contrib.auth import get_user_model, authenticate
from geonodegp import settings
from geonode.geoserver.helpers import ogc_server_settings
from geonode.layers.models import Layer

User = get_user_model()
from geonode.api import resourcebase_api

def api_proxy(request):
    """
    Workaround for making search API requests from an external server.
    Use basic authentication to set the request user object and then pass to
    the search API.
    """
    if "HTTP_AUTHORIZATION" in request.META:
        authentication = request.META["HTTP_AUTHORIZATION"].lstrip("Basic ")
        auth_decode = base64.b64decode(authentication).split(":")
        user = authenticate(username=auth_decode[0], password=auth_decode[1])
    else:
        user = request.user
    url = request.get_full_path()
    api_call = None
    add_style_info = False
    if "/layers" in url:
        api_call = resourcebase_api.LayerResource()
    elif "/maps" in url:
        api_call = resourcebase_api.MapResource()
    elif "/profiles" in url:
        api_call = resourcebase_api.ProfileResource()
    elif "/documents" in url:
        api_call = resourcebase_api.DocumentResource()
    else:
        api_call = resourcebase_api.ResourceBaseResource()

    request.user = user
    if settings.HAYSTACK_SEARCH and 'search' in request.get_full_path():
        resp = api_call.get_search(request)
    else:
        resp = api_call.get_list(request)
    if "/layers" in url:
        json_response = json.loads(resp.content)
        group_by = request.GET['group_by'] if 'group_by' in request.GET else None
        groups = {'objects': {}}
        for layer_item in json_response['objects']:
            layer = Layer.objects.get(id=layer_item['id'])
            styles = layer.styles
            layer_item['styles'] = [{style.sld_title: style.sld_url.replace("{}rest/".format(
                ogc_server_settings.server['LOCATION']), ogc_server_settings.server['PUBLIC_LOCATION'])}
                for style in styles.iterator()]
            if group_by:
                grouping = layer_item[group_by]
                if not grouping:
                    grouping = 'Uncategorized'
                if grouping in groups['objects']:
                    groups['objects'][grouping].append(layer_item)
                else:
                    groups['objects'][grouping] = [layer_item,]
        if group_by:
            json_response['objects'] = groups['objects']
        resp.content = json.dumps(json_response)
    return resp

