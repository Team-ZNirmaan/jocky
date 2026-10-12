#include "ir/ir.h"

const OpcodeInfo OPCODE_TABLE[] = {
    // opcode                           min_priv  effect             platform          name
    {IROpcode::IR_COLLECT_PROC_META,    PRIV_L0, EffectClass::READ, PlatformTarget::BOTH,    "collect_proc_meta"},
    {IROpcode::IR_COLLECT_SERVICE_ENUM, PRIV_L0, EffectClass::READ, PlatformTarget::BOTH,    "collect_service_enum"},
    {IROpcode::IR_COLLECT_NETWORK_CONNECTIONS, PRIV_L0, EffectClass::READ, PlatformTarget::BOTH, "collect_network_connections"},
    // NOTE: scheduled_tasks is marked BOTH, not WINDOWS. The architecture
    // (§8.1.2) lists host_triage as cross-platform, and exit criterion §1.9
    // requires `host_triage.jky --target=linux` to emit a valid ELF64 — but
    // that script uses `collect scheduled_tasks`. On Linux the equivalent
    // source is cron/systemd timers, so the opcode is realized on both.
    {IROpcode::IR_COLLECT_SCHEDULED_TASKS,     PRIV_L0, EffectClass::READ, PlatformTarget::BOTH, "collect_scheduled_tasks"},
    {IROpcode::IR_COLLECT_PERSISTENCE,  PRIV_L0, EffectClass::READ, PlatformTarget::BOTH,    "collect_persistence"},
    {IROpcode::IR_COLLECT_MFT,          PRIV_L1, EffectClass::READ, PlatformTarget::WINDOWS, "collect_mft"},
    {IROpcode::IR_COLLECT_USN,          PRIV_L1, EffectClass::READ, PlatformTarget::WINDOWS, "collect_usn"},
    {IROpcode::IR_COLLECT_EVTLOG,       PRIV_L1, EffectClass::READ, PlatformTarget::WINDOWS, "collect_evtlog"},
    {IROpcode::IR_COLLECT_PREFETCH,     PRIV_L1, EffectClass::READ, PlatformTarget::WINDOWS, "collect_prefetch"},
    {IROpcode::IR_COLLECT_SHIMCACHE_AMCACHE, PRIV_L1, EffectClass::READ, PlatformTarget::WINDOWS, "collect_shimcache_amcache"},
    {IROpcode::IR_COLLECT_REGISTRY,     PRIV_L1, EffectClass::READ, PlatformTarget::WINDOWS, "collect_registry"},
    {IROpcode::IR_COLLECT_NETWORK_CAPTURE, PRIV_L1, EffectClass::READ, PlatformTarget::BOTH, "collect_network_capture"},
    {IROpcode::IR_COLLECT_MEMORY,       PRIV_L1, EffectClass::READ, PlatformTarget::BOTH,    "collect_memory"},
    {IROpcode::IR_COLLECT_AUTORUNS,     PRIV_L0, EffectClass::READ, PlatformTarget::WINDOWS, "collect_autoruns"},
    {IROpcode::IR_INJECT,               PRIV_L0, EffectClass::WRITE, PlatformTarget::WINDOWS, "inject"},
    {IROpcode::IR_PERSIST,              PRIV_L0, EffectClass::WRITE, PlatformTarget::BOTH,    "persist"},
    {IROpcode::IR_BLIND,                PRIV_L2, EffectClass::KERNEL, PlatformTarget::BOTH,   "blind"},
    {IROpcode::IR_EXEC_TRUSTED,         PRIV_L0, EffectClass::WRITE, PlatformTarget::WINDOWS, "exec_trusted"},
    {IROpcode::IR_BEACON,               PRIV_L0, EffectClass::NETWORK, PlatformTarget::BOTH,  "beacon"},
    {IROpcode::IR_UPLOAD,               PRIV_L0, EffectClass::NETWORK, PlatformTarget::BOTH,  "upload"},
    {IROpcode::IR_FILTER,               PRIV_L0, EffectClass::TRANSFORM, PlatformTarget::BOTH, "filter"},
    {IROpcode::IR_TIMELINE,             PRIV_L0, EffectClass::TRANSFORM, PlatformTarget::BOTH, "timeline"},
    {IROpcode::IR_HASH_ALL,             PRIV_L0, EffectClass::TRANSFORM, PlatformTarget::BOTH, "hash_all"},
    {IROpcode::IR_ALERT,                PRIV_L0, EffectClass::TRANSFORM, PlatformTarget::BOTH, "alert"},
    {IROpcode::IR_IOC_CHECK,            PRIV_L0, EffectClass::TRANSFORM, PlatformTarget::BOTH, "ioc_check"},
    {IROpcode::IR_ROOTKIT_DETECT,       PRIV_L2, EffectClass::KERNEL, PlatformTarget::BOTH,   "rootkit_detect"},
};

const size_t OPCODE_TABLE_SIZE = sizeof(OPCODE_TABLE) / sizeof(OPCODE_TABLE[0]);
