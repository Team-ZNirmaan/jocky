/*
 * jrt-core: stack-buffer zeroing primitive (Implementation Plan §9).
 *
 * Every scratch buffer that momentarily holds a decrypted literal is wiped
 * with this primitive so no plaintext survives on the stack after use.
 * The volatile store prevents the compiler from eliding the wipe.
 */

#include "crypto/crypto.h"
#include <stddef.h>

void jrt_stack_zero(void* buf, size_t size) {
    volatile unsigned char* p = (volatile unsigned char*)buf;
    while (size--) {
        *p++ = 0;
    }
}
