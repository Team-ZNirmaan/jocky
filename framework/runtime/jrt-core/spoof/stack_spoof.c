/*
 * jrt-core: synthetic call-stack generator (Implementation Plan §9).
 *
 * INVARIANT 7: Every sensitive syscall carries a signed-module call stack.
 *
 * Before a sensitive syscall the runtime splices synthetic return-address
 * frames whose targets resolve inside legitimate signed modules (ntdll /
 * win32u / kernel32), so a stack walk sees a plausible chain rather than a
 * raw runtime frame.
 *
 * CET/shadow-stack hosts defeat return-address spoofing; that limit is
 * declared in §11 and this primitive degrades rather than pretending
 * otherwise.
 */

#include "spoof/spoof.h"

#ifdef JRT_TARGET_WINDOWS

/* Synthetic-frame descriptors are resolved from signed modules during
 * jrt_init(). The concrete gadget set + the frame-splicing trampoline are
 * completed alongside jrt-blind (Phase 6); this scaffold records the
 * contract so callers can already route sensitive calls through it. */

int jrt_spoof_init(void) {
    return -1;   /* no gadgets registered yet */
}

long jrt_spoofed_call(long (*fn)(void*, void*, void*, void*, void*, void*),
                      void* a1, void* a2, void* a3, void* a4, void* a5, void* a6) {
    return fn(a1, a2, a3, a4, a5, a6);
}

#else  /* non-Windows: no signed-module frame spoofing */

int jrt_spoof_init(void) {
    return -1;
}

long jrt_spoofed_call(long (*fn)(void*, void*, void*, void*, void*, void*),
                      void* a1, void* a2, void* a3, void* a4, void* a5, void* a6) {
    return fn(a1, a2, a3, a4, a5, a6);
}

#endif
