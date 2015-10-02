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

add_python_test(dataset PLUGIN minerva)
add_python_test(source PLUGIN minerva)
add_python_test(session PLUGIN minerva)
add_python_test(analysis PLUGIN minerva)
add_python_test(geonames PLUGIN minerva)
add_python_test(s3_dataset PLUGIN minerva)
add_python_test(import_analyses PLUGIN minerva)
add_python_test(contour_analysis PLUGIN minerva)
add_python_test(wms PLUGIN minerva)
add_python_test(geojson PLUGIN minerva)


set(SPARK_TEST_MASTER_URL  "" CACHE STRING "Spark master URL")
if (SPARK_TEST_MASTER_URL)
    add_python_test(mean_contour_analysis PLUGIN minerva)
    set_property(TEST server_minerva.mean_contour_analysis APPEND PROPERTY ENVIRONMENT "SPARK_TEST_MASTER_URL=${SPARK_TEST_MASTER_URL}")
endif()



add_python_style_test(pep8_style_minerva_constants
                      "${PROJECT_SOURCE_DIR}/plugins/minerva/server/constants.py")
add_python_style_test(pep8_style_minerva_geonames
                      "${PROJECT_SOURCE_DIR}/plugins/minerva/server/geonames")
add_python_style_test(pep8_style_minerva_rest
                      "${PROJECT_SOURCE_DIR}/plugins/minerva/server/rest")
add_python_style_test(pep8_style_minerva_utility
                      "${PROJECT_SOURCE_DIR}/plugins/minerva/server/utility")
add_python_style_test(pep8_style_minerva_bsve
                      "${PROJECT_SOURCE_DIR}/plugins/minerva/server/utility/bsve")
add_python_style_test(pep8_style_minerva_jobs
                      "${PROJECT_SOURCE_DIR}/plugins/minerva/server/jobs")

add_javascript_style_test(
    minerva "${PROJECT_SOURCE_DIR}/plugins/minerva/web_external/js"
    JSHINT_EXTRA_CONFIGS ${PROJECT_SOURCE_DIR}/plugins/minerva/web_external/js/.jshintrc
)

add_web_client_test(
    minerva "${PROJECT_SOURCE_DIR}/plugins/minerva/plugin_tests/minervaSpec.js"
    ENABLEDPLUGINS "gravatar" "jobs" "romanesco" "minerva"
    BASEURL "/static/built/testEnvMinerva.html")
