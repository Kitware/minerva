cmake_minimum_required(VERSION 2.8.6)

project(minerva NONE)

include(CTest)
enable_testing()

set(PYTHON_VERSION "2.7" CACHE STRING "Python version used for testing")

find_package(PythonInterp ${PYTHON_VERSION} REQUIRED)

option(PYTHON_STATIC_ANALYSIS "Run Python static analysis tests with flake8" ON)
option(PYTHON_COVERAGE "Run tests with coverage.py" ON)
option(PYTHON_BRANCH_COVERAGE "Use branch-level coverage instead of line-level" OFF)

if(PYTHON_COVERAGE)
  find_program(PYTHON_COVERAGE_EXECUTABLE coverage)
endif()

if(PYTHON_STATIC_ANALYSIS)
  find_program(FLAKE8_EXECUTABLE flake8)
endif()

if(BUILD_TESTING)
  include(minerva/tests/PythonTests.cmake)
  add_subdirectory(minerva/tests)
endif()
