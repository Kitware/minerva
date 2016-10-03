import cherrypy
import json


def getExtraHeaders():
    try:
        headers = json.loads(cherrypy.request.cookie.get('minervaHeaders'))
    except Exception:
        headers = {}
    return headers
