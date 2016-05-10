include(CMakeParseArguments)

set(py_coverage_rc "${PROJECT_BINARY_DIR}/minerva/tests/minerva.coveragerc")
set(flake8_config "${PROJECT_SOURCE_DIR}/minerva/tests/flake8.cfg")

if(PYTHON_BRANCH_COVERAGE)
  set(_py_branch_cov True)
else()
  set(_py_branch_cov False)
endif()

configure_file(
  "${PROJECT_SOURCE_DIR}/minerva/tests/minerva.coveragerc.in"
  "${py_coverage_rc}"
  @ONLY
)


function(python_tests_init)
  if(PYTHON_COVERAGE)
    add_test(
      NAME py_coverage_reset
      WORKING_DIRECTORY "${PROJECT_SOURCE_DIR}/minerva/"
      COMMAND "${PYTHON_COVERAGE_EXECUTABLE}" erase "--rcfile=${py_coverage_rc}"
    )
    add_test(
      NAME py_coverage_combine
      WORKING_DIRECTORY "${PROJECT_SOURCE_DIR}/minerva/"
      COMMAND "${PYTHON_COVERAGE_EXECUTABLE}" combine
    )
    add_test(
      NAME py_coverage
      WORKING_DIRECTORY "${PROJECT_SOURCE_DIR}/minerva/"
      COMMAND "${PYTHON_COVERAGE_EXECUTABLE}" report "--rcfile=${py_coverage_rc}" --fail-under=${COVERAGE_MINIMUM_PASS}
    )
    add_test(
      NAME py_coverage_xml
      WORKING_DIRECTORY "${PROJECT_SOURCE_DIR}/minerva/"
      COMMAND "${PYTHON_COVERAGE_EXECUTABLE}" xml "--rcfile=${py_coverage_rc}" -o "${PROJECT_BINARY_DIR}/coverage.xml"
    )
    set_property(TEST py_coverage PROPERTY DEPENDS py_coverage_combine)
    set_property(TEST py_coverage_xml PROPERTY DEPENDS py_coverage)
  endif()
endfunction()

function(add_python_style_test name input)
  if(PYTHON_STATIC_ANALYSIS)
    add_test(
      NAME ${name}
      WORKING_DIRECTORY "${PROJECT_SOURCE_DIR}/minerva/"
      COMMAND "${FLAKE8_EXECUTABLE}" "--config=${flake8_config}" "${input}"
    )
  endif()
endfunction()


function(add_python_test case)
  set(name "${PROJECT_NAME}_${case}")
  set(module minerva.tests.${case}_test)

  if(fn_PY2_ONLY AND PYTHON_VERSION MATCHES "^3")
    message(STATUS " !!! Not adding test ${name}, cannot run in python version ${PYTHON_VERSION}.")
    return()
  endif()

  if(PYTHON_COVERAGE)
    add_test(
      NAME ${name}
      WORKING_DIRECTORY "${PROJECT_SOURCE_DIR}/minerva/"
      COMMAND "${PYTHON_COVERAGE_EXECUTABLE}" run --append "--rcfile=${py_coverage_rc}"
              -m unittest -v ${module}
    )
  else()
    add_test(
      NAME ${name}
      WORKING_DIRECTORY "${PROJECT_SOURCE_DIR}/minerva/"
      COMMAND "${PYTHON_EXECUTABLE}" -m unittest -v ${module}
    )
  endif()

  if(PYTHON_COVERAGE)
    set_property(TEST ${name} APPEND PROPERTY DEPENDS py_coverage_reset)
    set_property(TEST py_coverage_combine APPEND PROPERTY DEPENDS ${name})
  endif()
endfunction()
