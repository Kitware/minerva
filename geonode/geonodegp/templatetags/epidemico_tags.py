from django import template
import urllib
from geonode.geoserver.helpers import ogc_server_settings



register = template.Library()

@register.assignment_tag(takes_context=True)
def wcs_links(context):
    layer = context["resource"]
    links = get_wcs_links(ogc_server_settings.public_url + 'wcs?',
                          layer.typename.encode('utf-8'))
    return links

def _wcs_link(wcs_url, identifier, mime, crs=None, bbox=None):
    """
    Generate a WCS 2.0.0 download link
    """
    params = {
        'service': 'WCS',
        'version': '2.0.0',
        'request': 'GetCoverage',
        'coverageId': identifier,
        'format': mime,
        'compression': 'LZW'
    }
    if crs:
        params["crs"] = crs
    if bbox:
        params["bbox"] = bbox
    return wcs_url + urllib.urlencode(params)

def get_wcs_links(
        wcs_url,
        identifier):
    """
    Generate a set of WCS 2.0.0 links
    """
    coverage_id = identifier.replace(":", "__")

    types = [
        ("GeoTIFF", "geotiff"),
    ]

    output = []
    for name, mime in types:
        url = _wcs_link(wcs_url, coverage_id, mime)
        output.append({'name': name, 'url': url})
    return output