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

function(add_minerva_server_test name)
  add_python_test("${name}" PLUGIN minerva)
  set_property(TEST "server_minerva.${name}" PROPERTY LABELS minerva_server)
endfunction()

function(add_minerva_python_style_test name path)
  set(test_name "pep8_style_minerva_${name}")
  add_python_style_test("${test_name}" "${PROJECT_SOURCE_DIR}/plugins/minerva/${path}")
  set_property(TEST "${test_name}" PROPERTY LABELS minerva_server)
endfunction()

function(add_minerva_eslint_test name path)
  add_eslint_test(
    "${name}" "${PROJECT_SOURCE_DIR}/plugins/minerva/${path}"
    ESLINT_CONFIG_FILE "${PROJECT_SOURCE_DIR}/plugins/minerva/.eslintrc.js"
  )
  set_property(TEST "eslint_${name}" PROPERTY LABELS minerva_client)
endfunction()

add_minerva_server_test(dataset)
add_minerva_server_test(source)
add_minerva_server_test(session)
add_minerva_server_test(bsve_analysis)
add_minerva_server_test(analysis_rest)
add_minerva_server_test(geonames)
add_minerva_server_test(s3_dataset)
add_minerva_server_test(s3_source)
add_minerva_server_test(import_analyses)
add_minerva_server_test(contour_analysis)
add_minerva_server_test(wms)
add_minerva_server_test(elasticsearch)
add_minerva_server_test(geojson)
add_minerva_server_test(postgres)
add_minerva_server_test(mongo_dataset)


set(SPARK_TEST_MASTER_URL  "" CACHE STRING "Spark master URL")
if (SPARK_TEST_MASTER_URL)
    add_minerva_server_test(mean_contour_analysis)
    set_property(TEST server_minerva.mean_contour_analysis APPEND PROPERTY ENVIRONMENT "SPARK_TEST_MASTER_URL=${SPARK_TEST_MASTER_URL}")
endif()



add_minerva_python_style_test(constants "server/constants.py")
add_minerva_python_style_test(geonames "server/geonames")
add_minerva_python_style_test(rest "server/rest")
add_minerva_python_style_test(utility "server/utility")
add_minerva_python_style_test(bsve "server/utility/bsve")
add_minerva_python_style_test(jobs "server/jobs")

add_minerva_eslint_test(minerva "web_external/js")
add_minerva_eslint_test(minerva-gruntfile "Gruntfile.js")

add_web_client_test(
    minerva "${PROJECT_SOURCE_DIR}/plugins/minerva/plugin_tests/client/minervaSpec.js"
    ENABLEDPLUGINS "gravatar" "jobs" "romanesco" "minerva"
    BASEURL "/static/built/testEnvMinerva.html"
    TEST_MODULE "plugin_tests.web_client_test"
)
set_property(TEST web_client_minerva PROPERTY LABELS minerva_client)

set_property(TEST js_coverage_reset APPEND PROPERTY LABELS minerva_client)
set_property(TEST js_coverage_combine_report APPEND PROPERTY LABELS minerva_client)

set_property(TEST py_coverage_reset APPEND PROPERTY LABELS minerva_server)
set_property(TEST py_coverage_combine APPEND PROPERTY LABELS minerva_server)
set_property(TEST py_coverage APPEND PROPERTY LABELS minerva_server)
set_property(TEST py_coverage_html APPEND PROPERTY LABELS minerva_server)
set_property(TEST py_coverage_xml APPEND PROPERTY LABELS minerva_server)
