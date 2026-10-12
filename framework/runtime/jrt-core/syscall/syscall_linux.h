/*
 * jrt-core: Linux direct syscall layer — public interface.
 *
 * Linux syscall ABI (x86-64):
 *   syscall number → rax
 *   args: rdi, rsi, rdx, r10, r8, r9
 *   return value → rax
 *
 * These bypass libc entirely. No glibc linkage for any sensitive path.
 */
#ifndef JRT_SYSCALL_LINUX_H
#define JRT_SYSCALL_LINUX_H

#include <stdint.h>
#include <stddef.h>

/* ── Syscall numbers (stable Linux ABI) ─────────────────────────── */
#define SYS_read             0
#define SYS_write            1
#define SYS_open             2
#define SYS_close            3
#define SYS_mmap             9
#define SYS_mprotect         10
#define SYS_munmap           11
#define SYS_socket           41
#define SYS_connect          42
#define SYS_sendto           44
#define SYS_recvfrom         45
#define SYS_getuid           102
#define SYS_getdents64       217
#define SYS_openat           257
#define SYS_memfd_create     319
#define SYS_execveat         322

/* ── Generic syscall wrapper ────────────────────────────────────── */
static inline long jrt_linux_syscall6(long nr,
    long a1, long a2, long a3, long a4, long a5, long a6) {
    long ret;
    register long r10 __asm__("r10") = a4;
    register long r8  __asm__("r8")  = a5;
    register long r9  __asm__("r9")  = a6;
    __asm__ volatile (
        "syscall"
        : "=a"(ret)
        : "a"(nr), "D"(a1), "S"(a2), "d"(a3),
          "r"(r10), "r"(r8), "r"(r9)
        : "rcx", "r11", "memory"
    );
    return ret;
}

/* Convenience wrappers with correct arg count */
#define jrt_syscall0(nr)                    jrt_linux_syscall6(nr, 0,0,0,0,0,0)
#define jrt_syscall1(nr,a)                  jrt_linux_syscall6(nr, (long)(a),0,0,0,0,0)
#define jrt_syscall2(nr,a,b)                jrt_linux_syscall6(nr, (long)(a),(long)(b),0,0,0,0)
#define jrt_syscall3(nr,a,b,c)              jrt_linux_syscall6(nr, (long)(a),(long)(b),(long)(c),0,0,0)
#define jrt_syscall4(nr,a,b,c,d)            jrt_linux_syscall6(nr, (long)(a),(long)(b),(long)(c),(long)(d),0,0)
#define jrt_syscall5(nr,a,b,c,d,e)          jrt_linux_syscall6(nr, (long)(a),(long)(b),(long)(c),(long)(d),(long)(e),0)
#define jrt_syscall6(nr,a,b,c,d,e,f)        jrt_linux_syscall6(nr, (long)(a),(long)(b),(long)(c),(long)(d),(long)(e),(long)(f))

/* ── High-level wrappers (defined in syscall_linux.c) ───────────── */

/* Memory */
void* jrt_mmap(void* addr, size_t len, int prot, int flags, int fd, long off);
int   jrt_mprotect(void* addr, size_t len, int prot);
int   jrt_munmap(void* addr, size_t len);

/* File-backed anonymous execution */
int   jrt_memfd_create(const char* name, unsigned int flags);
int   jrt_execveat(int dirfd, const char* path, char* const argv[],
                   char* const envp[], int flags);

/* File I/O */
int   jrt_openat(int dirfd, const char* path, int flags, int mode);
long  jrt_read(int fd, void* buf, size_t count);
long  jrt_write(int fd, const void* buf, size_t count);
int   jrt_close(int fd);

/* Network */
int   jrt_socket(int domain, int type, int protocol);
int   jrt_connect(int sockfd, const void* addr, int addrlen);

/* Introspection */
int   jrt_getuid(void);
long  jrt_getdents64(int fd, void* dirp, size_t count);

#endif /* JRT_SYSCALL_LINUX_H */
