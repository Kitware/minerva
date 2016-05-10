set(COVERAGE_MINIMUM_PASS 90)

python_tests_init()

add_python_style_test(python_static_analysis_minerva "${PROJECT_SOURCE_DIR}/minerva")

add_python_test(analysis)
