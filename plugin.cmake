add_standard_plugin_tests(NO_CLIENT_TESTS)

add_web_client_test(
    minerva "${PROJECT_SOURCE_DIR}/plugins/minerva/plugin_tests/client/minervaSpec.js"
    ENABLEDPLUGINS "gravatar" "jobs" "minerva"
    SETUP_MODULES "${_pluginDir}/plugin_tests/create_user.py"
)
set_property(TEST web_client_minerva PROPERTY LABELS minerva_client)

add_web_client_test(
    geojson "${PROJECT_SOURCE_DIR}/plugins/minerva/plugin_tests/client/geojsonUtilSpec.js"
)
set_property(TEST web_client_geojson PROPERTY LABELS minerva_client)