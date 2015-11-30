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

from dateutil.parser import parse
import requests


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
            'apikey='+apiKey,
            'timestamp='+timestamp,
            'nonce='+nonce,
            'signature='+signature
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

    def search_result(self, requestId):
        """Query the BSVE for the results of a the given search request.

        :returns dict[]: The array of results or None if not finished
        """
        endpoint = '/api/search/v1/result'
        resp = self._request('GET', endpoint, params={'requestId': requestId})
        search = json.loads(resp)

        if search['status'] == 1:
            return search['results']
        elif search['status'] == -1:
            raise Exception('BSVE request %s failed.' % requestId)
        elif search['status'] != 0:
            raise Exception(
                'Unexpected status from BSVE %s.' % str(search['status'])
            )
        return None

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
            result = self.search_result(request)
        return result

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

if __name__ == '__main__':
    from argparse import ArgumentParser, ArgumentDefaultsHelpFormatter
    from os import environ

    end = datetime.now()
    start = datetime(end.year - 1, end.month, end.day)

    end = str(end.date())
    start = str(start.date())

    parser = ArgumentParser(
        description='Perform a BSVE search.',
        formatter_class=ArgumentDefaultsHelpFormatter
    )
    parser.add_argument('term', nargs='+', help='The search term')
    parser.add_argument(
        '--verbose', '-v', default=False, const=sys.stderr,
        help='Verbose output', action='store_const'
    )
    parser.add_argument(
        '--start', '-s', nargs=1, default=start,
        help='The start date'
    )
    parser.add_argument(
        '--end', '-e', nargs=1, default=end,
        help='The end date'
    )
    parser.add_argument(
        '--sources', nargs='+', default=None,
        help='The data sources to search'
    )
    parser.add_argument(
        '--locations', nargs='+', default=None,
        help='The locations to include'
    )
    parser.add_argument(
        '--timezone', nargs=1, default='UTC',
        help='The timezone of the search'
    )
    parser.add_argument(
        '--user', nargs=1, default=environ.get('BSVE_USERNAME'),
        help='The bsve username, defaults $BSVE_USERNAME'
    )
    parser.add_argument(
        '--apikey', nargs=1, default=environ.get('BSVE_APIKEY'),
        help='The bsve api key, defaults to $BSVE_APIKEY'
    )
    parser.add_argument(
        '--secretkey', nargs=1, default=environ.get('BSVE_SECRETKEY'),
        help='The bsve secret key, defaults to $BSVE_SECRETKEY'
    )
    parser.add_argument(
        '--url', nargs=1, default='http://search.bsvecosystem.net',
        help='The base url hosting the bsve api'
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
    data = bsve.construct_search_query(
        ' '.join(args.term), args.start, args.end,
        time_zone=args.timezone, sources=args.sources,
        locations=args.locations
    )

    print(json.dumps(bsve.search(data)))
