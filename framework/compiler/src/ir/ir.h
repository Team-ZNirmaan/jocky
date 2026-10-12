#pragma once
#include "token.h"
#include "ast/ast.h"
#include <string>
#include <vector>
#include <variant>
#include <cstdint>
#include <cstddef>

// ── Effect classes — what kind of system interaction does this opcode perform?
enum class EffectClass {
    READ,       // Reads system state (proc list, registry, files)
    WRITE,      // Modifies system state (persist, inject)
    KERNEL,     // Requires kernel-level access (blind)
    NETWORK,    // Network operations (beacon, upload)
    TRANSFORM   // Data transformation (filter, timeline, hash)
};

// ── Platform target ────────────────────────────────────────────────
enum class PlatformTarget {
    WINDOWS,
    LINUX,
    BOTH
};

// ── IR Opcodes ─────────────────────────────────────────────────────
enum class IROpcode {
    // Collection (read-only, forensic data gathering)
    IR_COLLECT_PROC_META,           // L0, Both — process list
    IR_COLLECT_SERVICE_ENUM,        // L0, Both — services
    IR_COLLECT_NETWORK_CONNECTIONS, // L0, Both — TCP/UDP sockets
    IR_COLLECT_SCHEDULED_TASKS,     // L0, Windows — scheduled tasks
    IR_COLLECT_PERSISTENCE,         // L0/L1, Both — autoruns
    IR_COLLECT_MFT,                 // L1, Windows — NTFS MFT
    IR_COLLECT_USN,                 // L1, Windows — USN journal
    IR_COLLECT_EVTLOG,              // L1, Windows — event logs
    IR_COLLECT_PREFETCH,            // L1, Windows — prefetch files
    IR_COLLECT_SHIMCACHE_AMCACHE,   // L1, Windows — shimcache + amcache
    IR_COLLECT_REGISTRY,            // L1, Windows — registry hives
    IR_COLLECT_NETWORK_CAPTURE,     // L1, Both — packet capture
    IR_COLLECT_MEMORY,              // L1, Both — memory dump + analysis
    IR_COLLECT_AUTORUNS,            // L0/L1, Windows — comprehensive ASEPs

    // Actions (modify system state)
    IR_INJECT,                      // L0/L1, Windows — process injection
    IR_PERSIST,                     // L0/L1, Both — persistence
    IR_BLIND,                       // L2, Both — sensor blinding
    IR_EXEC_TRUSTED,                // L0, Windows — LOLBin execution

    // Communication
    IR_BEACON,                      // L0, Both — C2 beacon
    IR_UPLOAD,                      // L0, Both — upload results

    // Transforms (data pipeline)
    IR_FILTER,                      // L0, Both — filter records
    IR_TIMELINE,                    // L0, Both — build timeline
    IR_HASH_ALL,                    // L0, Both — hash all records
    IR_ALERT,                       // L0, Both — emit alert
    IR_IOC_CHECK,                   // L0, Both — check IOC list

    // Meta
    IR_ROOTKIT_DETECT               // L2, Both — differential detection
};

// ── Opcode metadata (privilege, effect, platform) ──────────────────
struct OpcodeInfo {
    IROpcode      opcode;
    PrivilegeLevel min_priv;
    EffectClass    effect;
    PlatformTarget platform;
    const char*    name;
};

// Global opcode info table — defined in ir.cpp
extern const OpcodeInfo OPCODE_TABLE[];
extern const size_t     OPCODE_TABLE_SIZE;

// ── IR Instruction — one unit of execution ─────────────────────────
struct IRInstruction {
    IROpcode opcode;

    // Arguments
    std::string target;          // e.g., "proc_meta", "MFT", "Security" (evtlog channel)
    std::vector<std::string> pos_args;
    std::vector<std::pair<std::string, std::variant<std::string, int, double>>> named_args;

    // Source location for diagnostics
    Location loc;

    // Resolved metadata (filled during semantic analysis)
    PrivilegeLevel min_priv;
    EffectClass    effect;
    PlatformTarget platform;
};

// ── IR Pipeline — a sequence of instructions where output flows ────
struct IRPipeline {
    std::vector<IRInstruction> stages;
    Location loc;
};

// ── IR Program — the complete compiled artifact ────────────────────
struct IRProgram {
    std::string artifact_name;
    PrivilegeLevel declared_priv;
    std::vector<std::string> emits;

    // Body: flat list of instructions or pipelines
    std::vector<std::variant<IRInstruction, IRPipeline>> body;

    // String literal table — collected during lowering for encryption
    std::vector<std::string> string_table;
};
