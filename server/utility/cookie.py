import cherrypy
import json
import urllib


def getExtraHeaders():
    try:
        cookie = cherrypy.request.cookie.get('minervaHeaders').value
        headers = json.loads(urllib.unquote(cookie))
    except Exception:
        headers = {}
    return headers
