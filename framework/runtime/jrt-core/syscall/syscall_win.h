/*
 * jrt-core: Indirect Windows syscall layer — public interface.
 *
 * Compile-time API name hashes (DJB2) replace plaintext strings in the
 * binary (invariant 2). The SSN/gadget resolution and the indirect
 * invocation are implemented in syscall_win.c.
 */
#ifndef JRT_SYSCALL_WIN_H
#define JRT_SYSCALL_WIN_H

#include "syscall_defs.h"

/* ── Compile-time API name hashes (DJB2) ────────────────────────── */
#define HASH_NtAllocateVirtualMemory    0x6793C34C
#define HASH_NtProtectVirtualMemory     0xE0C8C432
#define HASH_NtWriteVirtualMemory       0x3E1C0764
#define HASH_NtCreateSection            0x1A8C215D
#define HASH_NtMapViewOfSection         0x4A85D74E
#define HASH_NtUnmapViewOfSection       0x5BB2F5A2
#define HASH_NtCreateThreadEx           0xCB0C6B27
#define HASH_NtQueueApcThread           0x9E79F08B
#define HASH_NtSetContextThread         0xD14FCA1D
#define HASH_NtGetContextThread         0xE15B38C9
#define HASH_NtSuspendThread            0xF4811C8A
#define HASH_NtResumeThread             0x2C1A944E
#define HASH_NtClose                    0xD019DE40
#define HASH_NtQuerySystemInformation   0x1FDB9D63
#define HASH_NtQueryVirtualMemory       0x4C1E35FA
#define HASH_NtSetInformationFile       0xBBDE7F31
#define HASH_NtCreateFile               0x1720F5D1
#define HASH_NtReadFile                 0x4AEC4321
#define HASH_NtWriteFile                0xD82E5ACB
#define HASH_NtDeviceIoControlFile      0x7A1F52CE
#define HASH_NtLoadDriver               0x6E104218

/* Resolve SSNs + syscall;ret gadgets for all target functions.
 * Returns the number of entries resolved, or a negative error code. */
int jrt_resolve_syscalls(void);

/* Indirect syscall invocation. `hash` identifies the NT function; the
 * remaining variadic arguments are the real NT parameters. The `syscall`
 * instruction always lives inside ntdll, never in our code pages. */
long jrt_syscall(uint32_t hash, ...);

/* DJB2 hash of a NUL-terminated name (shared with the build tooling). */
uint32_t jrt_djb2_hash(const char* str);

#endif /* JRT_SYSCALL_WIN_H */
