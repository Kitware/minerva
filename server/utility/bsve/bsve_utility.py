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

from __future__ import print_function

from hashlib import sha1
import hmac
import json
import random
import time
import sys
from datetime import datetime
from functools import wraps

from dateutil.parser import parse
import requests


def flatten(func):
    """Flatten the output of a single element REST request."""
    @wraps(func)
    def wrapper(*args, **kw):
        result = func(*args, **kw)
        try:
            assert len(result) == 1
        except Exception:
            raise Exception('Expected an return value of length 1')
        return result[0]
    return wrapper


def assert_status(func):
    """Assert the value returned by a rest endpoint succeeded.

    The wrapped function will return the results of the REST call when
    it succeeds.  When the call fails, an exception will be raised.
    None will be returned when the requested item is not yet ready.
    """
    @wraps(func)
    def wrapper(*args, **kw):
        result = json.loads(func(*args, **kw))
        if result['status'] == 1:
            if result.get('results') is not None:
                return result['results']
            elif result.get('result') is not None:
                return result['result']
            return result
        elif result['status'] == -1:
            raise Exception('BSVE request failed with %s' % result['errors'])
        elif result['status'] != 0:
            raise Exception(
                'Unexpected status from BSVE %s.' % str(result['status'])
            )
        return None
    return wrapper


class BsveUtility(object):

    def __init__(self, user, apikey, secret, base=None, verbose=None):
        """Initialize BSVE server and authentication data."""
        self._user = user
        self._apikey = apikey
        self._secret = secret
        self._base = base
        if base is None:
            self._base = 'http://search.bsvecosystem.net'
        self._session = requests.Session()
        self._verbose = verbose

    def _auth_header(self):
        """Generate an authentication header for the BSVE request."""
        apiKey = str(self._apikey)
        secretKey = str(self._secret)
        userName = str(self._user)

        nonce = self._generate_nonce()
        timestamp = str(int(time.time() * 1000))

        hmacKey = ':'.join([apiKey, secretKey])
        hmacMessage = ''.join([apiKey, timestamp, nonce, userName])
        hashed = hmac.new(hmacKey, hmacMessage, sha1)
        signature = hashed.digest().encode('hex').rstrip('\n')

        authParts = [
            'apikey=' + apiKey,
            'timestamp=' + timestamp,
            'nonce=' + nonce,
            'signature=' + signature
        ]
        harbingerAuthentication = ';'.join(authParts)

        return {'harbinger-authentication': harbingerAuthentication}

    def _headers(self):
        """Return a dict of default headers (including authentication)."""
        headers = self._auth_header()
        headers['Content-Type'] = 'application/json'
        return headers

    def _request(self, method, endpoint, params={}, data=''):
        url = self._base.rstrip('/') + '/' + endpoint.lstrip('/')
        headers = self._headers()
        response = self._session.request(
            method=method,
            url=url,
            headers=headers,
            params=params,
            data=data
        )
        if not response.ok:
            self._output_curl_command(response, sys.stderr)
            raise Exception(
                'BSVE request failed with %s: %s' % (
                    response.status_code,
                    response.reason
                )
            )
        self._output_curl_command(response, self._verbose)
        return response.text

    def search_submit(self, data):
        """Submit a search query to the BSVE.

        Example data payload:

            data = {
                "term": "flu",
                "sources": ["ProMED"],
                "fromDate": "2015-01-01",
                "toDate": "2015-05-26",
                "clientTimeZone": "EST",
                "locations": [{"location": "United States",
                               "locationType": "country"}]
            }

        :returns str: The request id
        """
        endpoint = '/api/search/v1/request'
        return self._request('POST', endpoint, data=json.dumps(data))

    @assert_status
    def search_result(self, requestId):
        """Query the BSVE for the results of a the given search request.

        :returns dict[]: The array of results or None if not finished
        """
        endpoint = '/api/search/v1/result'
        return self._request('GET', endpoint, params={'requestId': requestId})

    @classmethod
    def construct_search_query(cls, term, from_date, to_date,
                               time_zone='UTC', sources=None, locations=None):
        """Build a json object for a search query.

        This is a helper method for BSVE search end points.

        :param str term: The search term
        :param str from_date: The start date
        :param str to_date: The end date
        :param str time_zone: The time zone of the given dates
        :param str[] sources: A list of sources to include
        :param dict[] locations: A list of locations to include
        :returns dict: A normalized search query for the BSVE api
        """
        from_date = cls._normalize_date(from_date)
        to_date = cls._normalize_date(to_date)
        data = {
            'term': term,
            'fromDate': from_date,
            'toDate': to_date,
            'clientTimeZone': time_zone
        }
        if sources is not None:
            data['sources'] = sources
        if locations is not None:
            data['locations'] = locations
        return data

    def search(self, data):
        """Submit a search and block until it is completed.

        :returns dict[]: The search results
        """
        request = self.search_submit(data)
        result = None
        while result is None:
            time.sleep(1)
            result = self.search_result(request)
        return result

    @assert_status
    def list_types(self, *types):
        """List available data types.

        :returns dict[]: The available sources
        """
        endpoint = '/api/data/list'
        return self._request('GET', endpoint)

    @flatten
    @assert_status
    def type_info(self, type):
        """Get information about a data source type.

        :param str type: The source type name
        :returns dict[]: The datasource metadata
        """
        endpoint = '/api/data/list/' + type
        return self._request('GET', endpoint)

    def data_dump_submit(self, type, filter, source=None, count=None):
        """Performa data dump of the given source type.

        :param str type: A source type
        :param str filter: An sql style query string
        :param str source: A single data source
        :param int count: Return the top "count" results
        :returns dict: Should contain the key `requestId` to get results
        """
        endpoint = '/api/data/query/' + type
        params = {
            '$filter': filter
        }
        if source is not None:
            params['$source'] = source
        if count is not None:
            params['$top'] = str(count)
        result = json.loads(self._request('GET', endpoint, params=params))
        if result['status'] not in (0, 1):
            raise Exception('Request failed with %s' % result['errors'])
        return result

    @assert_status
    def data_dump_result(self, requestId):
        """Query for the results of a data dump."""
        endpoint = '/api/data/result/' + str(requestId)
        return self._request('GET', endpoint)

    def data_dump(self, type, filter, source=None, count=None):
        """Perform a data set query and block until done."""
        request = self.data_dump_submit(
            type, filter, source, count
        )['requestId']
        result = None
        while result is None:
            time.sleep(1)
            result = self.data_dump_result(request)
        return result

    def soda_dump(self, count=1000):
        """Dump and process a data query of the SODA source.

        :param int start: The starting record
        :param int count: The maximum number of results to return
        """
        results = self.data_dump('SODA', '', count=count)
        return [json.loads(r) for r in results]

    def custom_call(self, endpoint, method='GET', params={}, data=''):
        """Submit a custom REST call to the BSVE API."""
        return json.loads(self._request(method, endpoint, params, data))

    @staticmethod
    def _normalize_date(date):
        """Generate a date string for the BSVE api."""
        if not isinstance(date, datetime):
            date = parse(date)
        return date.strftime('%Y-%m-%d')

    @staticmethod
    def _generate_nonce(length=8):
        """Generate pseudorandom number for authentication."""
        return ''.join([str(random.randint(0, 9)) for i in range(length)])

    @staticmethod
    def _output_curl_command(resp, file):
        """Write the request as a curl command to the given file."""
        if not file:  # verbose is off
            return

        req = resp.request
        command = "curl -X %(method)s -H %(headers)s -d '%(data)s' '%(url)s'\n"
        headers = ' -H '.join(
            ["'%s: %s'" % (k, v) for k, v in req.headers.items()]
        )

        args = {
            'method': req.method,
            'url': req.url,
            'data': req.body or '',
            'headers': headers
        }

        file.write(
            command % args
        )

        file.write('\n' + '*' * 35 + ' GOT ' + '*' * 35 + '\n')
        file.write(resp.text)
        file.write('\n' + '*' * 35 + ' END ' + '*' * 35 + '\n\n')


def main():
    from argparse import ArgumentParser, ArgumentDefaultsHelpFormatter
    from os import environ

    end = datetime.now()
    start = datetime(end.year - 1, end.month, end.day)

    end = str(end.date())
    start = str(start.date())

    parser = ArgumentParser(
        description='Perform a BSVE REST call.',
        formatter_class=ArgumentDefaultsHelpFormatter
    )
    parser.add_argument(
        '--verbose', '-v', default=False, const=sys.stderr,
        help='Verbose output', action='store_const'
    )
    parser.add_argument(
        '--user', default=environ.get('BSVE_USERNAME'),
        help='The bsve username, defaults $BSVE_USERNAME'
    )
    parser.add_argument(
        '--apikey', default=environ.get('BSVE_APIKEY'),
        help='The bsve api key, defaults to $BSVE_APIKEY'
    )
    parser.add_argument(
        '--secretkey', default=environ.get('BSVE_SECRETKEY'),
        help='The bsve secret key, defaults to $BSVE_SECRETKEY'
    )
    parser.add_argument(
        '--url', default='http://search.bsvecosystem.net',
        help='The base url hosting the bsve api'
    )

    subparsers = parser.add_subparsers(dest='command')

    search_parser = subparsers.add_parser(
        'search', help='Search BSVE data sets'
    )
    search_parser.add_argument('term', nargs='+', help='The search term')
    search_parser.add_argument(
        '--start', '-s', default=start,
        help='The start date'
    )
    search_parser.add_argument(
        '--end', '-e', default=end,
        help='The end date'
    )
    search_parser.add_argument(
        '--sources', nargs='+', default=None,
        help='The data sources to search'
    )
    search_parser.add_argument(
        '--locations', nargs='+', default=None,
        help='The locations to include'
    )
    search_parser.add_argument(
        '--timezone', default='UTC',
        help='The timezone of the search'
    )

    custom_parser = subparsers.add_parser(
        'custom', help='Call a custom endpoint'
    )
    custom_parser.add_argument(
        'endpoint', help='The endpoint to call, ex "/api/data/list"'
    )
    custom_parser.add_argument(
        '--method', help='The HTTP method to use', default='GET'
    )
    custom_parser.add_argument(
        '--params', help='A JSON dictionary of URL query parameters',
        default='{}'
    )
    custom_parser.add_argument(
        '--data', nargs='?',
        help='Raw data for the request body or with no '
        'argument read from STDIN',
        default='', const=None
    )

    type_parser = subparsers.add_parser(
        'type', help='Return data source type information'
    )
    type_parser.add_argument(
        '--name', help='Return only the this type',
        default=None
    )

    data_parser = subparsers.add_parser(
        'data', help='Dump data for a given source type'
    )
    data_parser.add_argument(
        'type', help='The source data type'
    )
    data_parser.add_argument(
        'filter', help='The data filter to query the database with'
    )
    data_parser.add_argument(
        '--source', help='Limit to this data source',
        default=None
    )
    data_parser.add_argument(
        '--count', help='Limit to this many results',
        default=None
    )

    soda_parser = subparsers.add_parser(
        'soda', help='Dump data from the SODA API.'
    )
    soda_parser.add_argument(
        '--count', help='Limit to this many results',
        default=None
    )

    subparsers.add_parser(
        'auth', help='Generate an authentication header.'
    )

    args = parser.parse_args()

    if not (args.user and args.apikey and args.secretkey):
        print('Must provide authentication information.', file=sys.stderr)
        parser.print_help(sys.stderr)
        sys.exit(1)

    bsve = BsveUtility(
        args.user, args.apikey, args.secretkey,
        args.url, args.verbose
    )

    if args.command == 'search':
        data = bsve.construct_search_query(
            ' '.join(args.term), args.start, args.end,
            time_zone=args.timezone, sources=args.sources,
            locations=args.locations
        )
        output = bsve.search(data)
    elif args.command == 'list':
        output = bsve.list_sources()
    elif args.command == 'custom':
        data = args.data
        if data is None:
            data = sys.stdin.read()
        else:
            data = ''.join(args.data)
        output = bsve.custom_call(
            args.endpoint, args.method, json.loads(args.params), data
        )
    elif args.command == 'type':
        if args.name is None:
            output = bsve.list_types()
        else:
            output = bsve.type_info(args.name)
    elif args.command == 'data':
        output = bsve.data_dump(
            args.type, args.filter, source=args.source, count=args.count
        )
    elif args.command == 'soda':
        output = bsve.soda_dump(
            count=args.count
        )
    elif args.command == 'auth':
        output = bsve._auth_header()

    if isinstance(output, (dict, list, tuple)):
        output = json.dumps(output, indent=2)
    print(output)


if __name__ == '__main__':
    main()
