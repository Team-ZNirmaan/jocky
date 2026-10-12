# ── LLVM Obfuscation Pass Plugins ──────────────────────────────────
# Built as a shared library loadable via -load-pass-plugin
add_llvm_pass_plugin(JockyObfuscation
    cfg_flatten/CfgFlatten.cpp
    mba/Mba.cpp
    opaque_predicates/OpaquePredicates.cpp
    instruction_sub/InstructionSub.cpp
    dead_code/DeadCode.cpp
    block_shuffle/BlockShuffle.cpp
    StringEncrypt.cpp        # String encryption pass (shared)
    PassRegistry.cpp         # Registration entry point
)

target_include_directories(JockyObfuscation PRIVATE
    ${LLVM_INCLUDE_DIRS}
    ${CMAKE_CURRENT_SOURCE_DIR}  # for shared headers
)
