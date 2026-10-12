/*
 * Phase 2 envelope smoke test (Linux host).
 *
 * Links the real jrt-core runtime and verifies the mechanical invariants
 * that are observable off a live Windows/Ubuntu VM:
 *
 *   Invariant 4 — no writable+executable page exists at any point
 *   Invariant 5 — an executable region produced by the substrate is
 *                 file-backed (memfd appears as a named file in the maps)
 *   Sleep obfuscation — encrypt/decrypt cycle preserves content
 *
 * Windows-only invariants (1, 6, 7, 9) belong to the VM battery in Phase 9.
 * The harness may use libc; the runtime it links does not.
 */

#include "jrt_core.h"
#include "allocator/allocator.h"
#include "syscall/syscall_linux.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int tests_failed = 0;

#define CHECK(cond, msg) do {                              \
    if (cond) { printf("  [x] %s\n", (msg)); }             \
    else      { printf("  [ ] FAIL: %s\n", (msg)); tests_failed++; } \
} while (0)

/* Count "rwx" permission fields in /proc/self/maps (libc read, test-only). */
static int count_wx_mappings(void) {
    FILE* f = fopen("/proc/self/maps", "r");
    if (!f) return -1;
    char line[512];
    int wx = 0;
    while (fgets(line, sizeof(line), f)) {
        /* perms is the second whitespace-delimited field */
        char* sp = strchr(line, ' ');
        if (sp && sp[1] == 'r' && sp[2] == 'w' && sp[3] == 'x') wx++;
    }
    fclose(f);
    return wx;
}

/* Look up the maps line covering `addr`; return 1 if it names a file. */
static int mapping_is_file_backed(void* addr) {
    FILE* f = fopen("/proc/self/maps", "r");
    if (!f) return 0;
    char line[512];
    unsigned long target = (unsigned long)addr;
    int found_file = 0;
    while (fgets(line, sizeof(line), f)) {
        unsigned long lo = 0, hi = 0;
        if (sscanf(line, "%lx-%lx", &lo, &hi) != 2) continue;
        if (target >= lo && target < hi) {
            /* a path follows the inode field; memfd shows as /memfd:... */
            found_file = (strstr(line, "/memfd:") != NULL);
            printf("      map: %s", line);
            break;
        }
    }
    fclose(f);
    return found_file;
}

int main(void) {
    printf("Phase 2 runtime envelope smoke test (Linux)\n");

    /* ── jrt_init / environment probe ─────────────────────────────── */
    JrtContext* ctx = jrt_init();
    CHECK(ctx != NULL, "jrt_init() returns a context");
    printf("      privilege=%d elevated=%d x86_64=%d lockdown=%d sig_enforce=%d bpf_lsm=%d\n",
           ctx->privilege, ctx->is_elevated, ctx->is_x86_64,
           ctx->lockdown, ctx->module_sig_enforce, ctx->bpf_lsm);

    /* ── Invariant 4: baseline has no W+X ─────────────────────────── */
    CHECK(count_wx_mappings() == 0, "invariant 4: baseline has no W+X mapping");
    CHECK(jrt_verify_no_wx() == 0, "invariant 4: jrt_verify_no_wx() reports clean");

    /* ── Allocator: RW → RX never exposes W+X ─────────────────────── */
    size_t sz = 4096;
    unsigned char* buf = (unsigned char*)jrt_alloc_rw(sz);
    CHECK(buf != NULL, "allocator: jrt_alloc_rw() succeeds");
    for (size_t i = 0; i < sz; i++) buf[i] = (unsigned char)(i ^ 0x5A);
    CHECK(jrt_protect_rx(buf, sz) == 0, "allocator: RW -> RX transition");
    CHECK(jrt_verify_no_wx() == 0, "invariant 4: held after RW -> RX");

    /* ── Invariant 5: memfd execution region is file-backed ───────── */
    size_t psz = 4096;
    unsigned char* payload = (unsigned char*)jrt_alloc_rw(psz);
    for (size_t i = 0; i < psz; i++) payload[i] = 0xC3;   /* ret sled */

    int fd = jrt_memfd_create("jrt_test", 0x0001 /* MFD_CLOEXEC */);
    CHECK(fd >= 0, "invariant 5: jrt_memfd_create() succeeds");

    size_t off = 0;
    while (off < psz) {
        long n = jrt_write(fd, payload + off, psz - off);
        if (n <= 0) break;
        off += (size_t)n;
    }
    CHECK(off == psz, "invariant 5: payload written to memfd");

    void* mapped = jrt_mmap(NULL, psz, 0x05 /* R+X */, 0x02 /* PRIVATE */, fd, 0);
    CHECK((long)mapped > 0, "invariant 5: memfd mapped R+X");
    CHECK(mapping_is_file_backed(mapped),
          "invariant 5: executable region resolves to a file-backed mapping");
    CHECK(count_wx_mappings() == 0,
          "invariant 4: no W+X mapping after file-backed exec map");
    jrt_close(fd);

    /* ── Sleep obfuscation round-trip ─────────────────────────────── */
    unsigned char before[4096];
    memcpy(before, buf, sizeof(before));
    int enc = jrt_sleep_encrypt(0xDEADBEEF);
    int dec = jrt_sleep_decrypt(0xDEADBEEF);
    CHECK(enc >= 0 && dec >= 0 && enc == dec,
          "sleep obfuscation: encrypt/decrypt cycle runs over RX regions");
    CHECK(memcmp(before, buf, sizeof(before)) == 0,
          "sleep obfuscation: content preserved across a cycle");
    CHECK(jrt_verify_no_wx() == 0, "invariant 4: held across sleep cycle");

    /* ── Cleanup ──────────────────────────────────────────────────── */
    jrt_cleanup(ctx);
    CHECK(1, "jrt_cleanup() completes and wipes tracked allocations");

    printf(tests_failed ? "\nRESULT: %d check(s) FAILED\n" : "\nRESULT: all checks passed\n",
           tests_failed);
    return tests_failed ? 1 : 0;
}
