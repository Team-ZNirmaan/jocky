/*
 * jrt-core: synthetic call-stack generator — public interface (§9, invariant 7).
 */
#ifndef JRT_SPOOF_H
#define JRT_SPOOF_H

/* Locate signed-module gadgets used to synthesize plausible return frames.
 * Returns 0 on success, -1 where unavailable (e.g. non-Windows hosts). */
int jrt_spoof_init(void);

/* Invoke a sensitive function while presenting a synthetic return-address
 * chain drawn from signed modules. Falls back to a direct call where the
 * platform cannot provide frames (never a silent no-op on Windows). */
long jrt_spoofed_call(long (*fn)(void*, void*, void*, void*, void*, void*),
                      void* a1, void* a2, void* a3, void* a4, void* a5, void* a6);

#endif /* JRT_SPOOF_H */
