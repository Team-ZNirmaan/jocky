/*
 * Linux file-backed execution via memfd_create.
 *
 * INVARIANT 5: Every executable region is file-backed.
 *
 * memfd_create() creates an anonymous file in RAM that is visible
 * in /proc/self/maps as a named memory region, satisfying the
 * "file-backed" requirement. The file never touches disk.
 *
 * Flow:
 *   1. memfd_create("", MFD_CLOEXEC) → fd
 *   2. write(fd, payload, payload_size)
 *   3. mmap(fd, PROT_READ|PROT_EXEC) → executable mapping
 *   4. Jump to entry point in the mapped region
 */

#include "exec/exec.h"
#include <stdint.h>
#include <stddef.h>

#ifdef JRT_TARGET_LINUX

#include "syscall/syscall_linux.h"

#define MFD_CLOEXEC 0x0001U

/* Execute a payload via memfd_create (fileless, file-backed) */
int jrt_exec_memfd(const uint8_t* payload, size_t payload_size,
                   uint32_t entry_offset) {
    /* 1. Create anonymous in-memory file */
    int fd = jrt_memfd_create("", MFD_CLOEXEC);
    if (fd < 0) return -1;

    /* 2. Write payload to the memfd */
    size_t written = 0;
    while (written < payload_size) {
        long n = jrt_write(fd, payload + written, payload_size - written);
        if (n <= 0) { jrt_close(fd); return -2; }
        written += (size_t)n;
    }

    /* 3. mmap the memfd as executable
     * PROT_READ|PROT_EXEC = 0x05
     * MAP_PRIVATE = 0x02
     */
    void* mapped = jrt_mmap(NULL, payload_size, 0x05, 0x02, fd, 0);
    if ((long)mapped < 0) { jrt_close(fd); return -3; }

    /* Close fd — the mapping keeps the memfd alive */
    jrt_close(fd);

    /* 4. Jump to entry point
     * The payload is position-independent code (PIC).
     * entry_offset is the byte offset from the start of payload to the
     * entry function.
     */
    typedef int (*EntryFn)(void);
    EntryFn entry = (EntryFn)((uint8_t*)mapped + entry_offset);
    int result = entry();

    /* 5. Cleanup: unmap */
    jrt_linux_syscall6(SYS_munmap, (long)mapped, payload_size, 0, 0, 0, 0);

    return result;
}

#else  /* not Linux: the vector is unavailable */

int jrt_exec_memfd(const uint8_t* payload, size_t payload_size,
                   uint32_t entry_offset) {
    (void)payload; (void)payload_size; (void)entry_offset;
    return -1;
}

#endif
