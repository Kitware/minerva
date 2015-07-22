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

from hashlib import sha1
import hmac
import json
import os
import random
import time

import requests


class BsveUtility():

    def __init__(self, bsveConfig=None):
        if bsveConfig is None:
            self.bsveConfig = json.load(
                open(os.path.join(os.path.dirname(__file__), "bsve.json")))
        else:
            self.bsveConfig = bsveConfig

    def buildHarbingerAuthenticationHeader(self):

        def generate_nonce(length=8):
            """Generate pseudorandom number."""
            return ''.join([str(random.randint(0, 9)) for i in range(length)])

        apiKey = self.bsveConfig['bsve']['API_KEY']
        secretKey = self.bsveConfig['bsve']['SECRET_KEY']
        userName = self.bsveConfig['bsve']['USER_NAME']

        nonce = generate_nonce()
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

    def buildExampleSearchPayload(self):
        data = {
            "term": "flu",
            "sources": ["ProMED"],
            "fromDate": "2015-01-01",
            "toDate": "2015-05-26",
            "clientTimeZone": "EST",
            "locations": [{"location": "United States",
                           "locationType": "country"}]
        }
        return data

    def searchRequest(self, data):
        host = 'http://search.bsvecosystem.net'
        host = 'http://beta-search.bsvecosystem.net'
        endpoint = '/api/search/v1/request'

        url = host + endpoint

        headers = self.buildHarbingerAuthenticationHeader()
        headers['Content-Type'] = 'application/json'

        response = requests.post(url, headers=headers, data=json.dumps(data))

        # print out curl equivalent for debugging
        # curlLine = ['curl']
        # curlLine.append('-X POST')
        # for k, v in headers.items():
        #     curlLine.append('-H "%s: %s"' % (k, v))
        # curlLine.append('-d \'%s\'' % json.dumps(data))
        # curlLine.append(url)
        # print(' '.join(curlLine))
        if response.status_code == 200:
            return response.text
        else:
            raise (Exception('Exception calling bsve search request %s %s' %
                   (response.status_code, response.reason)))

    def searchResult(self, requestId):
        host = 'http://search.bsvecosystem.net'
        host = 'http://beta-search.bsvecosystem.net'
        endpoint = '/api/search/v1/result'

        url = host + endpoint + ('?requestId=%s' % requestId)

        headers = self.buildHarbingerAuthenticationHeader()

        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            raise (Exception('Exception calling bsve search result %s %s' %
                   (response.status_code, response.reason)))

        search = json.loads(response.text)
        if search['status'] == 1:
            return search['results']
        elif search['status'] == -1:
            # error
            return search
        else:
            # wait and loop
            import time
            time.sleep(5)
            return self.searchResult(requestId)

    def searchUntilResult(self, data):
        requestId = self.searchRequest(data)
        return self.searchResult(requestId)
