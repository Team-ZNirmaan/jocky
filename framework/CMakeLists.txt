cmake_minimum_required(VERSION 3.20)
project(JOCKEY VERSION 0.1.0 LANGUAGES C CXX ASM)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# ── LLVM discovery ──────────────────────────────────────────────────
find_package(LLVM 18 REQUIRED CONFIG)
message(STATUS "Found LLVM ${LLVM_PACKAGE_VERSION}")
message(STATUS "Using LLVMConfig.cmake in: ${LLVM_DIR}")

list(APPEND CMAKE_MODULE_PATH "${LLVM_CMAKE_DIR}")
include(AddLLVM)

# ── Flex discovery ──────────────────────────────────────────────────
find_package(FLEX 2.6 REQUIRED)

# ── Platform detection ──────────────────────────────────────────────
if(WIN32)
    set(JOCKEY_PLATFORM "WINDOWS")
    add_compile_definitions(JOCKEY_PLATFORM_WINDOWS=1)
elseif(UNIX AND NOT APPLE)
    set(JOCKEY_PLATFORM "LINUX")
    add_compile_definitions(JOCKEY_PLATFORM_LINUX=1)
else()
    message(FATAL_ERROR "Unsupported platform")
endif()

# ── Cross-compilation support ───────────────────────────────────────
option(JOCKEY_TARGET_WINDOWS "Cross-compile runtime for Windows" OFF)
option(JOCKEY_TARGET_LINUX   "Cross-compile runtime for Linux"   OFF)

# ── Sub-projects ────────────────────────────────────────────────────
add_subdirectory(compiler)
add_subdirectory(passes)
add_subdirectory(runtime)
add_subdirectory(c2-server)

# ── Tests ───────────────────────────────────────────────────────────
enable_testing()
add_subdirectory(tests)
