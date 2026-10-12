#include "emitter/pe_emitter.h"

// ── MSVC 14.38 (Visual Studio 2022 17.8) ───────────────────────────
static const ToolchainProfile PROFILE_MSVC_14_38 = {
    .name = "msvc-14.38",
    .majorLinkerVersion = 14,
    .minorLinkerVersion = 38,
    .timestampBase = 0x65000000,   // ~Sep 2023
    .timestampRange = 0x02000000,  // ±6 months
    .rich_entries = {
        // prod_id, build_id, count
        {0x0105, 0x8169, 0x0013},  // [C++] VS2022 17.8 cl.exe
        {0x0109, 0x8169, 0x0089},  // [ASM] VS2022 17.8 ml64.exe
        {0x010E, 0x8169, 0x0001},  // [LNK] VS2022 17.8 link.exe
        {0x0106, 0x8169, 0x0003},  // [IMP] VS2022 17.8 lib.exe
        {0x0001, 0x0000, 0x0097},  // [---] Imported objects
    }
};

// ── MSVC 14.35 (Visual Studio 2022 17.5) ───────────────────────────
static const ToolchainProfile PROFILE_MSVC_14_35 = {
    .name = "msvc-14.35",
    .majorLinkerVersion = 14,
    .minorLinkerVersion = 35,
    .timestampBase = 0x63E00000,
    .timestampRange = 0x02000000,
    .rich_entries = {
        {0x0105, 0x7E5E, 0x0011},
        {0x0109, 0x7E5E, 0x0072},
        {0x010E, 0x7E5E, 0x0001},
        {0x0001, 0x0000, 0x0085},
    }
};

// ── MSVC 14.29 (Visual Studio 2019 16.11) ──────────────────────────
static const ToolchainProfile PROFILE_MSVC_14_29 = {
    .name = "msvc-14.29",
    .majorLinkerVersion = 14,
    .minorLinkerVersion = 29,
    .timestampBase = 0x60F00000,
    .timestampRange = 0x03000000,
    .rich_entries = {
        {0x0105, 0x766F, 0x000E},
        {0x0109, 0x766F, 0x0064},
        {0x010E, 0x766F, 0x0001},
        {0x0001, 0x0000, 0x007A},
    }
};

// ── Clang 16 ───────────────────────────────────────────────────────
static const ToolchainProfile PROFILE_CLANG_16 = {
    .name = "clang-16",
    .majorLinkerVersion = 16,
    .minorLinkerVersion = 0,
    .timestampBase = 0x64000000,
    .timestampRange = 0x01000000,
    .rich_entries = {}  // Clang does NOT generate Rich headers
};

// ── Clang 18 ───────────────────────────────────────────────────────
static const ToolchainProfile PROFILE_CLANG_18 = {
    .name = "clang-18",
    .majorLinkerVersion = 18,
    .minorLinkerVersion = 0,
    .timestampBase = 0x65800000,
    .timestampRange = 0x01000000,
    .rich_entries = {}
};

// ── Profile selection by seed ──────────────────────────────────────
const ToolchainProfile* ALL_PROFILES[] = {
    &PROFILE_MSVC_14_38,
    &PROFILE_MSVC_14_35,
    &PROFILE_MSVC_14_29,
    &PROFILE_CLANG_16,
    &PROFILE_CLANG_18,
};
constexpr size_t NUM_PROFILES = sizeof(ALL_PROFILES) / sizeof(ALL_PROFILES[0]);

const ToolchainProfile& selectProfile(uint64_t seed) {
    return *ALL_PROFILES[seed % NUM_PROFILES];
}
