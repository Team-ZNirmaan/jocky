/*
 * jrt-core: runtime context and environment probe (Implementation Plan §2, §5).
 *
 * The compiler treats JrtContext as opaque: jrt_init() returns a handle and
 * every lowered opcode passes it back. The agent probes and reports its
 * privilege and environment at startup (§5) so the server selects techniques
 * that are actually available.
 */
#ifndef JRT_CORE_H
#define JRT_CORE_H

#include <stdint.h>

#define JRT_ABI_VERSION 1

/* Actual runtime privilege (distinct from an artifact's declared MinPriv). */
enum {
    JRT_PRIV_L0 = 0,   /* unprivileged */
    JRT_PRIV_L1 = 1,   /* admin / root */
    JRT_PRIV_L2 = 2    /* kernel / sensor-blinding capable */
};

typedef struct JrtContext {
    uint32_t abi_version;
    uint64_t build_seed;

    int privilege;          /* JRT_PRIV_L0/L1/L2 achieved */
    int is_elevated;        /* admin (Windows) / root (Linux) */

    /* ── Environment / hardening probe (§5, §11) ─────────────────── */
    int hvci;               /* Windows: HVCI enabled */
    int secure_boot;        /* UEFI secure boot */
    int vulnerable_driver_blocklist; /* Windows: CI\Config blocklist */
    int lockdown;           /* Linux: lockdown LSM active */
    int module_sig_enforce; /* Linux: module signature enforcement */
    int bpf_lsm;            /* Linux: BPF LSM present */
    int audit_immutable;    /* Linux: audit rules locked (-e 2) */
    int is_x86_64;

    /* Syscall layer state (Windows: number of resolved SSNs/gadgets). */
    int syscalls_resolved;
} JrtContext;

/* Initialize the runtime: resolve the syscall layer (Windows), probe the
 * environment, and return an opaque context handle. */
JrtContext* jrt_init(void);

/* Tear down: wipe + free all tracked allocations and zero the context. */
void jrt_cleanup(JrtContext* ctx);

#endif /* JRT_CORE_H */
