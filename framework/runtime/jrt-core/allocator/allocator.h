/*
 * jrt-core: no-W+X memory allocator — public interface (Implementation Plan §2.3).
 */
#ifndef JRT_ALLOCATOR_H
#define JRT_ALLOCATOR_H

#include <stdint.h>
#include <stddef.h>

/* ── Permission constants (platform-independent) ────────────────── */
#define JRT_PROT_RW   0x01
#define JRT_PROT_RX   0x02
#define JRT_PROT_NONE 0x00

/* Core allocation — always starts as RW. */
void* jrt_alloc_rw(size_t size);

/* Protect: RW → RX (code is ready to execute). */
int   jrt_protect_rx(void* ptr, size_t size);

/* Protect: RX → RW (for modification or sleep encryption). */
int   jrt_protect_rw(void* ptr, size_t size);

/* Zero and free all tracked allocations. */
void  jrt_cleanup_all(void);

/* Verify invariant 4 across live mappings; returns the number of
 * W+X mappings found (0 == clean). */
int   jrt_verify_no_wx(void);

/* Sleep obfuscation (Ekko/FOLIAGE-style): XOR-encrypt every resident
 * RX region while idle, and decrypt on wake. Never W+X at any point. */
int   jrt_sleep_encrypt(uint32_t key);
int   jrt_sleep_decrypt(uint32_t key);

#endif /* JRT_ALLOCATOR_H */
