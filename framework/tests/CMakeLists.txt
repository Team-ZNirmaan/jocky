# ── Tests ──────────────────────────────────────────────────────────
# Phase 0 bootstrap smoke test. The full verification battery (invariants
# 1-9, YARA rules, N-build sweeps) lands in Phase 9.
add_test(NAME jockey_bootstrap
    COMMAND ${CMAKE_COMMAND} -E echo "JOCKEY Phase 0 bootstrap OK"
)

# ── Phase 2: runtime envelope (invariants 4 & 5) on Linux ──────────
# A host-side harness that exercises jrt-core directly: no-W+X allocator,
# file-backed (memfd) execution region, sleep obfuscation, and cleanup.
if(UNIX AND NOT APPLE)
    add_executable(phase2_envelope phase2_envelope.c)
    target_link_libraries(phase2_envelope PRIVATE jrt-core)
    add_test(NAME phase2_invariants COMMAND phase2_envelope)
endif()
