/*
 * Runtime string decryption.
 *
 * At compile time (Phase 3, StringEncrypt pass), every string literal
 * is replaced with an encrypted blob:
 *
 *   struct EncryptedString {
 *       uint32_t key;             // XOR key (derived from build seed)
 *       uint32_t len;             // Original string length
 *       uint8_t  data[];          // XOR-encrypted string bytes
 *   };
 *
 * At runtime, jrt_decrypt_string():
 *   1. XOR-decrypts into a stack buffer
 *   2. Returns pointer to the stack buffer
 *   3. Caller uses the string
 *   4. jrt_wipe_string() zeros the stack buffer
 *
 * INVARIANT 2: No plaintext literal exists in any section.
 */

#include "crypto/crypto.h"
#include <stdint.h>

/* Decrypt a string into the provided buffer.
 * Caller must provide a buffer of at least enc->len + 1 bytes.
 * Returns the number of bytes decrypted.
 */
int jrt_decrypt_string_into(const EncryptedString* enc, char* buf, int buf_size) {
    if ((int)enc->len >= buf_size) return -1;

    uint32_t key = enc->key;
    uint8_t key_bytes[4] = {
        (uint8_t)(key),
        (uint8_t)(key >> 8),
        (uint8_t)(key >> 16),
        (uint8_t)(key >> 24)
    };

    for (uint32_t i = 0; i < enc->len; i++) {
        buf[i] = (char)(enc->data[i] ^ key_bytes[i % 4]);
    }
    buf[enc->len] = '\0';

    return (int)enc->len;
}

/* Securely wipe a decrypted string buffer.
 * Uses volatile to prevent compiler from optimizing away the zeroing.
 */
void jrt_wipe_string(char* buf, int len) {
    volatile char* p = buf;
    for (int i = 0; i < len; i++) {
        p[i] = 0;
    }
}
