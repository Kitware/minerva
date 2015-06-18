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
    '''
    Creates a generator that parses an array of json objects from a valid
    json array file, yielding each top level json object in the array.

    :param filepath: path to json file.
    '''
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
    '''
    Reads the top limit json objects out of a json array located
    in filepath, returns a list of Python dicts created from the
    json objects.

    :param filepath: path to json array file.
    :param limit: count of objects to return in list.
    :returns: List of Python dicts from json objects.
    '''
    reader = jsonObjectReader(filepath)
    objs = []
    objCount = 0
    for obj in reader:
        if objCount == limit:
            break
        objs.append(obj)
        objCount += 1
    return objs


def jsonArrayRewriter(jsonFilepath, tmpdir, objConverter, header='[',
                      footer=']', outFilepath=None, jsonDumpser=json.dumps):
    '''
    Reads a file with an array of json objects, for each of them, will
    call objConverter on them, then writes out the resulting json array
    into outFilepath, using jsonDumpser to write out each rewritten
    json object.

    :param jsonFilepath: path to json array file.
    :param tmpdir: temporary work dir.
    :param objConverter: function to call on each dict read from a json obj.
    :param header: string prefix of output json array file.
    :param footer: string suffix of output json array file.
    :param outFilepath: path to output file, created if not specified.
    :param jsonDumpser: specialized dumps function if needed.
    '''
    if not outFilepath:
        outFilepath = tempfile.mkstemp(suffix='.json', dir=tmpdir)[1]

    writer = open(outFilepath, 'w')
    writer.write(header)
    writer.write('\n')

    reader = jsonObjectReader(jsonFilepath)

    for ind, obj in enumerate(reader):
        if ind > 0:
            writer.write(',\n')
        else:
            writer.write('\n')
        writer.write(jsonDumpser(objConverter(obj)))

    writer.write(footer)
    writer.close()

    return outFilepath


def convertJsonArrayToGeoJson(jsonFilepath, tmpdir, geoJsonFilePath,
                              jsonMapper):

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

    def convertToGeoJson(obj):
        lat_expr = jsonpath_rw.parse(jsonMapper['latitudeKeypath'])
        long_expr = jsonpath_rw.parse(jsonMapper['longitudeKeypath'])
        coloredPoint_expr = None
        if 'coloredPointKeypath' in jsonMapper:
            coloredPointKeypath = jsonMapper['coloredPointKeypath']
            if coloredPointKeypath != "":
                coloredPoint_expr = \
                    jsonpath_rw.parse(coloredPointKeypath)

        def extractLat(obj):
            match = lat_expr.find(obj)
            return match[0].value

        def extractLong(obj):
            match = long_expr.find(obj)
            return match[0].value

        def extractColoredPoint(obj):
            match = coloredPoint_expr.find(obj)
            return match[0].value

        point = geojson.Point((extractLong(obj), extractLat(obj)))
        # TODO add elevation of 0 for a placeholder
        # unclear if we need a property to display
        properties = {"elevation": 0}
        pointColor = {
            True: {"r": 241./255., "g": 163./255., "b": 64./255.},
            False: {"r": 153./255., "g": 142./255., "b": 195./255.}
        }
        if coloredPoint_expr is not None:
            boolPoint = extractColoredPoint(obj)
            properties['fillColor'] = pointColor[boolPoint]
            properties['strokeColor'] = pointColor[boolPoint]
            properties['stroke'] = True
            properties['strokeWidth'] = 1
            properties['radius'] = 5

        feature = geojson.Feature(geometry=point, properties=properties)
        return feature

    jsonArrayRewriter(jsonFilepath, tmpdir, convertToGeoJson,
                      header=geojson_header, footer=geojson_footer,
                      outFilepath=geoJsonFilePath, jsonDumpser=geojson.dumps)
