/*
 * jrt-core: encrypted-literal crypto — public interface (Implementation Plan §2.5).
 */
#ifndef JRT_CRYPTO_H
#define JRT_CRYPTO_H

#include <stdint.h>
#include <stddef.h>

/* Wire format emitted by the Phase 3 StringEncrypt pass. */
typedef struct {
    uint32_t key;
    uint32_t len;
    uint8_t  data[];
} EncryptedString;

/* Decrypt enc->data into buf (XOR, 4-byte key stream), NUL-terminated.
 * Returns the plaintext length, or -1 if buf is too small. */
int  jrt_decrypt_string_into(const EncryptedString* enc, char* buf, int buf_size);

/* Securely wipe a decrypted buffer (volatile; not optimizable away). */
void jrt_wipe_string(char* buf, int len);

/* Allocation-free string primitive: use inside JRT_WITH_STRING(name, blob). */
void jrt_stack_zero(void* buf, size_t size);

/* Convenience: decrypt into a stack buffer and wipe when the block exits.
 *   JRT_WITH_STRING(my_str, encrypted_blob_ptr) {
 *       jrt_some_function(my_str);   // my_str is a const char*
 *   }                                // wiped here
 */
#define JRT_WITH_STRING(name, enc_ptr) \
    char name##_buf[512]; \
    int name##_len = jrt_decrypt_string_into((enc_ptr), name##_buf, sizeof(name##_buf)); \
    const char* name = name##_buf; \
    for (int name##_guard = 1; name##_guard; \
         name##_guard = 0, jrt_wipe_string(name##_buf, name##_len))

#endif /* JRT_CRYPTO_H */
