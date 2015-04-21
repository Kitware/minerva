###############################################################################
#  Copyright 2015 Kitware Inc.
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

add_python_style_test(pep8_style_minerva
                      "${PROJECT_SOURCE_DIR}/plugins/minerva/server")
add_javascript_style_test(
    minerva "${PROJECT_SOURCE_DIR}/plugins/minerva/web_external/js"
    JSHINT_EXTRA_CONFIGS ${PROJECT_SOURCE_DIR}/plugins/minerva/web_external/js/.jshintrc
)
