/*
 * jrt-core: Linux direct syscall wrappers.
 *
 * Linux syscall ABI (x86-64):
 *   syscall number → rax
 *   args: rdi, rsi, rdx, r10, r8, r9
 *   return value → rax
 *
 * These bypass libc entirely. No glibc linkage for any sensitive path.
 * The numeric table and the jrt_linux_syscall6 primitive live in
 * syscall_linux.h so every runtime TU can use them.
 */

#include "syscall/syscall_linux.h"

/* ── High-level wrappers ────────────────────────────────────────── */

/* Memory mapping */
void* jrt_mmap(void* addr, size_t len, int prot, int flags, int fd, long off) {
    return (void*)jrt_syscall6(SYS_mmap, addr, len, prot, flags, fd, off);
}

int jrt_mprotect(void* addr, size_t len, int prot) {
    return (int)jrt_syscall3(SYS_mprotect, addr, len, prot);
}

int jrt_munmap(void* addr, size_t len) {
    return (int)jrt_syscall2(SYS_munmap, addr, len);
}

/* File-backed anonymous execution: memfd_create */
int jrt_memfd_create(const char* name, unsigned int flags) {
    return (int)jrt_syscall2(SYS_memfd_create, name, flags);
}

/* Execute from memfd */
int jrt_execveat(int dirfd, const char* path, char* const argv[],
                 char* const envp[], int flags) {
    return (int)jrt_syscall5(SYS_execveat, dirfd, path, argv, envp, flags);
}

/* File I/O */
int jrt_openat(int dirfd, const char* path, int flags, int mode) {
    return (int)jrt_syscall4(SYS_openat, dirfd, path, flags, mode);
}
long jrt_read(int fd, void* buf, size_t count) {
    return jrt_syscall3(SYS_read, fd, buf, count);
}
long jrt_write(int fd, const void* buf, size_t count) {
    return jrt_syscall3(SYS_write, fd, buf, count);
}
int jrt_close(int fd) {
    return (int)jrt_syscall1(SYS_close, fd);
}

/* Network */
int jrt_socket(int domain, int type, int protocol) {
    return (int)jrt_syscall3(SYS_socket, domain, type, protocol);
}
int jrt_connect(int sockfd, const void* addr, int addrlen) {
    return (int)jrt_syscall3(SYS_connect, sockfd, addr, addrlen);
}

/* UID check (for privilege detection) */
int jrt_getuid(void) {
    return (int)jrt_syscall0(SYS_getuid);
}

/* Directory listing (for /proc enumeration) */
long jrt_getdents64(int fd, void* dirp, size_t count) {
    return jrt_syscall3(SYS_getdents64, fd, dirp, count);
}
