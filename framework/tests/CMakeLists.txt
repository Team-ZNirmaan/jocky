# ── Tests ──────────────────────────────────────────────────────────
# Phase 0 bootstrap smoke test. The full verification battery (invariants
# 1-9, YARA rules, N-build sweeps) lands in Phase 9.
add_test(NAME jockey_bootstrap
    COMMAND ${CMAKE_COMMAND} -E echo "JOCKEY Phase 0 bootstrap OK"
)
