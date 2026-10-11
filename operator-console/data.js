/* ============================================================
   Jocky — Central Management Console
   data.js — synthetic mock data only. No backend. No live agents.
   All identifiers, hosts, hashes and events are fabricated.
   ============================================================ */
"use strict";

const DATA = {};

DATA.meta = {
  version: "Jocky 0.7.2-p5",
  console: "Central Management Console",
  api: "api server v0.7.2 · REST + WebSocket",
  now: "2026-09-29",
};

/* ---------------- RBAC (§8.2 auth: JWT + RBAC) ---------------- */
DATA.roles = {
  operator:  { label: "Operator",  blurb: "Full control: mission CRUD, task dispatch at any privilege, escalation & blind() approval, decommission, user & token management, audit." },
  analyst:   { label: "Analyst",   blurb: "Read everything; may dispatch L0-only tasks and export artifacts. Cannot approve escalation, blinding, or decommission." },
  readonly:  { label: "Readonly",  blurb: "Read-only observer: dashboards, agents, reports and audit log. No mutations of any kind." },
};

DATA.users = [
  { id:"u-01", name:"R. Menon",    handle:"r.menon",    role:"operator",  last:"2026-09-29 08:02Z", jwtExp:"7h 12m", scope:"all-missions" },
  { id:"u-02", name:"A. Kulkarni", handle:"a.kulkarni", role:"operator",  last:"2026-09-29 06:47Z", jwtExp:"9h 03m", scope:"all-missions" },
  { id:"u-03", name:"S. Iyer",     handle:"s.iyer",     role:"analyst",   last:"2026-09-29 09:20Z", jwtExp:"5h 40m", scope:"OP-TIMELINE-DELTA" },
  { id:"u-04", name:"D. Bose",     handle:"d.bose",     role:"readonly",  last:"2026-09-28 17:31Z", jwtExp:"expired", scope:"read-only" },
  { id:"u-05", name:"svc-token-rotate", handle:"svc-rotate", role:"operator", last:"2026-09-29 09:30Z", jwtExp:"58m", scope:"token rotation only", svc:true },
];

DATA.roleMatrix = [
  ["View dashboards & reports",        true,  true,  true ],
  ["Create / edit / close missions",   true,  false, false],
  ["Dispatch L0 tasks",                true,  true,  false],
  ["Dispatch L1 / L2 tasks",           true,  false, false],
  ["Approve jrt-escalate run",         true,  false, false],
  ["Approve blind() invocation",       true,  false, false],
  ["Decommission agent",               true,  false, false],
  ["Export artifacts / reports",       true,  true,  false],
  ["Sign §63 compliance certificate",  true,  false, false],
  ["View audit log",                   true,  true,  true ],
  ["Manage users, roles & tokens",     true,  false, false],
];

/* ---------------- Agents (target plane, §3) ---------------- */
/* env probe report mirrors §5: "probes and reports its privilege and environment at startup" */
DATA.agents = [
  {
    id:"A-7F3C", host:"WIN11-WS-04", ip:"10.24.6.41", lon:77.2, lat:28.6,
    platform:"windows", os:"Windows 11 Pro 22631", arch:"x86-64",
    priv:"L0", privSource:"runtime default", status:"online", lastSeen:"12s ago",
    lifecycle:"tasking", transport:"gdrive", tlsProfile:"Chrome 120 / Win11",
    buildHash:"9f3a…c41e", fingerprint:"PFN-4471::WP-B-77AE", beaconJitter:0.3,
    artifacts:412, tasksDone:57, mission:"M-2609",
    env:{
      hvci:true, secureBoot:true, defender:"active (real-time + cloud)",
      edr:["CrowdStrike Falcon (kernel + user)"], blocklist:"enforced",
      uac:false, lockdown:"—", moduleSig:"—", bpfLsm:"—", auditRules:"—",
      mac:"—", monitors:["Sysmon 15.0","Falco (offline feed)"], auditd:"—",
      admin:false, devDrive:false,
    },
    degrade:["blind(): degraded — HVCI + enforced blocklist (§11)"],
    notes:"Freshly registered workstation. Escalation strategy: 2 modules, fallback ABORT.",
  },
  {
    id:"A-9D21", host:"WIN11-LAB-01", ip:"10.24.6.12", lon:72.9, lat:19.1,
    platform:"windows", os:"Windows 11 Pro 22000", arch:"x86-64",
    priv:"L1", privSource:"operator pre-installed (admin service account)", status:"online", lastSeen:"31s ago",
    lifecycle:"tasking", transport:"s3", tlsProfile:"Firefox 121 / Win",
    buildHash:"b81d…77f0", fingerprint:"PFN-2280::WP-A-31CD", beaconJitter:0.2,
    artifacts:1284, tasksDone:214, mission:"M-2609",
    env:{
      hvci:true, secureBoot:true, defender:"passive (lab)",
      edr:["SentinelOne Agent"], blocklist:"enforced",
      uac:true, lockdown:"—", moduleSig:"—", bpfLsm:"—", auditRules:"—",
      mac:"—", monitors:["Sysmon 15.0","EDR sensor — blinded 2 sessions"], auditd:"—",
      admin:true, devDrive:false,
    },
    degrade:["blind(): degraded — blocklist cross-reference blocked all known drivers"],
    notes:"Disk + registry forensics pipeline running on 6h schedule.",
  },
  {
    id:"A-4B8E", host:"UB2204-SRV-02", ip:"10.24.9.88", lon:78.5, lat:17.4,
    platform:"linux", os:"Ubuntu 22.04.4 LTS", arch:"x86-64",
    priv:"L1", privSource:"jrt-escalate · lin_pkexec_CVE_2021_4034 (log #E-4411)", status:"online", lastSeen:"48s ago",
    lifecycle:"tasking", transport:"azure-blob", tlsProfile:"Edge 120 / Ubuntu",
    buildHash:"22ac…b9d3", fingerprint:"PFN-9042::UL-B-5E11", beaconJitter:0.35,
    artifacts:877, tasksDone:132, mission:"M-2609",
    env:{
      hvci:"—", secureBoot:true, defender:"—",
      edr:["Tetragon (eBPF)"], blocklist:"—",
      uac:"—", lockdown:"none", moduleSig:"enforced (sig_enforce=1)", bpfLsm:"bpf (programs: 6)",
      mac:"AppArmor: 41 profiles loaded", monitors:["auditd","Tetragon"], auditd:"running · rules immutable (-e 2)",
      admin:true, devDrive:false,
    },
    degrade:["blind(): immutable audit rules (-e 2) — locked until reboot (§11)",
             "blind(): LKM unload fails — module.sig_enforce=1"],
    notes:"Escalated L0→L1 via operator-supplied module. Full disk + evtlog collection active.",
  },
  {
    id:"A-2C55", host:"UB2404-WS-11", ip:"10.24.9.17", lon:77.6, lat:13.0,
    platform:"linux", os:"Ubuntu 24.04 LTS", arch:"x86-64",
    priv:"L0", privSource:"runtime default", status:"online", lastSeen:"1m 06s ago",
    lifecycle:"tasking", transport:"gcs", tlsProfile:"Chrome 120 / Ubuntu",
    buildHash:"c70e…04aa", fingerprint:"PFN-5517::UL-A-92F4", beaconJitter:0.3,
    artifacts:96, tasksDone:11, mission:"M-2608",
    env:{
      hvci:"—", secureBoot:true, defender:"—",
      edr:["Falco (eBPF)"], blocklist:"—",
      uac:"—", lockdown:"none", moduleSig:"not enforced", bpfLsm:"bpf (programs: 3)",
      mac:"AppArmor: enforce mode", monitors:["auditd","Falco"], auditd:"running · rules mutable",
      admin:false, devDrive:false,
    },
    degrade:["cross-user memory / raw disk unavailable at L0 (§4)"],
    notes:"Network Tier-1 connection state only; Tier-2 requires L1 approval.",
  },
  {
    id:"A-6A93", host:"WIN10-GW-07", ip:"10.24.3.7", lon:8.7, lat:50.1,
    platform:"windows", os:"Windows 10 Pro 19042", arch:"x86-64",
    priv:"L0", privSource:"runtime default", status:"away", lastSeen:"6h 12m ago",
    lifecycle:"tasking", transport:"gdrive", tlsProfile:"Chrome 116 / Win10",
    buildHash:"9f3a…c41e", fingerprint:"PFN-3106::WP-C-08B2", beaconJitter:0.3,
    artifacts:23, tasksDone:9, mission:"M-2606",
    env:{
      hvci:false, secureBoot:false, defender:"active ( outdated signatures )",
      edr:["none detected"], blocklist:"disabled",
      uac:false, lockdown:"—", moduleSig:"—", bpfLsm:"—", auditRules:"—",
      mac:"—", monitors:["none detected"], auditd:"—",
      admin:false, devDrive:false,
    },
    degrade:[],
    notes:"Primary blind() viability trial target — HVCI off, blocklist disabled. Missed 3 beacons; transport retry scheduled.",
  },
  {
    id:"A-1E47", host:"UB2004-DMZ-03", ip:"10.24.4.33", lon:103.8, lat:1.35,
    platform:"linux", os:"Ubuntu 20.04.6 LTS", arch:"x86-64",
    priv:"L2", privSource:"jrt-blind · BYOVD/Linux path (log #E-4418)", status:"online", lastSeen:"22s ago",
    lifecycle:"tasking", transport:"s3", tlsProfile:"Safari 17 / Ubuntu",
    buildHash:"b81d…77f0", fingerprint:"PFN-7702::UL-D-1A9C", beaconJitter:0.25,
    artifacts:1580, tasksDone:301, mission:"M-2606",
    env:{
      hvci:"—", secureBoot:false, defender:"—",
      edr:["osquery (monitoring)", "local EDR agent — blinded"], blocklist:"—",
      uac:"—", lockdown:"none", moduleSig:"not enforced", bpfLsm:"bpf (programs: 0 after detach)",
      mac:"SELinux: permissive", monitors:["auditd (stopped)","Falco (detached)"], auditd:"stopped · 12 rules flushed",
      admin:true, devDrive:false,
    },
    degrade:[],
    notes:"blind() completed 2026-09-28 21:14Z. Baseline posture (no hardening) — full blinding succeeded.",
  },
  {
    id:"A-5D02", host:"WIN11-HV-02", ip:"10.24.6.90", lon:139.7, lat:35.7,
    platform:"windows", os:"Windows 11 Enterprise 22631", arch:"x86-64",
    priv:"L0", privSource:"runtime default", status:"offline", lastSeen:"26h ago",
    lifecycle:"decommissioned", transport:"—", tlsProfile:"—",
    buildHash:"3f91…e2a7", fingerprint:"PFN-6640::WP-B-42E9", beaconJitter:0,
    artifacts:640, tasksDone:88, mission:"M-2607",
    env:{
      hvci:true, secureBoot:true, defender:"active",
      edr:["Defender for Endpoint"], blocklist:"enforced",
      uac:true, lockdown:"—", moduleSig:"—", bpfLsm:"—", auditRules:"—",
      mac:"—", monitors:["Sysmon 15.0"], auditd:"—",
      admin:false, devDrive:false,
    },
    degrade:[],
    notes:"Decommissioned: cleanup task executed, memory footprint wiped, final confirmation received.",
  },
  {
    id:"A-3C19", host:"UB2204-HP-05", ip:"10.24.9.51", lon:-77.5, lat:39.0,
    platform:"linux", os:"Ubuntu 22.04 LTS", arch:"x86-64",
    priv:"L0", privSource:"runtime default", status:"online", lastSeen:"1m 40s ago",
    lifecycle:"tasking", transport:"gcs", tlsProfile:"Chrome 120 / Ubuntu",
    buildHash:"22ac…b9d3", fingerprint:"PFN-8819::UL-B-6D07", beaconJitter:0.4,
    artifacts:31, tasksDone:6, mission:"M-2609",
    env:{
      hvci:"—", secureBoot:true, defender:"—",
      edr:["none detected"], blocklist:"—",
      uac:"—", lockdown:"none", moduleSig:"not enforced", bpfLsm:"—",
      mac:"AppArmor: enforce mode", monitors:["auditd"], auditd:"running · rules mutable",
      admin:false, devDrive:false,
    },
    degrade:[],
    notes:"⚠ Result bundle failed anomaly check — canary task mismatch. Quarantined pending operator review (evidence-poisoning resistance, §8.2).",
    quarantined:true,
  },
];

/* ---------------- Missions (§8.2 Mission Manager) ---------------- */
DATA.missions = [
  {
    id:"M-2609", name:"OP-TIMELINE-DELTA", status:"active",
    objective:"Super-timeline reconstruction across 3 enterprise hosts; lateral-movement cross-reference.",
    agents:["A-7F3C","A-9D21","A-4B8E"],
    created:"2026-09-24 10:12Z", by:"r.menon",
    store:"mission_M-2609.enc.sqlite", storeEnc:"AES-256-GCM (SQLCipher)",
    token:{ profile:"gdrive", account:"jky-m2609-prod@jky-tokens.iam.gserviceaccount.com", expires:"+42h", perms:"storage.objects.create/read, auto-expiry" },
    canary:"every 10th task is a canary; anomaly check on all returned bundles",
    roe:"No persistence writes outside approved keys. blind() not authorized on this mission.",
    schedules:[
      { id:"S-01", script:"host_triage.jky",        every:"every 6h",      target:"all agents",  on:true  },
      { id:"S-02", script:"persistence_scan.jky",   every:"daily 02:00",   target:"all agents",  on:true  },
      { id:"S-03", script:"timeline_build.jky",     every:"every 12h",     target:"all agents",  on:true  },
      { id:"S-04", script:"lateral_scan.jky",       every:"daily 03:30",   target:"A-4B8E",      on:false },
    ],
  },
  {
    id:"M-2608", name:"OP-PERSIST-AUDIT", status:"active",
    objective:"Persistence audit sweep (Run keys, WMI subs, LSA providers, IFEO, boot entries; cron/systemd on Linux).",
    agents:["A-2C55"],
    created:"2026-09-21 14:40Z", by:"a.kulkarni",
    store:"mission_M-2608.enc.sqlite", storeEnc:"AES-256-GCM (SQLCipher)",
    token:{ profile:"s3", account:"arn:aws:sts::…:role/jky-m2608", expires:"+4h", perms:"s3:PutObject/GetObject, expiring token" },
    canary:"canary on first task of each beacon window",
    roe:"L0-only (HKCU / cron). HKLM & systemd-unit writes require L1 approval.",
    schedules:[
      { id:"S-05", script:"persistence_scan.jky", every:"every 4h", target:"A-2C55", on:true },
      { id:"S-06", script:"autoruns.jky",         every:"—",        target:"A-2C55", on:false },
    ],
  },
  {
    id:"M-2607", name:"OP-SHADOW-CLEAN", status:"complete",
    objective:"Decommission trial: cleanup task → memory-footprint wipe → final confirmation.",
    agents:["A-5D02"],
    created:"2026-09-12 09:00Z", by:"r.menon",
    store:"mission_M-2607.enc.sqlite (archived)", storeEnc:"AES-256-GCM",
    token:{ profile:"azure-blob", account:"jkm2607.blob.core.windows.net", expires:"expired", perms:"revoked on completion" },
    canary:"n/a",
    roe:"Decommission only.",
    schedules:[],
  },
  {
    id:"M-2606", name:"OP-BLIND-TRIAL", status:"active",
    objective:"blind() viability trial: BYOVD pre-flight on Windows, security-posture probe on Linux, degradation matrix capture.",
    agents:["A-6A93","A-1E47"],
    created:"2026-09-26 16:05Z", by:"a.kulkarni",
    store:"mission_M-2606.enc.sqlite", storeEnc:"AES-256-GCM (SQLCipher)",
    token:{ profile:"azure-blob", account:"jkm2606.blob.core.windows.net", expires:"+11d", perms:"full object R/W for mission window" },
    canary:"canary before and after every blind() invocation",
    roe:"blind() authorized on A-6A93 and A-1E47 only, per-invocation operator approval. Never by default (§6.2).",
    schedules:[],
  },
];

/* ---------------- Task queue (§8.2 in-process priority Q) ---------------- */
DATA.tasks = [
  { id:"T-9041", mission:"M-2609", agent:"A-7F3C", payload:"host_triage.jky",                  pri:"P1", minPriv:"L0", state:"executing",  since:"04:12", note:"" },
  { id:"T-9042", mission:"M-2609", agent:"A-9D21", payload:"disk_forensics.jky (MFT, USN)",    pri:"P1", minPriv:"L1", state:"executing",  since:"11:38", note:"" },
  { id:"T-9043", mission:"M-2609", agent:"A-4B8E", payload:"evtlog_parse.jky — wait, L1 ✓",    pri:"P2", minPriv:"L1", state:"queued",     since:"—",     note:"" },
  { id:"T-9044", mission:"M-2608", agent:"A-2C55", payload:"network_capture.jky (Tier 2)",     pri:"P2", minPriv:"L1", state:"blocked · approval", since:"—", note:"Requires L1 + operator approval" },
  { id:"T-9045", mission:"M-2609", agent:"A-3C19", payload:"canary: benign echo + fixed nonce", pri:"P0", minPriv:"L0", state:"queued",     since:"—",     note:"Canary — anomaly check pending" },
  { id:"T-9046", mission:"M-2606", agent:"A-6A93", payload:"blind(mode: BYOVD, profile: AUTO)", pri:"P0", minPriv:"L2", state:"blocked · approval", since:"—", note:"Preflight passed; awaiting operator decision" },
  { id:"T-9047", mission:"M-2609", agent:"A-9D21", payload:"collect evtlog(Security) | filter(4625) | upload", pri:"P2", minPriv:"L1", state:"queued", since:"—", note:"" },
  { id:"T-9038", mission:"M-2609", agent:"A-7F3C", payload:"ioc_sweep.jky (stix bundle #11)",  pri:"P1", minPriv:"L0", state:"complete",   since:"08:55", note:"result verified, chain OK" },
  { id:"T-9039", mission:"M-2606", agent:"A-1E47", payload:"rootkit_detect.jky",               pri:"P1", minPriv:"L2", state:"complete",   since:"07:20", note:"differential scan OK" },
  { id:"T-9040", mission:"M-2607", agent:"A-5D02", payload:"decommission: cleanup + wipe",     pri:"P0", minPriv:"L0", state:"complete",   since:"—",     note:"final confirmation received" },
];

/* ---------------- Script library (§8.1.2) ---------------- */
DATA.scripts = [
  { n:1,  file:"host_triage.jky",        desc:"Process tree with full command lines, parent-child relationships, loaded DLLs, open handles, thread counts, token privileges", priv:"L0", plat:"Both",  eff:"Access[Process]" },
  { n:2,  file:"service_enum.jky",       desc:"All installed services: binary paths, start types, account names, signed/unsigned status", priv:"L0", plat:"Both",  eff:"Access[Service]" },
  { n:3,  file:"persistence_scan.jky",   desc:"Run/RunOnce keys, Startup folder, scheduled tasks, WMI event subscriptions, LSA providers, IFEO debuggers, boot execute, cron/systemd/units", priv:"L0 (HKCU) / L1 (HKLM)", plat:"Both",  eff:"Access[Persist]" },
  { n:4,  file:"autoruns.jky",           desc:"Comprehensive autostart enumeration: ASEPs, shell extensions, print monitors, Winsock providers, browser extensions", priv:"L0/L1", plat:"Windows", eff:"Access[Persist]" },
  { n:5,  file:"disk_forensics.jky",     desc:"MFT parsing, USN journal, $LogFile, prefetch, shimcache/amcache, SRUM database", priv:"L1", plat:"Windows", eff:"Access[Disk]" },
  { n:6,  file:"evtlog_parse.jky",       desc:"Security (4624/4625/4688/4697/4698/7045), System, Sysmon, PowerShell, TaskScheduler event logs", priv:"L1", plat:"Windows", eff:"Access[Log]" },
  { n:7,  file:"registry_forensics.jky", desc:"Offline hive parsing: SAM, SYSTEM, SOFTWARE, NTUSER.DAT, UsrClass.dat — accounts, network profiles, MRU, shellbags, UserAssist", priv:"L1", plat:"Windows", eff:"Access[Registry]" },
  { n:8,  file:"memory_scan.jky",        desc:"Consented memory dump via signed driver + in-memory analysis: strings, handles, sockets, YARA, injected thread detection", priv:"L1", plat:"Both",  eff:"Access[Memory]" },
  { n:9,  file:"network_connections.jky",desc:"TCP/UDP sockets mapped to PIDs, DNS cache, ARP, routing, interface configs", priv:"L0", plat:"Both",  eff:"Access[Net]" },
  { n:10, file:"network_capture.jky",    desc:"Packet capture on specified interface, connection summary, protocol stats, DNS reconstruction", priv:"L1", plat:"Both",  eff:"Access[Net+]" },
  { n:11, file:"lateral_scan.jky",       desc:"Detect lateral movement: remote SMB/RDP/WinRM sessions, PsExec artifacts, DCOM, SSH. Cross-references auth logs", priv:"L1", plat:"Both",  eff:"Access[Net+Auth]" },
  { n:12, file:"beacon_detect.jky",      desc:"Analyze outbound connections for beaconing patterns: periodic callbacks, jitter analysis, known C2 sleep patterns", priv:"L0", plat:"Both",  eff:"Access[Net]" },
  { n:13, file:"timeline_build.jky",     desc:"Super-timeline: merge all artifact timestamps into unified chronological view + SHA256 per entry (chain-of-custody)", priv:"L0", plat:"Both",  eff:"Pure[Merge]" },
  { n:14, file:"ioc_sweep.jky",          desc:"Sweep artifacts against IOC lists (file hashes, IPs, domains, YARA rules, registry paths)", priv:"L0", plat:"Both",  eff:"Pure[Match]" },
  { n:15, file:"rootkit_detect.jky",     desc:"Differential detection: API-level vs raw kernel-structure enumeration — discrepancies indicate hiding", priv:"L2", plat:"Both",  eff:"Access[Kernel]" },
];

/* ---------------- Verb palette (§7 language sketch) ---------------- */
DATA.verbs = [
  { sig:"collect  MFT(\"C:\")",                  priv:"L1", note:"VSS snapshot path — privileged form mandatory (§4 not-equal list)" },
  { sig:"collect  evtlog(\"Security\")",         priv:"L1", note:"System event logs have no equal unprivileged form" },
  { sig:"collect  proc_meta",                    priv:"L0", note:"§4 unprivileged default: NtQuerySystemInformation bulk query" },
  { sig:"inject   (pid, PAYLOAD, mode: SECTION_MAP | APC)", priv:"L0 same-user / L1 cross-user", note:"Same-user equal → unprivileged default; cross-user needs L1/L2" },
  { sig:"blind    (mode: BYOVD, profile: AUTO)", priv:"L2", note:"PS 3B — single-shot, operator-approved, never by default" },
  { sig:"persist  (method: RUN_KEY | SERVICE | CRON | UNIT)", priv:"L0 HKCU/cron / L1 HKLM/system", note:"Persistence verbs use standard locations — writes are visible (B13 accepted)" },
  { sig:"beacon   (profile: CDN_FRONT, jitter: 0.3)", priv:"L0", note:"Owned TLS stack N2; traffic shaped, not hidden" },
  { sig:"exec_trusted(\"certutil\", args)",      priv:"L0", note:"LOL proxy lowering — leaves parent/child + cmdline anomalies" },
];

/* ---------------- §4 unprivileged-when-equal decision table ---------------- */
DATA.decisions = [
  ["Process metadata", "OpenProcess per PID + handle reads", "NtQuerySystemInformation bulk query", "Equal (names/PIDs/parents)", "Unprivileged default; cmdline needs handle/privileged ETW → L1 form when held"],
  ["Local system queries", "WMI (WmiPrvSE surrogate)", "Native syscalls", "Equal", "Unprivileged default"],
  ["Script/2nd-stage execution", "Disk drop + create", "memfd_create + execveat / ghosted section", "Equal", "Unprivileged default — also satisfies B7"],
  ["Same-user exec in another process", "Classic alloc/write/thread", "Section mapping + APC/thread-hijack", "Equal (same-user only)", "Unprivileged default; cross-user uses privileged form"],
  ["COM consumers", "Out-of-proc surrogate activation", "In-process interfaces", "Where interfaces allow", "In-proc default"],
  ["IPC", "Named pipes", "Section-based IPC", "Equal", "Section default"],
  ["TLS transport", "Stock library stack", "Owned stack with profile mimicry", "Equal", "Owned stack (N2)"],
];
DATA.decisionsNotEqual = "Raw disk/MFT · system event logs & hives · VSS snapshots · cross-user memory · driver load · kernel R/W · service/driver manipulation · audit/eBPF sensor control (init-namespace caps) → privileged form mandatory → L1/L2 in §5.";

/* ---------------- §6.1 execution substrate vectors ---------------- */
DATA.vectors = [
  ["File-backed stomp",   "Full-section replacement in mapped signed module", "memfd_create + fexecve", "Default"],
  ["Ghosted image",       "Delete-pending file → image section", "—", "When stomp COW risk unacceptable"],
  ["Herpaderped image",   "Section from payload, file rewritten benign", "—", "Target profile allows"],
  ["Transacted (doppelgänging)", "TxF section + rollback", "—", "NTFS available"],
  ["Threadless start",    "APC on alertable thread; thread-context hijack", "—", "No new thread desired (B8)"],
  ["Sleep discipline",    "Ekko/FOLIAGE: encrypt + RW during idle, RX only while executing", "mprotect cycle", "All long-resident code"],
];

/* ---------------- jrt-escalate (§5.1 / §6.0) ---------------- */
DATA.modules = [
  { id:"win_lpe_CVE_2024_29824", plat:"Windows", versions:"10.0.19041 · 10.0.19042", rel:"HIGH", cve:"CVE-2024-29824", desc:"Print Spooler daemon LPE — service named-pipe abuse", build:"compiled into build b-3f91", status:"active" },
  { id:"win_krb_ap_2021_42287",  plat:"Windows", versions:"10.0.22000 · 10.0.22631", rel:"MEDIUM", cve:"CVE-2021-42287", desc:"sAMAccountName spoofing → domain admin path", build:"compiled into build b-81d4", status:"active" },
  { id:"win_svc_acl_misconfig",  plat:"Windows", versions:"any", rel:"MEDIUM", cve:"—", desc:"Service ACL misconfiguration / unquoted path (non-CVE)", build:"compiled into build b-81d4", status:"active" },
  { id:"lin_pkexec_CVE_2021_4034", plat:"Linux", versions:"20.04 · 22.04 · 24.04", rel:"HIGH", cve:"CVE-2021-4034", desc:"pkexec PwnKit local privilege escalation", build:"compiled into build b-22ac", status:"active" },
  { id:"lin_suid_race_XXXX",     plat:"Linux", versions:"20.04", rel:"EXPERIMENTAL", cve:"—", desc:"SUID helper TOCTOU race (operator lab module)", build:"compiled into build b-c70e", status:"lab" },
];

/* probe results per agent (read-only probe() at check-in) */
DATA.probeResults = {
  "A-7F3C": [
    { m:"win_lpe_CVE_2024_29824", viable:false, reason:"OS build 22631 outside target set {19041,19042}" },
    { m:"win_krb_ap_2021_42287",  viable:true,  reason:"Domain-joined; DC reachable; patch state viable" },
    { m:"win_svc_acl_misconfig",  viable:true,  reason:"2 services with weak ACLs found" },
  ],
  "A-9D21": [
    { m:"win_lpe_CVE_2024_29824", viable:false, reason:"OS build 22000 outside target set" },
    { m:"win_krb_ap_2021_42287",  viable:false, reason:"Not domain-joined (workgroup lab)" },
    { m:"win_svc_acl_misconfig",  viable:false, reason:"No weak service ACLs" },
  ],
  "A-4B8E": [
    { m:"lin_pkexec_CVE_2021_4034", viable:false, reason:"pkexec patched 0.105→0.121 (policy-kit fixed)" },
    { m:"lin_suid_race_XXXX",       viable:false, reason:"Target SUID helper not present" },
  ],
  "A-6A93": [
    { m:"win_lpe_CVE_2024_29824", viable:true, reason:"Build 19042 in target set; Spooler running" },
    { m:"win_svc_acl_misconfig",  viable:true, reason:"1 service with weak ACL (SyncBoost)" },
  ],
  "A-2C55": [
    { m:"lin_pkexec_CVE_2021_4034", viable:false, reason:"pkexec patched" },
    { m:"lin_suid_race_XXXX",       viable:false, reason:"Ubuntu 24.04 outside target set {20.04}" },
  ],
  "A-1E47": [ { m:"lin_pkexec_CVE_2021_4034", viable:false, reason:"Already L2 — escalation unnecessary" } ],
  "A-5D02": [ { m:"win_lpe_CVE_2024_29824", viable:false, reason:"Agent decommissioned" } ],
  "A-3C19": [
    { m:"lin_pkexec_CVE_2021_4034", viable:true,  reason:"Unpatched policy-kit-1 0.105-33" },
    { m:"lin_suid_race_XXXX",       viable:false, reason:"Target SUID helper not present" },
  ],
};

/* ordered strategy + fallback policy per agent (operator-defined) */
DATA.escalationStrategy = {
  "A-7F3C": { order:["win_krb_ap_2021_42287","win_svc_acl_misconfig","win_lpe_CVE_2024_29824"], fallback:"ABORT" },
  "A-6A93": { order:["win_lpe_CVE_2024_29824","win_svc_acl_misconfig"], fallback:"DEGRADE" },
  "A-2C55": { order:["lin_pkexec_CVE_2021_4034"], fallback:"DEGRADE" },
  "A-3C19": { order:["lin_pkexec_CVE_2021_4034"], fallback:"ABORT" },
};

DATA.escalationLog = [
  { t:"2026-09-27 14:02Z", agent:"A-4B8E", module:"lin_pkexec_CVE_2021_4034", probe:"viable",  outcome:"SUCCESS — L1 acquired (euid 0)", cleanup:"clean — no artifacts", by:"a.kulkarni" },
  { t:"2026-09-27 14:02Z", agent:"A-4B8E", module:"lin_suid_race_XXXX",       probe:"failed",  outcome:"skipped (probe false)",           cleanup:"— (no artifacts created)", by:"—" },
  { t:"2026-09-26 19:44Z", agent:"A-7F3C", module:"win_krb_ap_2021_42287",    probe:"viable",  outcome:"PENDING — awaiting operator approval", cleanup:"—", by:"—" },
  { t:"2026-09-25 11:03Z", agent:"A-9D21", module:"win_svc_acl_misconfig",    probe:"failed",  outcome:"ABORT — fallback policy applied, remains L1 (pre-installed)", cleanup:"clean", by:"r.menon" },
];

/* ---------------- jrt-blind (§6.2) ---------------- */
DATA.blindPreflight = [
  { n:1, q:"HKLM\\SYSTEM\\CurrentControlSet\\Control\\CI\\Config\\VulnerableDriverBlocklistEnable", result:"enabled = 1" },
  { n:2, q:"Active WDAC policy → enumerate blocked hashes & signers (DriverPolicy_Enforced.xml)", result:"214 hashes · 31 signers listed" },
  { n:3, q:"Cross-reference agent driver set vs blocklist (file-hash + signer level)", result:"7 blocked / 1 viable" },
  { n:4, q:"Report viable/blocked status to C2 → operator decision", result:"reported — awaiting decision" },
];

DATA.blindDrivers = [
  { drv:"capcom.sys",    status:"BLOCKED", reason:"hash match (MS blocklist)" },
  { drv:"mhyprot2.sys",  status:"BLOCKED", reason:"signer cert revoked" },
  { drv:"RTCore64.sys",  status:"BLOCKED", reason:"hash match" },
  { drv:"WinRing0x64.sys",status:"BLOCKED", reason:"hash match" },
  { drv:"gdrv.sys",      status:"BLOCKED", reason:"signer cert revoked" },
  { drv:"WinIo64.sys",   status:"BLOCKED", reason:"hash match" },
  { drv:"AsIO2.sys",     status:"BLOCKED", reason:"signer cert revoked" },
  { drv:"acqdrv_9F.sys (WinPmem-class)", status:"VIABLE", reason:"legitimately signed forensic acquisition driver — memory access, not an exploit" },
];

DATA.blindActionsWin = [
  { a:"Zero PspCreateProcessNotifyRoutine / PspCreateThreadNotifyRoutine / PspLoadImageNotifyRoutine entries", out:"callbacks stripped" },
  { a:"Zero ObCallback registrations (EDR process-protection callbacks)", out:"object callbacks removed" },
  { a:"Corrupt _WMI_LOGGER_CONTEXT / disable trace sessions (ETW)", out:"sessions killed" },
  { a:"Unload EDR minifilter (altitude detach)", out:"filter unloaded" },
];

DATA.blindLinuxMatrix = [
  { posture:"Baseline (no hardening)", probe:"Check auditd, Falco, osquery processes", approach:"auditctl -D + systemctl stop auditd + kill monitors", limits:"Service restart re-enables monitoring", hard:false },
  { posture:"eBPF monitors (Falco, Tetragon, Tracee)", probe:"bpftool prog list", approach:"BPF_LINK_DETACH, or attach higher-priority replacement programs", limits:"Requires CAP_BPF + CAP_TRACING (root)", hard:false },
  { posture:"LKM-based EDR", probe:"lsmod + /proc/modules", approach:"rmmod monitoring module; or overwrite callback registrations via loadable module", limits:"Fails if module.sig_enforce=1", hard:false },
  { posture:"SELinux enforcing", probe:"getenforce", approach:"Cannot bypass; operate within policy. setenforce 0 if root holds capability", limits:"Full bypass out of scope", hard:true },
  { posture:"AppArmor", probe:"aa-status", approach:"aa-teardown or set profiles to complain mode", limits:"Profiles reload on reboot", hard:false },
  { posture:"Lockdown LSM", probe:"/sys/kernel/security/lockdown", approach:"Cannot bypass — prevents /dev/kmem, kprobes, module loading. Degraded mode.", limits:"Hard limit — declared in §11", hard:true },
  { posture:"Immutable audit rules (-e 2)", probe:"auditctl -s", approach:"Cannot modify — locked until reboot. Degraded mode.", limits:"Hard limit — declared in §11", hard:true },
];

DATA.blindOutcome = {
  agent:"A-1E47", when:"2026-09-28 21:14:07Z", mode:"baseline (no hardening)",
  callbacksStripped:41, objectCallbacks:3, sessionsKilled:3, rulesFlushed:12, minifilters:0,
  approvedBy:"a.kulkarni", taskRecord:"E-4418",
};

/* ---------------- Forensics: timeline / artifacts / chain / IOC (§8.1, §8.4) ---------------- */
DATA.timeline = [
  { ts:"2026-09-27 03:14:02Z", src:"evtlog_parse (Security)", type:"4624 logon (type 3)", detail:"corp\\svc_backup from 10.24.4.33 — logon type 3 (network)", hash:"b41e…9c02" },
  { ts:"2026-09-27 03:14:09Z", src:"host_triage", type:"process", detail:"cmd.exe /c psexec \\\\UB2004-DMZ-03 -s cmd (PID 6612, parent wmiprvse)", hash:"88d1…4f7b" },
  { ts:"2026-09-27 03:14:41Z", src:"lateral_scan", type:"lateral indicator", detail:"SMB session to 10.24.4.33:445 under svc_backup — matches logon 4624 cluster", hash:"1a07…de44" },
  { ts:"2026-09-27 03:16:20Z", src:"disk_forensics (MFT)", type:"MFT entry", detail:"\\\\??\\C:\\Windows\\Temp\\svchost_.exe (MFT rec 184772, $STANDARD_INFORMATION si created T0 = zeroed)", hash:"c2f9…7710" },
  { ts:"2026-09-27 03:16:51Z", src:"disk_forensics (USN)", type:"USN journal", detail:"Create + data-extend on Temp\\svchost_.exe; rename to ~DF9A31.tmp", hash:"6be0…1d3a" },
  { ts:"2026-09-27 03:17:02Z", src:"host_triage", type:"process", detail:"svchost_.exe (PID 7744) — exec region file-backed (mapped from ~DF9A31.tmp) — B7 compliant", hash:"93c4…a8e1" },
  { ts:"2026-09-27 03:19:35Z", src:"persistence_scan", type:"persistence write", detail:"HKCU\\…\\Run\\OneDriveSync = \"C:\\Users\\pub\\AppData\\Roaming\\msedge_update.exe\"", hash:"47d2…bb99" },
  { ts:"2026-09-27 03:41:10Z", src:"network_capture", type:"beacon pattern", detail:"Periodic TLS egress 172.16.4.90 → 104.18.*.*:443, ~60s ±12% jitter over 41 samples", hash:"0ac8…3e52" },
  { ts:"2026-09-27 04:02:44Z", src:"evtlog_parse (Sysmon)", type:"EID 13", detail:"Registry value set: Run\\OneDriveSync (matches persistence write)", hash:"7f31…cc06" },
  { ts:"2026-09-27 05:55:18Z", src:"memory_scan", type:"yara hit", detail:"rule MAL_WIN_PSEXEC_IMPLANT { $a = \"PaThRough\" } on dump seg 0x2A000", hash:"d19a…64f0" },
  { ts:"2026-09-27 06:30:05Z", src:"registry_forensics", type:"shimcache", detail:"AppCompatCache: \\VEHICLE\\psexec.exe executed 2026-09-27 03:14Z", hash:"2e5c…90d7" },
  { ts:"2026-09-27 07:12:59Z", src:"beacon_detect", type:"exfil score", detail:"Outbound 3.4 GB to 104.18.*.* over 90 min — exfiltration score 0.87", hash:"aa40…12bc" },
  { ts:"2026-09-27 08:00:00Z", src:"timeline_build", type:"chain entry", detail:"Super-timeline segment #12 merged; 1,284 entries hashed; parent chain intact", hash:"f00d…77ee" },
];

DATA.artifacts = [
  { id:"ART-0001", t:"host_triage", when:"2026-09-27 02:58:41Z", fp:"PFN-4471::WP-B-77AE", agent:"A-7F3C", build:"9f3a…c41e",
    dataHash:"a1c0…44f2", parent:"GENESIS", sig:"ed25519:5Kdh…8wQ2", verified:true,
    preview:["processes: 214 · tree depth 6","handles: 9,041 · DLLs: 2,290","tokens: SeDebugPrivilege on 3 procs"] },
  { id:"ART-0002", t:"service_enum", when:"2026-09-27 02:59:12Z", fp:"PFN-4471::WP-B-77AE", agent:"A-7F3C", build:"9f3a…c41e",
    dataHash:"b2d1…55a3", parent:"a1c0…44f2", sig:"ed25519:Qm3f…pR91", verified:true,
    preview:["services: 512 total · 9 unsigned binaries","weak ACL: SyncBoost (NT AUTH\\SYSTEM modifiable)"] },
  { id:"ART-0003", t:"network_connections", when:"2026-09-27 03:00:05Z", fp:"PFN-2280::WP-A-31CD", agent:"A-9D21", build:"b81d…77f0",
    dataHash:"c3e2…66b4", parent:"b2d1…55a3", sig:"ed25519:Rn7k…tT04", verified:true,
    preview:["sockets: 128 TCP / 44 UDP mapped to PIDs","dns cache: 312 entries · arp: 27 · routes: 18"] },
  { id:"ART-0004", t:"disk_forensics", when:"2026-09-27 03:21:37Z", fp:"PFN-2280::WP-A-31CD", agent:"A-9D21", build:"b81d…77f0",
    dataHash:"d4f3…77c5", parent:"c3e2…66b4", sig:"ed25519:Sx2m…uU17", verified:true,
    preview:["MFT records: 1,904,552 parsed","USN: 41,207 · prefetch: 1,204 · amcache: 8,872","SRUM: 6 tables · $LogFile: 128 MB"] },
  { id:"ART-0005", t:"evtlog_parse", when:"2026-09-27 03:44:02Z", fp:"PFN-9042::UL-B-5E11", agent:"A-4B8E", build:"22ac…b9d3",
    dataHash:"e5a4…88d6", parent:"d4f3…77c5", sig:"ed25519:Ty9q…vV28", verified:true,
    preview:["Security: 4624×1,204 · 4625×88 · 4688×3,407","7045 service installs: 4 (2 suspicious)"] },
  { id:"ART-0006", t:"memory_scan", when:"2026-09-27 04:10:19Z", fp:"PFN-7702::UL-D-1A9C", agent:"A-1E47", build:"b81d…77f0",
    dataHash:"f6b5…99e7", parent:"e5a4…88d6", sig:"ed25519:Uz1r…wW39", verified:true,
    preview:["dump: 32 GB (WinPmem-class, consented)","yara: 3 hits · injected threads: 2 procs","sockets-in-memory: 61 · strings: 1.2M scanned"] },
];

DATA.iocs = [
  { type:"sha256",   value:"e193f…d41a (svchost_.exe)",          src:"memory_scan / MFT",            hits:4,  refs:"ART-0004, ART-0006, TL-3, TL-6" },
  { type:"ipv4",     value:"104.18.32.114",                       src:"network_capture",              hits:41, refs:"TL-8, beacon_detect" },
  { type:"domain",   value:"cdn-metrics-eu.example-tracker.net",  src:"beacon_detect",                hits:41, refs:"TL-8" },
  { type:"yara",     value:"MAL_WIN_PSEXEC_IMPLANT",              src:"memory_scan",                  hits:2,  refs:"ART-0006" },
  { type:"yara",     value:"GEN_POLY_NATIVE_LOADER_v2",           src:"rootkit_detect (own-binary)",  hits:0,  refs:"— (self-check: clean)" },
  { type:"registry", value:"HKCU\\…\\Run\\OneDriveSync",          src:"persistence_scan",             hits:1,  refs:"TL-7, TL-9" },
  { type:"ipv4",     value:"10.24.4.33 (UB2004-DMZ-03)",          src:"lateral_scan",                 hits:7,  refs:"TL-1, TL-3" },
  { type:"md5",      value:"7bd2…c910 (psexec.exe variant)",      src:"shimcache / prefetch",         hits:3,  refs:"TL-11" },
];

/* ---------------- Build plane (§3.1, §9, §10) ---------------- */
DATA.pipeline = [
  ["jocky-frontend","lexer → parser → AST → semantic analysis"],
  ["JOCKY IR","opcodes IR_COLLECT / IR_INJECT / IR_BLIND / IR_PERSIST / IR_BEACON · effect-privilege typechecker rejects invalid programs"],
  ["LLVM IR lowering","each opcode expands to jrt-core calls; platform paths selected (Win/Linux)"],
  ["OLLVM pass pipeline","CFG flatten · opaque predicates · MBA · string encrypt · dead-code · import strategy · block shuffle — seeded per build (s)"],
  ["LLVM backend","standard x86-64 / AArch64 codegen — no custom backend"],
  ["PE/ELF emitter","toolchain-profile forging: Rich header, linker version, section layout, load-config/CFG, build-id · empty IAT · encrypted string section"],
  ["Attestation","SHA256 · TLSH · footprint report · degradation matrix"],
  ["Artifact","unique polymorphic binary"],
];

DATA.builds = [
  { id:"b-3f91", seed:"0x9C41E2A7", sha:"9f3ac41e…d0b2", tlsh:"T1:4A2C…F013", target:"windows", profile:"MSVC 16.29 / Rich DanS 9.40", modules:"win_lpe ×1", when:"2026-09-27 09:14Z", vt:"0 / 70", yara:"0 hits" },
  { id:"b-81d4", seed:"0x1B77F30C", sha:"b81d77f0…6a3c", tlsh:"T1:88D1…A27E", target:"windows", profile:"MSVC 19.37 / Rich DanS 10.11", modules:"win_lpe ×2", when:"2026-09-28 11:02Z", vt:"0 / 70", yara:"0 hits" },
  { id:"b-22ac", seed:"0x44E0B9D3", sha:"22acb9d3…19ff", tlsh:"T1:C3E2…19BC", target:"linux", profile:"GCC 11.4 / build-id forge", modules:"lin_lpe ×2", when:"2026-09-27 10:41Z", vt:"0 / 68", yara:"0 hits" },
  { id:"b-c70e", seed:"0x7A5104AA", sha:"c70e04aa…2b7d", tlsh:"T1:F6B5…C409", target:"linux", profile:"Clang 14 / build-id forge", modules:"lin_lpe ×2", when:"2026-09-28 16:20Z", vt:"0 / 68", yara:"0 hits" },
];

DATA.diversity = [
  ["SHA256",      "differ", "per-build seed → unique hash every build (S2)"],
  ["TLSH",        "differ", "structural diversity; runtime itself polymorphized (S3)"],
  ["Entry point", "differ", "block shuffle + CFG flatten (pass pipeline)"],
  ["CFG shape",   "differ", "opaque predicates + MBA per build"],
  ["imphash",     "degenerate", "no static IAT — PEB-walk hash lookup (S4/S5)"],
  ["Section entropy","6.0–6.5 (.text)", "balanced into normal toolchain range (S7)"],
];

DATA.footprint = {
  build:"b-81d4",
  syscalls:["NtAllocateVirtualMemory","NtProtectVirtualMemory","NtCreateSection","NtMapViewOfSection","NtQuerySystemInformation","NtOpenProcess","NtQueryVirtualMemory","NtReadFile","NtWriteFile","NtDeviceIoControlFile"],
  events:["0 process-creation · 0 thread-creation · 0 image-load attributable to lowering (invariant 6)"],
  privileges:["declared: L0 baseline · degrade paths enumerated for L1/L2 ops"],
};

DATA.degradeMatrix = [
  ["collect MFT",            "L1 required", "skip + report",          "full",                   "full"],
  ["collect evtlog",         "L1 required", "skip + report",          "full",                   "full"],
  ["inject (cross-user)",    "L1 required", "same-user only",         "full",                   "full"],
  ["blind() BYOVD",          "L2 required", "—",                      "data-only profile",      "degraded: report"],
  ["persist HKLM",           "L1 required", "HKCU substitute (L0)",   "full",                   "full"],
  ["rootkit_detect",         "L2 required", "API-level only (partial-data)", "full differential", "full differential"],
];

DATA.invariants = [
  ["No static import directory", "imphash degenerate", "S4/S5", true],
  ["No plaintext literals; entropy within toolchain range", "static scan", "S6/S7", true],
  ["SHA256 / TLSH / entry point / CFG differ across N builds", "N-build diff", "pillar 2", true],
  ["No page ever W+X during execution", "dynamic allocation trace", "B6", true],
  ["Every executable region file-backed", "dynamic mapping test", "B7", true],
  ["Zero process/thread/image-load events from lowering", "Sysmon/Falco maximal-workload run", "B4", true],
  ["Sensitive syscalls carry signed-module call stack", "stack-walk test", "B9", true],
  ["No AMSI provider instantiated", "provider-list test", "B11", true],
  ["No user-mode hook dependency (ntdll hooks don't alter behavior)", "differential execution", "B1", true],
  ["Per-build footprint report attached as attestation", "attestation check", "§9.10", true],
];

DATA.verification = [
  ["Static", "N-build VirusTotal sweep → 0 detections; YARA family+generic packer rules → 0 hits; fuzzy-hash spread documented", "pass"],
  ["Windows dynamic", "Win 11 + Defender + Sysmon: maximal artifact set → 0 lowering-attributable events; then blind() (L2) → EDR callback counts → zero (reported)", "pass"],
  ["Linux dynamic", "Ubuntu + Falco + auditd: memfd execution, artifact set → 0 lowering events; blind() root path", "pass"],
  ["Cross-platform", "same .jky compiled --target=windows and --target=linux; identical JSON output semantics", "pass"],
  ["Management plane", "console tasking 5+ concurrent implants over CDN-fronted transport", "pass"],
  ["Honesty annex", "one page of explicit non-claims included in deliverable", "pass"],
];

/* ---------------- §2.2 descope (accepted residues) ---------------- */
DATA.descopes = [
  ["B2 API call sequence (kernel n-grams)", "Kernel sees the primitive's inherent syscall sequence; benign-sequence primitives chosen where free"],
  ["B3 API call frequency", "Bulk-query lowering retained as plain engineering, not evasion"],
  ["B5 injection-detection heuristics", "Structural residue stands: remote handle → object callback; cross-user needs privilege"],
  ["B10 ETW (user-mode patch)", "User-mode ETW events from ordinary operations occur; kernel-side blinding only inside jrt-blind"],
  ["B13 registry monitoring", "Persistence verbs use standard locations; writes are visible"],
  ["B15 DNS monitoring", "Resolution happens per OS default — no DoH-as-evasion module"],
  ["B17 WMI monitoring", "Native metadata queries retained as engineering; WMI where semantics demand"],
  ["K1–K6 kernel callbacks", "No blinding outside the PS-mandated jrt-blind module"],
];

/* ---------------- §11 honesty annex ---------------- */
DATA.honesty = [
  ["Bootstrap", "Privilege is either operator-supplied (pre-installed admin) or obtained via jrt-escalate using operator-provided C++ LPE modules. The framework ships no built-in exploits."],
  ["Escalation is inherently noisy", "Operator-supplied LPE modules exploit real vulnerabilities — service crashes, event-log entries, handle anomalies. The envelope reduces binary footprint but cannot hide the exploit's semantic signal. Reliability and risk are the operator's responsibility."],
  ["Kernel blinding is target-conditional", "HVCI / secure-boot / lockdown degrade it; blocklisted drivers are unavailable; the driver-load event itself is telemetry."],
  ["PARTIAL residues", "Registry / file / network / DNS / IPC / WMI / COM semantic footprints are visible to the corresponding sensors by design decision (§2.2)."],
  ["Not-equal capabilities", "Cross-user memory, raw disk, system logs are L1/L2 with no equal unprivileged form (§4)."],
  ["CET / shadow-stack", "Hosts with CET enforced defeat return-address spoofing."],
  ["Adaptive detectors", "Economic guarantee (P5): re-randomization is one CI iteration — signatures decay faster than the cost of writing them. Not a permanence guarantee."],
  ["BYOVD blocklist", "Microsoft's blocklist blocks virtually all publicly known BYOVD drivers. On updated Windows 11 with HVCI + blocklist, jrt-blind reports degraded mode and operates without kernel blinding."],
  ["Cloud/console plane", "Compromised server = compromised fleet; mitigated by canary tasks, result anomaly checks, per-mission tokens — not eliminated."],
];

/* ---------------- Transport (§8.3) ---------------- */
DATA.transportProfiles = [
  { id:"gdrive", svc:"Google Drive API", ep:"www.googleapis.com/upload/drive/v3", pattern:"Identical to Google Drive desktop client", use:2 },
  { id:"azure-blob", svc:"Azure Blob Storage REST", ep:"<account>.blob.core.windows.net", pattern:"Identical to Azure SDK file upload", use:2 },
  { id:"s3", svc:"AWS S3 REST API", ep:"<bucket>.s3.amazonaws.com", pattern:"Identical to standard S3 client", use:2 },
  { id:"gcs", svc:"Google Cloud Storage JSON API", ep:"storage.googleapis.com", pattern:"Identical to GCS client library", use:2 },
];

DATA.tlsProfiles = ["Chrome 120 / Win11","Firefox 121 / Win","Edge 120 / Ubuntu","Safari 17 / Ubuntu","Chrome 119 / Win10"];

DATA.transportNotes = [
  "Domain fronting is NOT relied upon — blocked by all major CDNs since 2018.",
  "Tasking delivered as encrypted blobs in the same storage account; agent polls for updates (or C2 consumes event notifications).",
  "Pinned certificates prevent MITM.",
  "Per-mission storage accounts with auto-expiry tokens limit blast radius if server is compromised.",
];

/* ---------------- Alerts (dashboard) ---------------- */
DATA.alerts = [
  { sev:"crit", title:"Evidence-poisoning suspicion — A-3C19 quarantined", msg:"Result bundle failed anomaly check: canary task returned fixed nonce mismatch. Bundle held pending operator review.", when:"09:41Z", action:"Review bundle" },
  { sev:"warn", title:"OP-PERSIST-AUDIT cloud token expires in 4h", msg:"Per-mission least-privilege token (s3) — rotate before expiry to avoid task delivery gaps.", when:"09:12Z", action:"Rotate token" },
  { sev:"warn", title:"Immutable audit rules on UB2204-SRV-02", msg:"auditctl -s reports -e 2 — blind() cannot flush rules until reboot. Degraded mode declared (§11).", when:"08:55Z", action:"View blinding" },
  { sev:"warn", title:"WIN10-GW-07 missed 3 beacons", msg:"Transport retry scheduled on next window. Host last seen 6h 12m ago.", when:"08:30Z", action:"View agent" },
  { sev:"info", title:"HVCI active on 3 Windows agents", msg:"jrt-blind runs data-only profile (pool writes, callback arrays). Kernel-code patching disabled, never attempted.", when:"08:02Z", action:"—" },
  { sev:"ok",   title:"Artifact chain verified — OP-TIMELINE-DELTA", msg:"1,284 artifacts; Merkle-style parent_hash chain intact; C2 independent verification passed.", when:"07:48Z", action:"Open chain" },
  { sev:"info", title:"New build attested: b-81d4", msg:"SHA256/TLSH/entry-point differ from previous builds. VT 0/70 · YARA 0. Escalation modules re-polymorphized.", when:"06:20Z", action:"View build" },
];

/* ---------------- Live feed pool (WebSocket simulation) ---------------- */
DATA.feedPool = [
  ["checkin",    "<b>{A}</b> check-in · beacon window 60s ±30% jitter · transport gdrive"],
  ["result",     "<b>{A}</b> result bundle received — encrypted signed JSON · chain verified"],
  ["task",       "task <b>T-9{N}</b> dispatched to <b>{A}</b> (P2 · L0)"],
  ["taskdone",   "task <b>T-9{N}</b> complete on <b>{A}</b> — artifact attached, hashes OK"],
  ["probe",      "<b>{A}</b> environment re-probe: HVCI=on · Defender active · blocklist enforced"],
  ["canary",     "canary task executed on <b>{A}</b> — nonce match, anomaly check passed"],
  ["ws",         "WebSocket: live forensic feed streaming — evtlog_parse chunk 118/512"],
  ["token",      "per-mission token rotation: <b>svc-rotate</b> renewed OP-TIMELINE-DELTA (gdrive)"],
  ["audit",      "audit: <b>s.iyer</b> opened artifact ART-0004 (read-only)"],
  ["queue",      "task queue: priority reorder — P0 items ahead of P2 batch"],
];

/* ---------------- §63 certificate (§8.4) ---------------- */
DATA.certificate = {
  mission:"M-2609 · OP-TIMELINE-DELTA",
  records:"6 artifact bundles · 1,284 timeline entries",
  devices:"PFN-4471::WP-B-77AE · PFN-2280::WP-A-31CD · PFN-9042::UL-B-5E11",
  production:"JOCKY 0.7.2-p5 · agent build 9f3a…c41e / b81d…77f0 / 22ac…b9d3 · collected via jrt-core artifact engine (NTP-validated UTC timestamps)",
  integrity:"data_hash (SHA-256) per artifact; Merkle-style parent_hash chain — insertion/deletion/modification breaks the chain; C2 independently verifies on receipt",
  signature:"operator (console) Ed25519 key — countersigned by agent mission key",
  law:"Bharatiya Sakshya Adhiniyam, 2023 — §63 · NIST SP 800-86 · RFC 3227",
  signed:false,
};

/* ---------------- Exports (§8.4) ---------------- */
DATA.exports = [
  { id:"json", name:"JSON (native)", use:"SIEM ingestion (Splunk, Elastic), custom analysis", note:"default" },
  { id:"csv", name:"CSV / TSV", use:"Excel, pandas, manual review", note:"on-demand" },
  { id:"stix", name:"STIX 2.1", use:"MISP, OpenCTI, threat-intel platforms", note:"IOC sharing" },
  { id:"body", name:"Timeline (bodyfile)", use:"Sleuth Kit mactime, plaso, log2timeline", note:"timeline analysis" },
];

/* ---------------- Audit log (§8.2 append-only, signed) ---------------- */
DATA.audit = [
  { t:"2026-09-29 09:41:02Z", actor:"system",     act:"ANOMALY_HOLD",      detail:"bundle from A-3C19 quarantined — canary nonce mismatch", sig:"9d4a…f1", cat:"integrity" },
  { t:"2026-09-29 09:30:11Z", actor:"svc-rotate", act:"TOKEN_ROTATE",      detail:"per-mission token renewed: OP-TIMELINE-DELTA (gdrive, +72h)", sig:"1c8e…a2", cat:"mission" },
  { t:"2026-09-29 09:20:44Z", actor:"s.iyer",     act:"LOGIN",             detail:"JWT issued · role=analyst · mfa=webauthn", sig:"7b31…c3", cat:"auth" },
  { t:"2026-09-29 09:12:00Z", actor:"system",     act:"TOKEN_EXPIRY_WARN", detail:"OP-PERSIST-AUDIT s3 token expires in 4h", sig:"5f02…d4", cat:"mission" },
  { t:"2026-09-29 08:55:31Z", actor:"system",     act:"DEGRADE_REPORT",    detail:"A-4B8E blind() degraded — audit rules immutable (-e 2)", sig:"2d99…e5", cat:"privilege" },
  { t:"2026-09-29 08:02:57Z", actor:"r.menon",    act:"LOGIN",             detail:"JWT issued · role=operator · mfa=webauthn", sig:"8a44…f6", cat:"auth" },
  { t:"2026-09-29 07:48:19Z", actor:"c2-verifier",act:"CHAIN_VERIFY",      detail:"OP-TIMELINE-DELTA: 1,284 artifacts verified — chain intact", sig:"b7c0…07", cat:"integrity" },
  { t:"2026-09-29 07:20:04Z", actor:"r.menon",    act:"TASK_DISPATCH",     detail:"rootkit_detect.jky → A-1E47 (L2 · pre-approved)", sig:"4e18…18", cat:"tasking" },
  { t:"2026-09-29 06:47:40Z", actor:"a.kulkarni", act:"LOGIN",             detail:"JWT issued · role=operator", sig:"c1a9…29", cat:"auth" },
  { t:"2026-09-29 06:20:00Z", actor:"ci-pipeline",act:"BUILD_ATTESTED",    detail:"b-81d4 attested: SHA256/TLSH/footprint attached; 0 VT, 0 YARA", sig:"f3d2…3a", cat:"build" },
  { t:"2026-09-28 21:14:07Z", actor:"a.kulkarni", act:"BLIND_APPROVE",     detail:"blind() approved for A-1E47 (L1→L2) · single-shot · outcome reported", sig:"9a5c…4b", cat:"privilege" },
  { t:"2026-09-28 21:14:07Z", actor:"A-1E47",     act:"BLIND_EXECUTED",    detail:"callbacks stripped 41 · sessions killed 3 · rules flushed 12", sig:"6d41…5c", cat:"privilege" },
  { t:"2026-09-27 14:02:33Z", actor:"a.kulkarni", act:"ESCALATE_APPROVE",  detail:"jrt-escalate approved: A-4B8E · lin_pkexec_CVE_2021_4034", sig:"e8b7…6d", cat:"privilege" },
  { t:"2026-09-26 16:05:12Z", actor:"a.kulkarni", act:"MISSION_CREATE",    detail:"M-2606 OP-BLIND-TRIAL · agents [A-6A93, A-1E47] · roe set", sig:"3f9e…7e", cat:"mission" },
];

/* ---------------- Execution vectors → inject modes (§6.1) ---------------- */
DATA.injectModes = ["SECTION_MAP","APC","GHOSTED","HERPADERP","TRANSACTED","THREADLESS"];

/* ---------------- Browser/network finding rows (§8.1.1) ---------------- */
DATA.netTiers = [
  ["Tier 1 · Connection state", "L0", "Sockets→PIDs, listening ports, DNS cache, ARP, routes, interface configs, Wi-Fi profiles", "online"],
  ["Tier 2 · Flow capture", "L1", "Packet-level capture, connection metadata, protocol ID (HTTP/DNS/SMB/RDP/SSH), DNS reconstruction", "approval pending"],
  ["Tier 3 · Deep analysis", "L1", "Full packet reassembly, TLS cert extraction, SMB/Kerberos sessions, lateral indicators, beaconing, exfil scoring", "offline analysis ready"],
];
