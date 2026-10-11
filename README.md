<p align="center">
  <h1 align="center">JOCKEY</h1>
  <p align="center">
    <strong>A cross-platform forensic programming language and framework with guaranteed evasion envelope</strong>
  </p>
  <p align="center">
    <a href="#installation">Installation</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#language-reference">Language Reference</a> •
    <a href="#forensic-scripts">Forensic Scripts</a> •
    <a href="#management-console">Management Console</a> •
    <a href="#honest-limits">Honest Limits</a>
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/platforms-Windows%20|%20Ubuntu-blue" alt="Platforms" />
    <img src="https://img.shields.io/badge/license-Proprietary-red" alt="License" />
    <img src="https://img.shields.io/badge/PS--26148-NTRO-green" alt="SIH PS 26148" />
    <img src="https://img.shields.io/badge/LLVM-18+-orange" alt="LLVM" />
    <img src="https://img.shields.io/badge/compiler-C++-blue" alt="C++" />
    <img src="https://img.shields.io/badge/runtime-C%20%2B%20ASM-lightgrey" alt="C + ASM" />
  </p>
</p>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Design Principles](#design-principles)
- [Architecture](#architecture)
  - [Three-Plane Architecture](#three-plane-architecture)
  - [Compilation Pipeline](#compilation-pipeline)
  - [Runtime Components](#runtime-components)
- [Technology Stack](#technology-stack)
- [Installation](#installation)
  - [Prerequisites](#prerequisites)
  - [Build from Source](#build-from-source)
  - [Docker (Recommended for CI)](#docker-recommended-for-ci)
- [Quick Start](#quick-start)
- [Language Reference](#language-reference)
  - [Grammar & Syntax](#grammar--syntax)
  - [Effect System](#effect-system)
  - [Privilege Levels](#privilege-levels)
  - [Pipeline Syntax](#pipeline-syntax)
- [Forensic Scripts](#forensic-scripts)
  - [Standard Library Scripts](#standard-library-scripts)
  - [Script Details](#script-details)
- [Privilege Model](#privilege-model)
  - [Privilege Levels (L0 / L1 / L2)](#privilege-levels-l0--l1--l2)
  - [Privilege Escalation Interface (jrt-escalate)](#privilege-escalation-interface-jrt-escalate)
- [Evasion Envelope](#evasion-envelope)
  - [Language-Owned Guarantees (FULL)](#language-owned-guarantees-full)
  - [Descoped Checks (PARTIAL — Accepted Residues)](#descoped-checks-partial--accepted-residues)
- [Runtime Technique Matrix](#runtime-technique-matrix)
  - [Execution Substrate (Multi-Vector In-Memory)](#execution-substrate-multi-vector-in-memory)
  - [Sensor Blinding — `blind()` Verb](#sensor-blinding--blind-verb)
- [Management Console & C2](#management-console)
  - [Console Features](#console-features)
  - [Transport Profiles](#transport-profiles)
  - [Evidence Integrity & Chain-of-Custody](#evidence-integrity--chain-of-custody)
- [Testable Invariants](#testable-invariants)
- [Verification & Demo Plan](#verification--demo-plan)
- [Honest Limits](#honest-limits)
- [Development Milestones](#development-milestones)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [Legal & Compliance](#legal--compliance)
- [License](#license)

---

## Overview

**JOCKEY** (also stylized *JOCKY*) is a cross-platform (Windows + Ubuntu) programming language and framework developed for **SIH Problem Statement 26148 — NTRO**. It enables systematic creation of forensic analysis scripts that operate without triggering security solutions.

Programs compiled with JOCKEY carry a **guaranteed, testable mechanical footprint envelope**: every syscall is indirect, no page is ever simultaneously writable and executable, no static import table or plaintext literal exists, executing memory is always file-backed, no process or thread is ever spawned as a side effect of lowering, and every build is polymorphically unique.

On top of this envelope sits:
- A **standard library** of forensic and post-exploitation primitives with an explicit privilege contract
- An operator-supplied **privilege bootstrap** (initial access and elevation are interfaces, not features)
- A PS-mandated **sensor-blinding module** (BYOVD on Windows, eBPF/auditd control on Linux)
- A **forensic artifact framework** with chain-of-custody and legal compliance
- A **CDN-fronted C2/management plane** for multi-implant enterprise operations

---

## Key Features

| Category | Capability |
|----------|-----------|
| **Language** | Custom DSL with effect/privilege type system; compiles to native x86-64 binaries via LLVM |
| **Polymorphism** | Every build is unique — different hashes, entry points, CFG shapes, import tables. CI/CD-integrated |
| **Evasion** | 19 detection checks neutralized at the language level (see [Evasion Envelope](#evasion-envelope)) |
| **Forensics** | 15 pre-built forensic scripts: host triage, disk, memory, network, persistence, timeline |
| **Cross-platform** | Same `.jky` source compiles to both Windows PE and Linux ELF with identical output semantics |
| **Privilege Model** | L0/L1/L2 privilege contract with explicit degradation behavior — no silent failures |
| **Sensor Blinding** | `blind()` verb: BYOVD kernel subversion (Windows), eBPF/auditd control (Linux) |
| **C2 & Console** | Web-based management console with RBAC, real-time agent status, forensic report viewer |
| **Transport** | Legitimate cloud APIs (Google Drive, Azure Blob, AWS S3, GCS) with owned TLS stack and JA3 mimicry |
| **Evidence Integrity** | Merkle-chain hashing, Ed25519 signatures, BSA 2023 §63 compliance certificates |

---

## Design Principles

| # | Principle | Description |
|---|-----------|-------------|
| **P1** | Mechanism vs. Intent Split | The programmer writes *what* (collect, inject, persist, beacon). The compiler owns *how*. No raw OS API access, no FFI, no inline assembly. |
| **P2** | Invariant-First Evasion | Every guarantee is a checkable invariant on the emitted binary and runtime — not a technique to apply. |
| **P3** | The Privilege Contract | Every stdlib primitive declares a minimum privilege level and a defined degraded behavior when run below it. |
| **P4** | Unprivileged-When-Exactly-Equal | Where an unprivileged realization has identical capability, it is the default lowering. |
| **P5** | Adaptive-Detector Honesty | No claim of permanent invisibility. Re-randomization is one CI iteration; signatures decay faster than the cost of writing them. |
| **P6** | PS-Literal Requirements | Where the PS explicitly names a mechanism, that module exists as a first-class component regardless of descoping. |

---

## Architecture

### Three-Plane Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  OPERATOR PLANE                                                         │
│   Central Management Console (web) ── C2 Server (multi-implant, jobs)   │
│        │  tasking: artifact schedules, primitive invocations            │
│        ▼  transport: TLS over CDN / legitimate cloud APIs              │
├─────────────────────────────────────────────────────────────────────────┤
│  BUILD PLANE (CI/CD — the polymorphic pipeline)                         │
│   .jky source → jocky-frontend → JOCKY IR → pass pipeline               │
│      (CFG flatten · opaque predicates · MBA · string encrypt ·          │
│       dead-code · import strategy · block shuffle · seed s)             │
│   → syscall-abstraction lowering → PE/ELF emitter → signed artifact     │
│   → per-build attestation: hash, footprint report, degradation matrix   │
├─────────────────────────────────────────────────────────────────────────┤
│  TARGET PLANE (per host)                                                │
│   Installer/service (operator-delivered, L0 or L1)                      │
│      └─ jocky-agent: task loop · artifact engine · stdlib runtime       │
│            ├─ jrt-core: indirect syscall layer · memory discipline      │
│            │            · TLS stack · transport                         │
│            ├─ jrt-escalate (L0→L1): operator-supplied C++ LPE modules   │
│            │            → probe · escalate · cleanup interface          │
│            ├─ jrt-blind (L2, PS 3B): BYOVD loader → kernel R/W →        │
│            │            callback strip · ETW corrupt · filter unload    │
│            └─ artifact set: host-triage · disk · memory · network ·     │
│                         timeline · persistence-audit                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Compilation Pipeline

JOCKEY uses a **two-tier IR system** built on top of LLVM:

```
.jky source
  │
  ▼
jocky-frontend (C++: Flex lexer → parser → AST → semantic analysis)
  │
  ▼
JOCKY IR (high-level, domain-specific)
  │  Opcodes: IR_COLLECT, IR_INJECT, IR_BLIND, IR_PERSIST, IR_BEACON
  │  Each opcode carries: Effect class, MinPriv level, Platform target
  │  The effect/privilege typechecker runs HERE — rejects invalid programs
  │
  ▼
JOCKY IR → LLVM IR lowering pass (C++ via LLVM API)
  │  Platform-specific lowering: Windows vs Linux code paths selected here
  │
  ▼
LLVM IR (standard)
  │  OLLVM-style obfuscation passes (C++ LLVM plugins, seeded per build):
  │  CFG flatten, MBA, opaque predicates, instruction substitution,
  │  dead code, block shuffle
  │
  ▼
LLVM Backend (x86-64 / AArch64 code generation)
  │
  ▼
Custom PE/ELF emitter (C++, replaces lld)
  │  Toolchain profile forging: Rich header, section layout, timestamps
  │  Import table: empty (all imports resolved at runtime via PEB walk)
  │  String section: encrypted blobs only
  │
  ▼
Build attestation: SHA256, TLSH, footprint report, degradation matrix
  │
  ▼
Unique polymorphic binary
```

**Why two IRs?**
- **JOCKY IR** exists for the effect/privilege type system — it understands forensic semantics ("this operation reads process memory and needs L1"). LLVM IR cannot express this.
- **LLVM IR** exists for code generation and obfuscation — leveraging LLVM's mature x86/ARM backends and pass infrastructure.

### Runtime Components

| Component | Responsibility |
|-----------|---------------|
| `jocky-frontend` | Lexer, parser, AST for the JOCKY grammar. No FFI surface exists at any layer. |
| **IR** | Platform-neutral opcodes (`IR_COLLECT`, `IR_INJECT`, `IR_BLIND`, `IR_PERSIST`, `IR_BEACON`, …), each carrying privilege preconditions and effect classes. |
| **Pass pipeline** | OLLVM-style semantics-preserving transforms, seeded per build. |
| **Syscall abstraction** | Windows: indirect stubs + runtime SSN resolution. Linux: direct `syscall` with stable numbers. |
| **PE/ELF emitters** | Toolchain-profile forging, section layout, per-build profile rotation. |
| `jrt-core` | The envelope enforcer: indirect call layer, no-W+X allocator, file-backed exec region provider, encrypted-literal accessor, synthetic-frame generator, owned TLS stack. |
| `jrt-escalate` | L0→L1 privilege escalation via operator-supplied C++ modules. Ships no built-in exploits. |
| `jrt-blind` | The PS 3B module — only component touching kernel state. Requires L1 → L2. |
| **Artifact engine** | Forensic deliverable framework: declares inputs, preconditions, effect class, outputs (JSON + hashes, chain-of-custody). |
| **C2 server + console** | Multi-implant tasking, result aggregation, RBAC, audit log. |
| **Transport** | Cloud storage API profiles over the owned TLS stack. |

---

## Technology Stack

| Component | Language / Tool | Rationale |
|-----------|----------------|-----------|
| Compiler frontend (lexer/parser/AST) | **C++** with **Flex** lexer generator | Direct integration with LLVM C++ API; Flex is mature and zero-dependency |
| JOCKY IR + typechecker | **C++** | Same binary as frontend; direct LLVM API access without bindings layer |
| JOCKY IR → LLVM IR lowering | **C++** via **LLVM C++ API** | Direct API usage — no wrapper overhead, full access to LLVM internals |
| Obfuscation passes (OLLVM-style) | **C++** LLVM pass plugins | LLVM pass infrastructure is C++; all OLLVM forks and literature are C++ |
| Code generation | **LLVM 18+** backend | Industrial-grade x86-64 / AArch64 codegen |
| Custom PE/ELF emitter | **C++** (replaces `lld`) | Full control over Rich header, section layout, import table, toolchain profiles |
| `jrt-core` runtime | **Bare C + inline x86-64 ASM** | Must be tiny, position-independent, no CRT, zero external dependencies |
| `jrt-blind` | **C** | Kernel interaction via `DeviceIoControl` / ioctl; precise struct layout control |
| `jrt-escalate` SDK | **C++** headers | Operator-extensible; C++ gives RAII + SDK ergonomics |
| Forensic scripts | **JOCKY DSL** (`.jky`) | The deliverables — written in our language |
| C2 server | **C++** single-binary executable | Embeds web console; no runtime dependencies on target |
| Console (web UI) | **Vanilla JS** (embedded in C2 binary) | Lightweight, no framework overhead, served directly by C2 server |
| Custom TLS 1.3 stack | **C++** | Full control over TLS handshake bytes for JA3/JA4 browser-profile mimicry |
| Result storage | **SQLite** (encrypted, per-mission) | Zero-dependency, portable, mission data isolated |
| Evidence signing | **Ed25519** | Cryptographic non-repudiation for chain-of-custody |
| CI/CD pipeline | **Python** + **Docker** | Build orchestration, seed generation, attestation |
| Invariant test suite | **Python** + Sysmon/Falco + YARA | Automated verification of all envelope guarantees |

> **All technical dependencies are open-source.** LLVM, Flex, SQLite, and the cryptographic primitives are mature, widely-deployed projects. No proprietary or foreign-controlled components are used anywhere in the stack.

---

## Installation

### Prerequisites

| Dependency | Version | Purpose |
|-----------|---------|---------|
| Clang/GCC | 13+ | Compiler frontend, runtime, PE/ELF emitter, C2 server |
| LLVM | 18+ | Code generation, IR lowering, obfuscation pass host |
| Flex | 2.6+ | Lexer generator for the JOCKY frontend |
| CMake | 3.20+ | Build system for compiler, passes, and C2 server |
| Python | 3.11+ | CI/CD pipeline, attestation scripts, test harness |
| Docker | 24+ | Reproducible builds (recommended) |
| NASM | 2.16+ | x86-64 assembly for syscall stubs |

### Build from Source

```bash
# Clone the repository
git clone https://github.com/your-org/jockey.git
cd jockey

# Build the compiler (jockyc) + PE/ELF emitter
mkdir -p compiler/build && cd compiler/build
cmake .. -DLLVM_DIR=$(llvm-config --cmakedir) -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
cd ../..

# Build the LLVM obfuscation passes
mkdir -p passes/build && cd passes/build
cmake .. -DLLVM_DIR=$(llvm-config --cmakedir) -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
cd ../..

# Build the runtime (jrt-core, jrt-blind, jrt-escalate)
make -C runtime all

# Build the C2 server (single binary, embeds web console)
mkdir -p c2-server/build && cd c2-server/build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
cd ../..

# Verify installation
./compiler/build/jockyc --version
```

### Docker (Recommended for CI)

```bash
# Build the polymorphic pipeline container
docker build -t jockey-pipeline:latest -f docker/Dockerfile.pipeline .

# Run a polymorphic build
docker run --rm \
  -v $(pwd)/scripts:/workspace/scripts \
  -v $(pwd)/output:/workspace/output \
  jockey-pipeline:latest \
  jockyc build scripts/host_triage.jky \
    --target=windows \
    --seed=$(openssl rand -hex 16) \
    --profile=msvc-14.3 \
    --output=/workspace/output/
```

---

## Quick Start

### 1. Write a forensic script

```jocky
// host_triage.jky — Collect host forensic data
artifact host_triage {
  requires L0
  emits   processes, services, drivers, scheduled_tasks, autoruns
}

collect proc_meta
collect service_enum
collect driver_list
collect scheduled_tasks
collect autoruns

// Pipeline: filter, build timeline, upload results
collect proc_meta | filter(parent == "cmd.exe") | timeline | upload
```

### 2. Compile it

```bash
# Windows target — produces a unique polymorphic PE
jockyc build host_triage.jky --target=windows --seed=$(openssl rand -hex 16)

# Linux target — same source, same output semantics, different binary
jockyc build host_triage.jky --target=linux --seed=$(openssl rand -hex 16)
```

### 3. Review the build attestation

```bash
jockyc attest output/host_triage.exe
# Output:
#   SHA256:       a3f7c8... (unique per build)
#   TLSH:         T1A5B3... (unique per build)
#   Entry point:  0x14002C180 (varies)
#   Import table: EMPTY (runtime PEB-walk resolution)
#   Sections:     .text entropy 6.21, .rdata entropy 5.89
#   Invariants:   1-9 PASS
#   Privilege:    L0 (all primitives within unprivileged envelope)
```

### 4. Deploy and task via the console

```bash
# Start the C2 server
./jockey-c2 serve --listen 0.0.0.0:8443 --tls-cert cert.pem --tls-key key.pem

# Open the console at https://localhost:8443
# → Register agents → Create mission → Assign tasks → View results
```

---

## Language Reference

### Grammar & Syntax

JOCKEY is a **domain-specific language (DSL)**, not a general-purpose language. Every construct lowers to an auditable IR opcode.

```jocky
// Artifacts are the unit of tasking
artifact host_triage {
  requires L0
  emits   processes, services, drivers, scheduled_tasks, autoruns
}

// Verbs (stdlib, effect-typed, privilege-annotated)
collect  MFT("C:")                                        // L1 — VSS snapshot path
collect  evtlog("Security")                               // L1
collect  proc_meta                                        // L0 — bulk query lowering
inject   (pid, PAYLOAD, mode: SECTION_MAP | APC)          // L0 same-user / L1 cross-user
blind    (mode: BYOVD, profile: AUTO)                     // L2 — PS 3B
persist  (method: RUN_KEY | SERVICE | CRON | UNIT)        // L0 HKCU/cron / L1 HKLM/system
beacon   (profile: CDN_FRONT, jitter: 0.3)                // L0
exec_trusted("certutil", args)                            // LOL proxy lowering

// Pipeline syntax
collect proc_meta | filter(parent == "cmd.exe") | timeline | upload
```

### Effect System

Every function is annotated `Effect[Access, Object, Privilege]`. The typechecker rejects any lowering outside the allowset — the compiler-level guarantee that the binary cannot exceed the declared envelope.

**No verbs exist for:** raw syscalls, FFI, inline assembly, arbitrary library loading, or disabling sensors outside `blind()`. Evasion "cleverness" is *not* script-authorable — that is the point.

### Privilege Levels

| Level | Name | Access |
|-------|------|--------|
| `L0` | Unprivileged | Runtime default. §2.1 envelope + unprivileged lowerings |
| `L1` | Admin/Root | MFT, event logs, raw disk, cross-user injection, VSS |
| `L2` | Kernel | `blind()` only — BYOVD / kernel R/W. Requires L1 as precondition |

### Pipeline Syntax

Pipelines compose operations using the `|` operator:

```jocky
collect proc_meta | filter(parent == "svchost.exe") | timeline | upload
collect MFT("C:") | filter(extension == ".exe") | hash_all | ioc_check(ioc_list) | upload
collect network_connections | beacon_detect(threshold: 0.85) | alert | upload
```

---

## Forensic Scripts

### Standard Library Scripts

JOCKEY ships with 15 pre-built forensic scripts. Each is a `.jky` file compiled through the full polymorphic pipeline.

| # | Script | Description | MinPriv | Platform |
|---|--------|-------------|---------|----------|
| 1 | `host_triage.jky` | Process tree with full command lines, parent-child relationships, loaded DLLs, open handles, thread counts, token privileges | L0 | Both |
| 2 | `service_enum.jky` | All installed services: binary paths, start types, account names, signed/unsigned status | L0 | Both |
| 3 | `persistence_scan.jky` | Run/RunOnce keys, Startup folder, scheduled tasks, WMI event subscriptions, LSA providers, IFEO debuggers, boot execute entries, cron/systemd/units | L0/L1 | Both |
| 4 | `autoruns.jky` | Comprehensive autostart enumeration: ASEPs, shell extensions, print monitors, Winsock providers, browser extensions | L0/L1 | Windows |
| 5 | `disk_forensics.jky` | MFT parsing, USN journal, `$LogFile`, prefetch, shimcache/amcache, SRUM database | L1 | Windows |
| 6 | `evtlog_parse.jky` | Security (4624/4625/4688/4697/4698/7045), System, Sysmon, PowerShell, TaskScheduler event logs | L1 | Windows |
| 7 | `registry_forensics.jky` | Offline hive parsing: SAM, SYSTEM, SOFTWARE, NTUSER.DAT, UsrClass.dat — accounts, network profiles, MRU, shellbags, UserAssist | L1 | Windows |
| 8 | `memory_scan.jky` | Consented memory dump via signed driver + in-memory analysis: strings, handles, sockets, YARA, injected thread detection | L1 | Both |
| 9 | `network_connections.jky` | TCP/UDP sockets mapped to PIDs, DNS cache, ARP, routing, interface configs | L0 | Both |
| 10 | `network_capture.jky` | Packet capture on specified interface, connection summary, protocol stats, DNS reconstruction | L1 | Both |
| 11 | `lateral_scan.jky` | Detect lateral movement: remote SMB/RDP/WinRM sessions, PsExec artifacts, DCOM, SSH | L1 | Both |
| 12 | `beacon_detect.jky` | Analyze outbound connections for beaconing patterns: periodic callbacks, jitter analysis, known C2 sleep patterns | L0 | Both |
| 13 | `timeline_build.jky` | Super-timeline: merge all artifact timestamps into unified chronological view + SHA256 hashes per entry for chain-of-custody | L0 | Both |
| 14 | `ioc_sweep.jky` | Sweep artifacts against IOC lists (file hashes, IPs, domains, YARA rules, registry paths) | L0 | Both |
| 15 | `rootkit_detect.jky` | Differential detection: API-level vs raw kernel-structure enumeration — discrepancies indicate hiding | L2 | Both |

### Script Details

#### Network Forensics (Three-Tier Model)

| Tier | Data Collected | Privilege | Windows Method | Linux Method |
|------|---------------|-----------|---------------|-------------|
| **Tier 1: Connection state** | Active TCP/UDP sockets mapped to PIDs, listening ports, DNS cache, ARP, routing | L0 | `NtQuerySystemInformation` via direct syscall | `/proc/net/tcp`, `netlink` sockets |
| **Tier 2: Flow capture** | Packet-level capture, protocol identification, DNS query reconstruction | L1 | Raw socket `SIO_RCVALL` or ETW NDIS provider | `AF_PACKET` socket or eBPF XDP |
| **Tier 3: Deep analysis** | Full packet reassembly, TLS cert extraction, lateral movement indicators, beaconing detection | L1 | Tier 2 + offline protocol parsing | Same + eBPF protocol dissector |

---

## Privilege Model

### Privilege Levels (L0 / L1 / L2)

```
L0 unprivileged  ── runtime default. Evasion envelope + unprivileged lowerings.
L1 admin/root    ── via one of two paths:
                    (a) operator-granted (installer, service account, sudoers), OR
                    (b) jrt-escalate: operator-supplied C++ LPE module.
L2 kernel        ── jrt-blind only, via BYOVD (Win) or module/BPF control (Linux).
                    Requires L1 as precondition.
```

- **No built-in exploits.** The framework provides a standardized escalation interface — operators supply their own C++ exploit modules.
- **Two paths to L1:** (a) operator pre-installs with admin access, or (b) the agent starts at L0 and `jrt-escalate` runs an operator-supplied module.
- Every primitive carries `MinPriv: L0|L1|L2` and a `Degraded:` behavior (skip + report / partial-data / substitute unprivileged form).
- The agent **probes and reports** its environment at startup (admin? HVCI? EDR drivers? secure boot? Linux lockdown? module-sig? BPF LSM?).

### Privilege Escalation Interface (`jrt-escalate`)

Operators implement the `IEscalationModule` C++ interface:

```cpp
class IEscalationModule {
public:
    virtual EscalationModuleInfo info() = 0;

    // Phase 1: Non-destructive probe — "Can this exploit work on this host?"
    virtual bool probe(const HostEnvironment& env) = 0;

    // Phase 2: Execute the escalation — returns L1 handle/token or error
    virtual EscalationResult escalate() = 0;

    // Phase 3: Best-effort cleanup of escalation artifacts
    virtual void cleanup() = 0;

    virtual ~IEscalationModule() = default;
};
```

**Runtime sequence:**

```
L0 ──jrt-escalate──→ L1 ──jrt-blind (BYOVD)──→ L2
         ↑                       ↑
   operator-supplied       operator-approved
   C++ exploit module      blind() invocation
```

Modules are compiled through the JOCKEY build pipeline and receive the same obfuscation treatment as all other code. They are **not** hot-loadable — adding/updating modules requires a new build.

---

## Evasion Envelope

### Language-Owned Guarantees (FULL)

These are guaranteed for every program compiled by JOCKEY:

| # | Check Neutralized | Owning Mechanism |
|---|-------------------|-----------------|
| S1 | Byte-pattern signatures | Custom emitter + per-build polymorphism + instruction substitution |
| S2 | Hash matching | Per-build seed → unique SHA256 every build |
| S3 | Fuzzy hashing (ssdeep/TLSH) | Structural diversity: runtime polymorphized; alternative implementations rotated |
| S4 | Import table analysis | Fully dynamic import resolution (PEB-walk hash lookup); no static IAT |
| S5 | Import hash (imphash) | Auto-solved by S4 (degenerate imphash) |
| S6 | String analysis | All literals encrypted; per-build key; decrypt at point of use; stack zeroed |
| S7 | Entropy analysis | No whole-binary packing; per-section entropy balanced (~6.0–6.5 `.text`) |
| S8 | PE/ELF structure anomalies | Emitter forges plausible toolchain profiles (Rich header, linker version, CFG) |
| B1 | User-mode API hooking | Indirect syscalls: runtime SSN resolution (Halo's/Hell's/Tartarus Gate) |
| B4 | Process-creation telemetry | **Zero-incidental-child invariant**: compiler never spawns a process on its own |
| B6 | RWX anomalies | **No-W+X invariant**: allocate RW → write → flip RX; prefer `MEM_MAPPED` |
| B7 | Unbacked memory execution | File-backed execution only: module stomping, ghosting, herpaderping, doppelgänging |
| B8 | Thread start-address validation | No new threads where avoidable; otherwise start inside a legit module |
| B9 | Stack-spoofing detection | Compiler-inserted synthetic frames from signed modules |
| B11 | AMSI | Inapplicable: native code, no script engine hosted |
| N2 | TLS fingerprinting (JA3/JA4) | Owned TLS stack; ClientHello mimics rotating browser profiles |

### Descoped Checks (PARTIAL — Accepted Residues)

No dedicated evasion modules exist for these. The semantic footprint is **accepted and documented, not fought:**

- API call sequence kernel n-grams (B2)
- API call frequency (B3)
- Injection-detection heuristics (B5)
- ETW user-mode patch (B10)
- Minifilter telemetry (B12)
- Registry monitoring (B13)
- WFP / connection monitoring (B14)
- DNS monitoring (B15)
- Named-pipe / IPC monitoring (B16)
- WMI monitoring (B17)
- COM instantiation (B19)
- Kernel notify/callback arrays outside `blind()` (K1–K6)
- Network DPI, volume, protocol anomaly, tunnel detection (N1, N3–N5)

---

## Runtime Technique Matrix

### Execution Substrate (Multi-Vector In-Memory)

| Vector | Windows | Linux | Selected When |
|--------|---------|-------|---------------|
| File-backed stomp | Full-section replacement in mapped signed module | `memfd_create` + `fexecve` | Default |
| Ghosted image | Delete-pending file → image section | — | COW risk unacceptable |
| Herpaderped image | Section from payload, file rewritten benign | — | Target profile allows |
| Transacted (doppelgänging) | TxF section + rollback | — | NTFS available |
| Threadless start | APC on alertable thread; thread-context hijack | — | No new thread desired |
| Sleep discipline | Ekko/FOLIAGE: encrypt + RW during idle, RX while executing | `mprotect` cycle | All long-resident code |

All vectors enforce: **no page is ever W+X; executable memory is always file-backed.**

### Sensor Blinding — `blind()` Verb

> **Requires L2 privilege. Operator-approved, never automatic.**

**Windows (BYOVD):**
1. Pre-flight: query driver blocklist, cross-reference agent's driver set, report viable/blocked to C2
2. If viable: BYOVD loader → kernel R/W → zero `PspCreate*NotifyRoutine` / `ObCallback` entries → corrupt EDR `_WMI_LOGGER_CONTEXT` → unload EDR minifilter
3. If blocked (common on updated Win11 + HVCI): report degraded mode, operate with §2.1 envelope only

**Linux:**

| Security Config | Blinding Approach | Limitations |
|----------------|-------------------|-------------|
| Baseline (no hardening) | `auditctl -D` + stop auditd + kill monitors | Service restart re-enables |
| eBPF monitors (Falco, Tetragon) | Detach BPF programs via `bpf(BPF_LINK_DETACH)` | Requires `CAP_BPF` + `CAP_TRACING` |
| LKM-based EDR | `rmmod` monitoring module | Fails if `module.sig_enforce=1` |
| SELinux enforcing | Cannot bypass; `setenforce 0` if capable | Full bypass out of scope |
| Lockdown LSM | **Cannot bypass.** Degraded mode. | Hard limit |
| Immutable audit rules (`-e 2`) | **Cannot modify.** Degraded mode. | Hard limit |

---

## Management Console

### Console Features

```
┌─────────────────────────────────────────────────────────────────┐
│  CONSOLE (Web Application)                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Dashboard    │  │ Mission Mgr  │  │ Forensic Report Viewer │ │
│  │ • Agent map  │  │ • Create     │  │ • Timeline view        │ │
│  │ • Status     │  │ • Task queue │  │ • Artifact browser     │ │
│  │ • Alerts     │  │ • Scheduling │  │ • IOC search           │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
│                                                                   │
│  API Server (REST + WebSocket)                                   │
│  • Auth: JWT + RBAC (operator / analyst / readonly)              │
│  • WebSocket: real-time agent status + live forensic feed        │
│  • REST: mission CRUD, task dispatch, report generation          │
│                                                                   │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────────┐ │
│  │ Task Queue   │  │ Result Store   │  │ Audit Logger         │ │
│  │ (priority Q) │  │ (encrypted     │  │ (append-only,        │ │
│  │              │  │  SQLite/mission)│  │  signed per entry)   │ │
│  └──────────────┘  └────────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Console frontend | Vanilla JS (embedded in server binary) | Lightweight, no framework overhead, zero build dependencies |
| API server | C++ single-binary executable | Cross-platform, no runtime deps, embeds web UI |
| Result storage | Encrypted SQLite (per-mission) | Zero-dependency, portable, isolated |
| Authentication | JWT + RBAC | Operator (full) / Analyst (read + limited task) / Readonly |
| Audit log | Append-only JSON Lines, signed per entry | Tamper-evident; every action recorded |

**Agent lifecycle:** Registration → Tasking (beacon → receive → execute) → Result Collection (encrypted signed JSON → C2 verifies → stores) → Decommission (cleanup → memory wipe → final confirmation).

### Transport Profiles

| Profile | Cloud Service | Traffic Pattern | Detection Difficulty |
|---------|--------------|----------------|---------------------|
| `gdrive` | Google Drive API | HTTPS to `www.googleapis.com/upload/drive/v3` | Identical to Google Drive desktop client |
| `azure-blob` | Azure Blob Storage REST API | HTTPS to `<account>.blob.core.windows.net` | Identical to Azure SDK file upload |
| `s3` | AWS S3 REST API | HTTPS to `<bucket>.s3.amazonaws.com` | Identical to standard S3 client |
| `gcs` | Google Cloud Storage JSON API | HTTPS to `storage.googleapis.com` | Identical to GCS client library |

The **owned TLS stack** supplies JA3/JA4 browser mimicry regardless of profile. Jitter and connection reuse are configurable per deployment.

### Evidence Integrity & Chain-of-Custody

#### Legal Compliance

JOCKEY's evidence model complies with:
- **Bharatiya Sakshya Adhiniyam, 2023 — Section 63**: Admissibility of electronic records
- **NIST SP 800-86**: Guide to Integrating Forensic Techniques into Incident Response
- **RFC 3227**: Guidelines for Evidence Collection and Archiving

#### Per-Artifact Integrity Fields

| Field | Purpose | BSA 2023 §63 Requirement |
|-------|---------|--------------------------|
| `artifact_id` | Unique identifier | Identifying the electronic record |
| `collection_timestamp` | UTC timestamp (NTP-validated) | When it was produced |
| `machine_fingerprint` | Hardware/OS fingerprint of target | Device identification |
| `agent_id` + `jocky_build_hash` | Agent and binary identity | Manner of production |
| `data_hash` (SHA-256) | Integrity proof | Faithful reproduction |
| `collector_signature` (Ed25519) | Cryptographic non-repudiation | Certificate of authenticity |
| `parent_hash` | Link to previous artifact in session chain | Tamper detection |

#### Hash Chain (Merkle-style)

```
Artifact #1          Artifact #2          Artifact #3
┌──────────┐        ┌──────────┐        ┌──────────┐
│ data     │        │ data     │        │ data     │
│ hash: A1 │◄───────│parent: A1│◄───────│parent: A2│
│          │        │ hash: A2 │        │ hash: A3 │
│ sig: ... │        │ sig: ... │        │ sig: ... │
└──────────┘        └──────────┘        └──────────┘
```

#### Export Formats

| Format | Compatible Tools | When Used |
|--------|-----------------|-----------|
| JSON (native) | SIEM (Splunk, Elastic), custom analysis | Default |
| CSV/TSV | Excel, pandas, manual review | On-demand export |
| STIX 2.1 | MISP, OpenCTI, threat intelligence platforms | IOC sharing |
| Timeline (bodyfile) | Sleuth Kit `mactime`, plaso, log2timeline | Timeline analysis |

---

## Testable Invariants

Every build is verified against these invariants:

| # | Invariant | Test Method |
|---|-----------|-------------|
| 1 | No static import directory; imphash degenerate | Static analysis |
| 2 | No plaintext literal in any section; entropy per section within normal toolchain range | Static analysis + entropy measurement |
| 3 | SHA256, TLSH, and entry point differ across N consecutive builds; CFG shape differs | N-build comparison |
| 4 | No page is both writable and executable at any point during execution | Dynamic test (`VirtualQuery` / `/proc/self/maps`) |
| 5 | Every executable region resolves to a file-backed mapping | Dynamic test |
| 6 | Zero process/thread/image-load events attributable to lowering | Sysmon/Falco dynamic test |
| 7 | Every sensitive syscall carries a signed-module call stack | Stack-walk test |
| 8 | No AMSI provider is ever instantiated in the process | Provider-list test |
| 9 | Runtime has no user-mode hook dependency | Differential execution test (hooks on ntdll) |
| 10 | Primitive-footprint report per build: enumerated syscalls, events, privileges | Build attestation |

---

## Verification & Demo Plan

| # | Test | Description |
|---|------|-------------|
| 1 | **Static** | N-build VirusTotal sweep → 0 detections; YARA with family + generic packer rules → 0 hits; fuzzy-hash spread documented |
| 2 | **Windows dynamic** | Windows 11 + Defender + Sysmon: run maximal artifact set → 0 lowering-attributable Sysmon events; then `blind()` (L2) → EDR callback counts go to zero |
| 3 | **Linux dynamic** | Ubuntu + Falco + auditd: `memfd` execution, artifact set → 0 lowering events; `blind()` root path demo |
| 4 | **Cross-platform** | Same `.jky` compiled `--target=windows` and `--target=linux`, identical JSON output semantics |
| 5 | **Management plane** | Console tasking 5+ concurrent implants over cloud API transport |
| 6 | **Honesty annex** | One page of explicit non-claims (§11) — included in the deliverable |

---

## Honest Limits

> These limitations are **stated, not hidden**. Intellectual honesty is a design principle.

- **Bootstrap:** Privilege is either operator-supplied (pre-installed admin) or obtained via `jrt-escalate` using operator-provided C++ LPE modules. The framework ships **no built-in exploits**.
- **Escalation is inherently noisy:** Operator-supplied LPE modules exploit real OS/service vulnerabilities. The evasion envelope reduces the binary's footprint but cannot hide the semantic signal of the exploit itself.
- **Kernel blinding is target-conditional:** HVCI / secure boot / lockdown degrade it; blocklisted drivers unavailable; driver-load event itself is telemetry.
- **BYOVD blocklist:** Microsoft's Vulnerable Driver Blocklist blocks virtually all publicly known BYOVD drivers. On updated Windows 11 with HVCI + blocklist enabled, `jrt-blind` reports degraded mode.
- **PARTIAL residues:** Registry/file/network/DNS/IPC/WMI/COM semantic footprints are visible to the corresponding sensors by design decision.
- **Cross-user memory, raw disk, system logs** are L1/L2 capabilities with no equal unprivileged form.
- **CET/shadow-stack** hosts defeat return-address spoofing where enforced.
- **Adaptive detectors:** Economic guarantee (P5), not a permanence guarantee.
- **Cloud/console plane:** Compromised server = compromised fleet; mitigated by canary tasks, result anomaly checks, per-mission tokens — not eliminated.

---

## Development Milestones

| Phase | Deliverable | Exit Test |
|-------|------------|-----------|
| **P1** | Frontend + IR + effect/privilege typechecker + PE/ELF emitters | Artifacts compile and run on both OSes |
| **P2** | Envelope: indirect syscalls, no-W+X allocator, file-backed exec, literal encryption, synthetic frames | Invariants 1–9 pass dynamically |
| **P3** | Polymorphic CI pipeline + toolchain-profile rotation | Invariant 3 across 20 builds; VT sweep 0 |
| **P4** | Stdlib primitives + privilege contract + degradation matrix | Footprint report per primitive |
| **P4.1** | `jrt-escalate` SDK + module interface + build-pipeline integration | Dummy module compiles + links; probe/escalate/cleanup contract enforced |
| **P5** | Artifact framework + console + C2 transport | Management plane demo |
| **P6** | `jrt-blind` (BYOVD + Linux equivalents) with HVCI profiling | Blind demo + degradation matrix |
| **P7** | Verification battery + honesty annex + evaluator docs | Full verification complete |

---

## Project Structure

```
jockey/
├── compiler/                    # C++ — JOCKY compiler (jockyc)
│   ├── src/
│   │   ├── lexer/               # Lexer (Flex-generated)
│   │   ├── parser/              # Parser
│   │   ├── ast/                 # AST definitions
│   │   ├── ir/                  # JOCKY IR opcodes + effect/privilege types
│   │   ├── typechecker/         # Effect/privilege typechecker
│   │   ├── lowering/            # JOCKY IR → LLVM IR (via LLVM C++ API)
│   │   └── emitter/             # Custom PE/ELF emitter (replaces lld)
│   └── CMakeLists.txt
├── passes/                      # C++ — LLVM obfuscation pass plugins
│   ├── cfg_flatten/
│   ├── mba/
│   ├── opaque_predicates/
│   ├── instruction_sub/
│   ├── dead_code/
│   ├── block_shuffle/
│   └── CMakeLists.txt
├── runtime/                     # Bare C + inline ASM — Runtime components
│   ├── jrt-core/                # Envelope enforcer
│   │   ├── syscall/             # Indirect syscall stubs (inline ASM)
│   │   ├── allocator/           # No-W+X memory allocator
│   │   ├── exec/                # File-backed execution substrate
│   │   ├── crypto/              # String decryption, stack zeroing
│   │   ├── tls/                 # Custom TLS 1.3 stack (JA3 mimicry)
│   │   └── spoof/               # Synthetic stack frames
│   ├── jrt-escalate/            # Privilege escalation interface
│   │   ├── include/             # C++ SDK headers (IEscalationModule)
│   │   └── engine/              # Module loader + execution engine
│   ├── jrt-blind/               # Sensor blinding (BYOVD + Linux)
│   │   ├── byovd/               # Driver loader, kernel R/W
│   │   ├── callbacks/           # Callback array stripping
│   │   └── linux/               # eBPF/auditd/LKM blinding
│   └── Makefile
├── escalation/                  # Operator-supplied C++ LPE modules
│   └── example_module.cpp       # Template / example
├── scripts/                     # JOCKY DSL — Forensic scripts (.jky)
│   ├── host_triage.jky
│   ├── service_enum.jky
│   ├── persistence_scan.jky
│   ├── disk_forensics.jky
│   ├── evtlog_parse.jky
│   ├── registry_forensics.jky
│   ├── memory_scan.jky
│   ├── network_connections.jky
│   ├── network_capture.jky
│   ├── lateral_scan.jky
│   ├── beacon_detect.jky
│   ├── timeline_build.jky
│   ├── ioc_sweep.jky
│   ├── rootkit_detect.jky
│   └── autoruns.jky
├── c2-server/                   # C++ — C2 server (single binary, embeds console)
│   ├── src/
│   │   ├── server/              # HTTP/WebSocket server + TLS
│   │   ├── tasking/             # Task queue + dispatch
│   │   ├── transport/           # Cloud API profiles (GDrive, S3, Azure, GCS)
│   │   ├── storage/             # Encrypted SQLite per-mission
│   │   ├── auth/                # JWT + RBAC
│   │   └── audit/               # Append-only signed audit log
│   ├── web/                     # Vanilla JS — embedded web console
│   │   ├── index.html
│   │   ├── dashboard.js
│   │   ├── mission.js
│   │   ├── forensic-viewer.js
│   │   └── style.css
│   └── CMakeLists.txt
├── pipeline/                    # Python — CI/CD polymorphic pipeline
│   ├── build.py                 # Orchestrator
│   ├── attest.py                # Build attestation + footprint report
│   └── vt_check.py              # VirusTotal sweep
├── tests/                       # Python — Invariant test suite
│   ├── test_invariants.py
│   ├── test_polymorphism.py
│   ├── sysmon_harness.py
│   └── yara_rules/
├── docker/
│   ├── Dockerfile.pipeline
│   └── docker-compose.yml
├── docs/
│   ├── ARCHITECTURE.md
│   ├── LANGUAGE_REFERENCE.md
│   ├── PRIVILEGE_MODEL.md
│   ├── ESCALATION_SDK.md
│   └── HONEST_LIMITS.md
└── README.md
```

---

## Contributing

JOCKEY is a classified project developed for **NTRO (National Technical Research Organisation)** under SIH Problem Statement 26148. Contribution is restricted to authorized team members.

### Development Workflow

1. All code changes go through the polymorphic CI pipeline
2. Every PR must pass the invariant test suite (§9)
3. Build attestation is generated automatically for every merge to `main`
4. Escalation modules require separate security review

---

## Legal & Compliance

- **Organization:** National Technical Research Organisation (NTRO)
- **Problem Statement:** SIH PS 26148 — "Creation of scripts/functions with new programming language to commence Computer & Network forensic analysis without triggering security solutions"
- **Category:** Software — Blockchain & Cybersecurity
- **Evidence admissibility:** Compliant with Bharatiya Sakshya Adhiniyam (BSA) 2023, Section 63
- **Forensic standards:** NIST SP 800-86, RFC 3227

---

## License

Proprietary. All rights reserved. This software is developed exclusively for NTRO under SIH PS 26148. Unauthorized distribution, modification, or use is prohibited.
