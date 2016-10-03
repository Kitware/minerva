#!/usr/bin/env python
# -*- coding: utf-8 -*-

###############################################################################
#  Copyright Kitware Inc.
#
#  Licensed under the Apache License, Version 2.0 ( the "License" );
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
###############################################################################

import decimal
import json
import tempfile

import geojson
import ijson
import jsonpath_rw


def jsonObjectReader(filepath):
    """
    Creates a generator that parses an array of json objects from a valid
    json array file, yielding each top level json object in the array.

    :param filepath: path to json file.
    """
    top_level_array = False
    array_stack = 0
    top_level_object = False
    object_stack = 0
    parser = ijson.parse(open(filepath, 'r'))

    for prefix, event, value in parser:
        if event == 'start_array':
            if not top_level_array:
                top_level_array = True
                continue
            else:
                array_stack += 1
        if event == 'start_map':
            if not top_level_object:
                top_level_object = True
                builder = ijson.ObjectBuilder()
            else:
                object_stack += 1
        if event == 'end_map':
            if not top_level_object:
                raise Exception('end_map without a top level object')
            else:
                if object_stack == 0:
                    top_level_object = False
                    yield builder.value
                else:
                    object_stack -= 1
        if event == 'end_array':
            if not top_level_array:
                raise Exception('end_array without a top level array')
            else:
                if array_stack == 0:
                    top_level_array = False
                else:
                    array_stack -= 1
        # convert Decimal to float because mongo can't serialize Decimal
        # TODO is this the right place to do this? Should it be done instead
        # upon save?
        if isinstance(value, decimal.Decimal):
            # TODO this has different behavior on python 2.6 vs 2.7 due to
            # different rounding behavior
            value = float(value)
        builder.event(event, value)


def jsonArrayHead(filepath, limit=10):
    # TODO rewrite to be more agnostic of source, file or mongo etc
    """
    Reads the top limit json objects out of a json array located
    in filepath, returns a list of Python dicts created from the
    json objects.

    :param filepath: path to json array file.
    :param limit: count of objects to return in list.
    :returns: List of Python dicts from json objects.
    """
    reader = jsonObjectReader(filepath)
    objs = []
    objCount = 0
    for obj in reader:
        if objCount == limit:
            break
        objs.append(obj)
        objCount += 1
    return objs


class JsonMapper(object):

    def __init__(self, objConverter, header='[', footer=']',
                 jsonDumpser=json.dumps):
        self.objConverter = objConverter
        self.header = header
        self.footer = footer
        self.jsonDumpser = json.dumps

    def mapToJsonFile(self, tmpdir, objects, outFilepath=None):
        if not outFilepath:
            outFilepath = tempfile.mkstemp(suffix='.json', dir=tmpdir)[1]
        writer = open(outFilepath, 'w')
        self.mapToJson(objects, writer)
        writer.close()
        return outFilepath

    def mapToJson(self, objects, writer):
        writer.write(self.header)
        writer.write('\n')
        for ind, obj in enumerate(objects):
            if ind > 0:
                writer.write(',\n')
            else:
                writer.write('\n')
            writer.write(self.jsonDumpser(self.objConverter(obj)))
        writer.write(self.footer)


class GeoJsonMapper(JsonMapper):

    def __init__(self, objConverter=None, mapping=None):
        geojson_header = """{
        "type": "FeatureCollection",
        "crs": {
            "type": "name",
            "properties": {
                "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
            }
        },
        "features": [
        """

        geojson_footer = """
        ]
        }
        """

        if objConverter is None:
            if mapping is None:
                raise Exception('Must provide objConverter or geoJsonMapping')

            def convertToGeoJson(obj):
                lat_expr = jsonpath_rw.parse(mapping['latitudeKeypath'])
                long_expr = jsonpath_rw.parse(mapping['longitudeKeypath'])

                def extractLat(obj):
                    match = lat_expr.find(obj)
                    return float(match[0].value)

                def extractLong(obj):
                    match = long_expr.find(obj)
                    return float(match[0].value)

                point = geojson.Point((extractLong(obj), extractLat(obj)))
                properties = {"placeholder": 0}
                feature = geojson.Feature(geometry=point,
                                          properties=properties)
                return feature

            objConverter = convertToGeoJson

        super(GeoJsonMapper, self).__init__(objConverter, geojson_header,
                                            geojson_footer, geojson.dumps)
