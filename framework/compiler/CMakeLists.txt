# ── Flex lexer generation ───────────────────────────────────────────
FLEX_TARGET(JockyLexer
    src/lexer/jocky.l
    ${CMAKE_CURRENT_BINARY_DIR}/jocky_lexer.cpp
    DEFINES_FILE ${CMAKE_CURRENT_BINARY_DIR}/jocky_lexer.h
)

# ── Compiler objects ───────────────────────────────────────────────
# An object library makes the include directories propagate to the
# generated lexer and to every translation unit, and lets both the CLI
# driver and (later) the tests reuse the same objects.
add_library(jockyc_objs OBJECT
    src/main.cpp
    src/parser/parser.cpp
    src/ast/ast.cpp
    src/ir/ir.cpp
    src/typechecker/typechecker.cpp
    src/lowering/lowering.cpp
    src/emitter/pe_emitter.cpp
    src/emitter/elf_emitter.cpp
    src/emitter/profiles.cpp
    ${FLEX_JockyLexer_OUTPUTS}
)

target_include_directories(jockyc_objs PUBLIC
    src/
    src/lexer                     # so "token.h" resolves from headers + lexer
    ${CMAKE_CURRENT_BINARY_DIR}   # for generated lexer headers
    ${LLVM_INCLUDE_DIRS}
)
target_compile_definitions(jockyc_objs PRIVATE ${LLVM_DEFINITIONS})

# ── Compiler executable ────────────────────────────────────────────
add_executable(jockyc $<TARGET_OBJECTS:jockyc_objs>)

# Link LLVM components needed for code generation
llvm_map_components_to_libnames(LLVM_LIBS
    core
    support
    irreader
    passes
    x86asmparser
    x86codegen
    x86desc
    x86info
    aarch64asmparser
    aarch64codegen
    aarch64desc
    aarch64info
    mc
    target
)

target_link_libraries(jockyc PRIVATE ${LLVM_LIBS})
target_compile_definitions(jockyc PRIVATE ${LLVM_DEFINITIONS})
