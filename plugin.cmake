add_standard_plugin_tests(NO_SERVER_TESTS NO_CLIENT)
add_python_test(dataset PLUGIN minerva BIND_SERVER)
add_python_test(geojson PLUGIN minerva BIND_SERVER)
add_python_test(session PLUGIN minerva BIND_SERVER)
add_python_test(geocoder PLUGIN minerva BIND_SERVER)
add_python_test(wms PLUGIN minerva BIND_SERVER)

set_property(TEST python_static_analysis_minerva PROPERTY LABELS minerva_server)
set_property(TEST server_minerva.dataset PROPERTY LABELS minerva_server)
set_property(TEST server_minerva.geojson PROPERTY LABELS minerva_server)
set_property(TEST server_minerva.session PROPERTY LABELS minerva_server)
set_property(TEST server_minerva.geocoder PROPERTY LABELS minerva_server)
set_property(TEST server_minerva.wms PROPERTY LABELS minerva_server)

add_web_client_test(
    minerva "${PROJECT_SOURCE_DIR}/plugins/minerva/plugin_tests/client/minervaSpec.js"
    PLUGIN minerva
    ENABLEDPLUGINS "gravatar" "jobs" "database_assetstore" "large_image"
    TEST_MODULE "plugin_tests.web_client_test"
    TEST_PYTHONPATH "${CMAKE_CURRENT_LIST_DIR}"
)
set_property(TEST web_client_minerva.minerva PROPERTY LABELS minerva_client)

add_web_client_test(
    geojson "${PROJECT_SOURCE_DIR}/plugins/minerva/plugin_tests/client/geojsonUtilSpec.js"
    PLUGIN minerva
    ENABLEDPLUGINS "gravatar" "jobs" "database_assetstore" "large_image"
)
set_property(TEST web_client_minerva.geojson PROPERTY LABELS minerva_client)

add_puglint_test(minerva "${CMAKE_CURRENT_LIST_DIR}/web_client/templates")
set_property(TEST puglint_minerva PROPERTY LABELS minerva_client)

add_puglint_test(minerva_external "${CMAKE_CURRENT_LIST_DIR}/web_external/templates")
set_property(TEST puglint_minerva_external PROPERTY LABELS minerva_client)

add_test(
    NAME "eslint_minerva"
    WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}"
    COMMAND npx eslint "--ignore-path" "${CMAKE_CURRENT_LIST_DIR}/.eslintignore" "${CMAKE_CURRENT_LIST_DIR}/web_client"
)
set_property(TEST eslint_minerva PROPERTY LABELS minerva_client)

add_test(
    NAME "eslint_minerva_tests"
    WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}"
    COMMAND npx eslint "--ignore-path" "${CMAKE_CURRENT_LIST_DIR}/.eslintignore" "${CMAKE_CURRENT_LIST_DIR}/plugin_tests/client"
)
set_property(TEST eslint_minerva_tests PROPERTY LABELS minerva_client)

add_test(
    NAME "eslint_minerva_external"
    WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}"
    COMMAND npx eslint "--ignore-path" "${CMAKE_CURRENT_LIST_DIR}/.eslintignore" "${CMAKE_CURRENT_LIST_DIR}/web_external"
)
set_property(TEST eslint_minerva_external PROPERTY LABELS minerva_client)
