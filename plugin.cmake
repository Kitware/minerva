add_standard_plugin_tests(NO_SERVER_TESTS NO_CLIENT_TESTS)
add_python_test(analysis PLUGIN minerva)
add_python_test(dataset PLUGIN minerva)
add_python_test(geojson PLUGIN minerva)
add_python_test(import_analyses PLUGIN minerva)
add_python_test(session PLUGIN minerva)
add_python_test(twofishes PLUGIN minerva)
add_python_test(wms PLUGIN minerva)

set_property(TEST python_static_analysis_minerva PROPERTY LABELS minerva_server)
set_property(TEST server_minerva.analysis PROPERTY LABELS minerva_server)
set_property(TEST server_minerva.dataset PROPERTY LABELS minerva_server)
set_property(TEST server_minerva.geojson PROPERTY LABELS minerva_server)
set_property(TEST server_minerva.import_analyses PROPERTY LABELS minerva_server)
set_property(TEST server_minerva.session PROPERTY LABELS minerva_server)
set_property(TEST server_minerva.twofishes PROPERTY LABELS minerva_server)
set_property(TEST server_minerva.wms PROPERTY LABELS minerva_server)

add_web_client_test(
    minerva "${PROJECT_SOURCE_DIR}/plugins/minerva/plugin_tests/client/minervaSpec.js"
    PLUGIN minerva
    ENABLEDPLUGINS "gravatar" "jobs"
    SETUP_MODULES "${_pluginDir}/plugin_tests/create_user.py"
)
set_property(TEST web_client_minerva.minerva PROPERTY LABELS minerva_client)

add_web_client_test(
    geojson "${PROJECT_SOURCE_DIR}/plugins/minerva/plugin_tests/client/geojsonUtilSpec.js"
    PLUGIN minerva
    ENABLEDPLUGINS "gravatar" "jobs"
)
set_property(TEST web_client_minerva.geojson PROPERTY LABELS minerva_client)

set_property(TEST puglint_minerva PROPERTY LABELS minerva_client)
set_property(TEST eslint_minerva PROPERTY LABELS minerva_client)