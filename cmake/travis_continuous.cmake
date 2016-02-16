set(CTEST_SOURCE_DIRECTORY "$ENV{GIRDER_SOURCE_DIR}")
set(CTEST_BINARY_DIRECTORY "$ENV{GIRDER_BUILD_DIR}")

include(${CTEST_SOURCE_DIRECTORY}/CTestConfig.cmake)
set(CTEST_SITE "Travis")
set(CTEST_BUILD_NAME "Linux-$ENV{TRAVIS_BRANCH}")
set(CTEST_CMAKE_GENERATOR "Unix Makefiles")

ctest_start("Continuous")
ctest_configure(
  OPTIONS
  "-DPYTHON_COVERAGE=$ENV{PY_COVG};-DPYTHON_VERSION=$ENV{TRAVIS_PYTHON_VERSION};-DSPARK_TEST_MASTER_URL=spark://localhost:7077"
)
ctest_build()
ctest_test(
  PARALLEL_LEVEL 1
  INCLUDE minerva
  RETURN_VALUE res
)
ctest_coverage()
file(REMOVE "${CTEST_BINARY_DIRECTORY}/coverage.xml")
ctest_submit()

file(REMOVE "${CTEST_BINARY_DIRECTORY}/test_failed")
if(NOT res EQUAL 0)
  file(WRITE "${CTEST_BINARY_DIRECTORY}/test_failed" "error")
  message(FATAL_ERROR "Test failures occurred.")
endif()
