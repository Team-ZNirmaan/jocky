/* ============================================================
   Jocky — Central Management Console (demo)
   views2.js — Build plane, Forensics, Console views + UI controller.
   ============================================================ */
"use strict";

/* ================= BUILD PLANE ================= */
function vBuild(){
  const b = DATA.builds.find(function(x){return x.id===S.buildId;}) || DATA.builds[0];
  const pipe = DATA.pipeline.map(function(p){
    return '<div class="stage pass"><div class="box"><b>'+p[0]+'</b><div class="tiny">'+p[1]+'</div></div></div>';
  }).join("");
  const buildRows = DATA.builds.map(function(x){
    return '<tr class="'+(x.id===b.id?"sel":"")+'"><td class="mono"><b>'+x.id+'</b><span class="sub">seed '+x.seed+'</span></td>'
      +'<td class="mono">'+x.sha+'</td><td class="mono">'+x.tlsh+'</td><td class="mini">'+x.target+'<span class="sub">'+esc(x.profile)+'</span></td>'
      +'<td class="mini">'+esc(x.modules)+'</td><td class="mini">'+x.when+'</td>'
      +'<td>'+badge("VT "+x.vt,"ok")+'<span class="sub">YARA '+x.yara+'</span></td>'
      +'<td class="right-in-table"><button class="btn xs'+(x.id===b.id?" primary":"")+'" onclick="UI.buildSel(\''+x.id+'\')">Inspect</button></td></tr>';
  }).join("");
  const divRows = DATA.diversity.map(function(d){
    return '<tr><td><b>'+d[0]+'</b></td><td>'+(d[1]==="differ"?badge("differs per build","ok"):badge(d[1],"teal"))+'</td><td class="mini">'+d[2]+'</td></tr>';
  }).join("");
  const fp = DATA.footprint;
  const degRows = DATA.degradeMatrix.map(function(d){
    return '<tr><td><b>'+d[0]+'</b><span class="sub">'+d[1]+'</span></td><td class="mini">'+d[2]+'</td>'
      +'<td>'+badge(d[3],"ok")+'</td><td>'+badge(d[4],/degrad|partial/i.test(d[4])?"warn":"ok")+'</td></tr>';
  }).join("");
  return pageHead("Build Plane","Two-tier IR compilation with a seeded OLLVM-style pass pipeline, toolchain-profile forging emitters, and per-build attestation (§3.1).")
    +'<div class="card mb"><div class="head">'+ic("hammer",15)+' Compilation pipeline <span class="sub">.jky source → unique polymorphic binary</span></div>'
    +'<div class="body"><div class="pipe">'+pipe+'</div>'
    +'<div class="callout teal">'+ic("info",16)+'<div><b>Why two IRs?</b> JOCKY IR exists for the effect/privilege type system (forensic semantics LLVM cannot express). LLVM IR exists for codegen + obfuscation (mature x86/ARM backends, pass infrastructure). Domain-specific type safety <b>and</b> industrial-grade compilation.</div></div></div></div>'
    +'<div class="card mb"><div class="head">'+ic("box",15)+' Attested builds <span class="sub">N-build sweep · every build polymorphically unique</span></div>'
    +'<div class="tbl-wrap"><table class="table"><thead><tr><th>Build</th><th>SHA-256</th><th>TLSH</th><th>Target / profile</th><th>Modules</th><th>Attested</th><th>Static sweep</th><th></th></tr></thead><tbody>'+buildRows+'</tbody></table></div></div>'
    +'<div class="grid g3">'
    +'<div class="card"><div class="head">'+ic("layers",15)+' Cross-build diversity <span class="sub">'+b.id+'</span></div><div class="tbl-wrap"><table class="table"><tbody>'+divRows+'</tbody></table></div></div>'
    +'<div class="card"><div class="head">'+ic("term",15)+' Footprint report <span class="sub">attached as attestation (§9.10)</span></div><div class="body">'
    +'<div class="tiny">ENUMERATED SYSCALLS · '+b.id+'</div><div class="tag-row mt">'+fp.syscalls.map(function(s){return '<span class="chip">'+s+'</span>';}).join("")+'</div>'
    +'<div class="tiny mt">LOWERING-ATTRIBUTABLE EVENTS</div><div class="mini mt">'+fp.events[0]+'</div>'
    +'<div class="tiny mt">PRIVILEGES</div><div class="mini mt">'+fp.privileges[0]+'</div></div></div>'
    +'<div class="card"><div class="head">'+ic("shield",15)+' Typechecker <span class="sub">effect system</span></div><div class="body">'
    +'<div class="mini">Every function is annotated <span class="mono">Effect[Access, Object, Privilege]</span>. The checker runs on JOCKY IR and <b>rejects any lowering outside the allowset</b> — the compiler-level guarantee the binary cannot exceed its declared envelope.</div>'
    +'<div class="code mt">collect proc_meta\n  │ Effect[Access, Process, L0]  <span class="c">✓ allowed</span>\nblind(mode: BYOVD)\n  │ Effect[Access, Kernel, L2]   <span class="c">✓ declared</span>\nsyscall(0x55, …)\n  │ <span class="s">✗ rejected — no raw-syscall verb exists</span></div></div></div>'
    +'</div>'
    +'<div class="card mt"><div class="head">'+ic("log",15)+' Degradation matrix <span class="sub">defined degraded behavior below MinPriv (§5)</span></div>'
    +'<div class="tbl-wrap"><table class="table"><thead><tr><th>Primitive</th><th>Below-priv behavior</th><th>HVCI off</th><th>HVCI on / hardened</th></tr></thead><tbody>'+degRows+'</tbody></table></div></div>';
}

function vInvariants(){
  const rows = DATA.invariants.map(function(v,i){
    return '<tr><td class="mono"><b>I-'+(i+1)+'</b></td><td class="mini">'+v[0]+'</td><td class="mini">'+v[1]+'</td><td><span class="chip">'+v[2]+'</span></td>'
      +'<td>'+badge("pass","ok")+'</td></tr>';
  }).join("");
  return pageHead("Envelope & Invariants","Ten checkable invariants on the emitted binary and its runtime — stated as properties to test, not techniques to apply (§9).")
    +'<div class="card"><div class="head">'+ic("shield",15)+' Testable invariants <span class="sub">demonstrable to evaluators</span><span class="right">'+badge("10 / 10 pass","ok")+'</span></div>'
    +'<div class="tbl-wrap"><table class="table"><thead><tr><th>#</th><th>Invariant</th><th>Test</th><th>Maps to</th><th>Status</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>'
    +'<div class="callout teal mt">'+ic("info",16)+'<div><b>P2 — invariant-first evasion.</b> A detector is defeated best when made inapplicable ("no static imports to hash"), not when evaded. See Verification for the §10 evidence battery behind each invariant.</div></div>';
}

function vVerification(){
  const rows = DATA.verification.map(function(v){
    return '<tr><td><b>'+v[0]+'</b></td><td class="mini">'+v[1]+'</td><td>'+badge(v[2],"ok")+'</td></tr>';
  }).join("");
  return pageHead("Verification","The six-track §10 plan with current evidence status.")
    +'<div class="stepper card mb">'
    +[["1","Static","VT sweep · YARA · fuzzy spread"],["2","Win dynamic","Defender + Sysmon maximal set"],["3","Linux dynamic","Falco + auditd memfd run"],["4","Cross-platform","same .jky → both targets"],["5","Mgmt plane","5+ implants over CDN"],["6","Honesty","non-claims page"]].map(function(s){
      return '<div class="step done"><div class="knob">✓</div><b>'+s[1]+'</b><div class="tiny">'+s[2]+'</div></div>';
    }).join("")+'</div>'
    +'<div class="card"><div class="head">'+ic("check",15)+' Evidence battery <span class="sub">§10.1 – §10.6</span></div>'
    +'<div class="tbl-wrap"><table class="table"><thead><tr><th>Track</th><th>Procedure & result</th><th>Status</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>'
    +'<div class="grid g2 mt"><div class="card pad"><h4>Cross-platform demo (§10.4)</h4><div class="code mt"><span class="c">// identical .jky, two targets</span>\n$ jocky build triage.jky <span class="k">--target=windows</span>  <span class="c">→ b-81d4</span>\n$ jocky build triage.jky <span class="k">--target=linux</span>    <span class="c">→ b-22ac</span>\n<span class="k">diff</span> &lt;(win.json) &lt;(lin.json)  <span class="c">→ identical semantics ✓</span></div></div>'
    +'<div class="card pad"><h4>Management plane (§10.5)</h4><div class="mini mt">Console tasking <b>5+ concurrent implants</b> over CDN-fronted transport — this dashboard is the §8.2 console under test. Live feed, queue, schedules and audit on this page exercise the operator surface.</div>'
    +'<div class="row mt"><button class="btn sm" onclick="UI.go(\'dashboard\')">Open live feed</button><button class="btn sm" onclick="UI.go(\'tasks\')">Open queue</button></div></div></div>';
}

/* ================= FORENSICS ================= */
function timelineSources(){
  const s={}; DATA.timeline.forEach(function(t){ s[t.src]=true; }); return Object.keys(s);
}
function vTimeline(){
  const srcs=timelineSources();
  const list=DATA.timeline.filter(function(t){
    if(S.tlSrc!=="all"&&t.src!==S.tlSrc) return false;
    if(S.tlQ&&(t.detail+t.type+t.src).toLowerCase().indexOf(S.tlQ.toLowerCase())<0) return false;
    return true;
  });
  const rows=list.map(function(t,i){
    const lat=/lateral|beacon|exfil|yara|persistence/i.test(t.type+t.detail);
    return '<tr'+(lat?' class="sel"':"")+'><td class="mono" style="white-space:nowrap">'+t.ts+'</td><td><span class="chip">'+esc(t.src)+'</span></td>'
      +'<td class="mini"><b>'+esc(t.type)+'</b></td><td class="mini">'+esc(t.detail)+'</td><td class="mono mini">'+t.hash+'</td></tr>';
  }).join("");
  return pageHead("Super-Timeline","Merged chronological view across all artifacts — log2timeline/plaso model — with SHA-256 per entry for chain-of-custody.",
      disBtn("export","Export bodyfile","UI.expDownload('body')","")+'<button class="btn primary" onclick="UI.go(\'chain\')">'+ic("chain",14)+' Evidence chain</button>')
    +'<div class="card"><div class="body"><div class="row wrap">'
    +'<div class="searchbar">'+ic("search",14)+'<input placeholder="search detail / type / source…" value="'+esc(S.tlQ)+'" oninput="UI.tlQ(this.value)"/></div>'
    +'<select class="mission-select" onchange="UI.tlSrc(this.value)"><option value="all">source: all</option>'
    +srcs.map(function(s){return '<option'+(S.tlSrc===s?" selected":"")+'>'+esc(s)+'</option>';}).join("")+'</select>'
    +'<span class="mini grow" style="text-align:right">'+list.length+' entries · mission '+S.mission+'</span></div></div>'
    +'<div class="tbl-wrap"><table class="table"><thead><tr><th>Timestamp (UTC)</th><th>Source</th><th>Type</th><th>Detail</th><th>Entry hash</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>'
    +'<div class="callout teal mt">'+ic("net",16)+'<div><b>Lateral movement detection (§8.1.1).</b> Cross-references network connections (Tier 1) + process creation from host_triage + authentication events (logon type 3/10) + super-timeline temporal clustering across hosts — highlighted rows above form one cluster (03:14–03:19Z).</div></div>';
}

function vArtifacts(){
  const a = DATA.artifacts.find(function(x){return x.id===S.artId;}) || DATA.artifacts[0];
  const rows = DATA.artifacts.map(function(x){
    return '<tr class="'+(x.id===a.id?"sel":"")+'" style="cursor:pointer" onclick="UI.artSel(\''+x.id+'\')">'
      +'<td class="mono"><b>'+x.id+'</b></td><td class="mini">'+x.t+'</td><td class="mini">'+x.when+'</td>'
      +'<td class="mono">'+x.agent+'</td><td class="mono mini">'+x.dataHash+'</td>'
      +'<td>'+(x.verified?badge("verified","ok"):badge("failed","bad"))+'</td></tr>';
  }).join("");
  const integ = [
    ["artifact_id", a.id, "Identifying the electronic record"],
    ["collection_timestamp", a.when+" (NTP-validated UTC)", "When it was produced"],
    ["machine_fingerprint", a.fp, "Device identification"],
    ["agent_id + jocky_build_hash", a.agent+" + "+a.build, "Manner of production"],
    ["data_hash (SHA-256)", a.dataHash, "Faithful reproduction"],
    ["collector_signature (Ed25519)", a.sig, "Certificate of authenticity"],
    ["parent_hash", a.parent, "Tamper detection (chain link)"],
  ].map(function(r){ return '<div>'+r[0]+'</div><div><span class="mono">'+esc(r[1])+'</span><br/><span class="tiny">'+r[2]+'</span></div>'; }).join("");
  return pageHead("Artifact Browser","Every artifact outputs signed JSON + hashes, with per-artifact integrity fields for BSA §63 admissibility (§8.4).",
      disBtn("export","Export JSON","UI.expDownload('json')","primary"))
    +'<div class="grid g52"><div class="card"><div class="head">'+ic("file",15)+' Artifact bundles <span class="sub">click to inspect integrity fields</span></div>'
    +'<div class="tbl-wrap"><table class="table"><thead><tr><th>ID</th><th>Type</th><th>Collected</th><th>Agent</th><th>data_hash</th><th>Verify</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>'
    +'<div class="card"><div class="head">'+ic("shield",15)+' '+a.id+' <span class="sub">'+a.t+'</span><span class="right">'+(a.verified?badge("signature valid","ok"):badge("invalid","bad"))+'</span></div>'
    +'<div class="body"><div class="kv">'+integ+'</div>'
    +'<h4 style="margin:12px 0 6px;font-size:12.5px">Content preview</h4><ul class="list-tight">'
    +a.preview.map(function(p){return '<li>'+esc(p)+'</li>';}).join("")+'</ul>'
    +'<div class="row mt">'+disBtn("export","Download signed JSON","UI.expDownload('json')","sm")+'<button class="btn sm" onclick="UI.go(\'chain\')">View in chain</button></div>'
    +'</div></div></div>';
}

function vIoc(){
  const q=S.iocQ.toLowerCase(), ty=S.iocType||"all";
  const types=["all","sha256","ipv4","domain","yara","registry","md5"];
  const list=DATA.iocs.filter(function(x){
    if(ty!=="all"&&x.type!==ty) return false;
    if(q&&(x.value+x.src+x.refs).toLowerCase().indexOf(q)<0) return false;
    return true;
  });
  const rows=list.map(function(x){
    return '<tr><td><span class="chip">'+x.type+'</span></td><td class="mono">'+esc(x.value)+'</td><td class="mini">'+esc(x.src)+'</td>'
      +'<td class="right-in-table"><b class="mono">'+x.hits+'</b></td><td class="mini mono">'+esc(x.refs)+'</td></tr>';
  }).join("") || '<tr><td colspan="5"><div class="empty">No IOCs match.</div></td></tr>';
  return pageHead("IOC Search","Sweep artifacts against IOC lists — file hashes, IPs, domains, YARA rules, registry paths (ioc_sweep.jky).",
      disBtn("export","Export STIX 2.1","UI.expDownload('stix')","primary"))
    +'<div class="card"><div class="body"><div class="row wrap">'
    +'<div class="searchbar">'+ic("search",14)+'<input placeholder="search value / source / ref…" value="'+esc(S.iocQ)+'" oninput="UI.iocQ(this.value)"/></div>'
    +'<select class="mission-select" onchange="UI.iocType(this.value)">'+types.map(function(t){return '<option value="'+t+'"'+(ty===t?" selected":"")+'>'+t+'</option>';}).join("")+'</select>'
    +'<span class="mini grow" style="text-align:right">'+list.length+' indicators</span></div></div>'
    +'<div class="tbl-wrap"><table class="table"><thead><tr><th>Type</th><th>Value</th><th>Found by</th><th style="text-align:right">Hits</th><th>Refs</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}

function vChain(){
  const arts=DATA.artifacts;
  const badIdx=3;
  const links=arts.map(function(a,i){
    const tampered=S.tampered&&i>=badIdx;
    return '<div class="lnk'+(tampered?" tampered":"")+'"><div class="box"><b>'+a.id+'</b>'
      +'<div class="tiny">'+a.t+' · '+a.when+'</div>'
      +'<div class="hash '+(tampered?"bad":"ok")+'">data '+(tampered?"✗ MISMATCH":"✓ "+a.dataHash)+'</div>'
      +'<div class="hash '+(tampered&&i===badIdx?"bad":"ok")+'">parent '+(i===0?"GENESIS":(tampered&&i===badIdx?"✗ expected "+arts[i-1].dataHash:"✓ "+a.parent))+'</div>'
      +'<div class="tiny mt">sig '+(tampered?"✗ unverifiable":"✓ ed25519")+'</div></div></div>';
  }).join("");
  return pageHead("Evidence Chain","Merkle-style parent_hash chain — inserting, deleting or modifying any artifact breaks the chain. The C2 server independently verifies on receipt.",
      S.tampered?'<button class="btn" onclick="UI.tamper()">Restore chain</button>':'<button class="btn danger" onclick="UI.tamper()">Simulate tampering</button>')
    +(S.tampered
      ?'<div class="callout bad">'+ic("alert",16)+'<div><b>Chain broken at ART-0004.</b> data_hash mismatch propagates: every descendant parent_hash fails, collector signatures stop verifying. C2 independent verification <b>rejects the bundle</b> — this is the tamper-evidence guarantee, demonstrated live.</div></div>'
      :'<div class="callout teal">'+ic("check",16)+'<div><b>C2 independent verification: PASS.</b> 6 bundles · parent_hash links intact · Ed25519 collector signatures valid · insertion/deletion/modification would break the chain.</div></div>')
    +'<div class="card"><div class="head">'+ic("chain",15)+' Hash chain <span class="sub">artifact #N.parent_hash → artifact #N-1.data_hash</span></div>'
    +'<div class="body"><div class="chain">'+links+'</div></div></div>'
    +'<div class="grid g2 mt"><div class="card pad"><h4>Verification procedure (C2 side)</h4><ol class="list-tight">'
    +'<li>Recompute <b>SHA-256</b> over each bundle body — compare <span class="mono">data_hash</span>.</li>'
    +'<li>Walk <span class="mono">parent_hash</span> links back to GENESIS — any gap rejects the session.</li>'
    +'<li>Verify <b>Ed25519</b> collector signatures against the agent mission key.</li>'
    +'<li>Cross-check <span class="mono">collection_timestamp</span> order + NTP skew bounds.</li></ol></div>'
    +'<div class="card pad"><h4>Legal mapping</h4><div class="mini">Chain + signatures feed the <b>§63 compliance certificate</b> (BSA 2023): faithful-and-accurate reproduction is proven by hash, manner of production by build + fingerprint, authenticity by countersignature.</div>'
    +'<div class="row mt"><button class="btn sm primary" onclick="UI.go(\'certificate\')">Open §63 certificate</button></div></div></div>';
}

function vCertificate(){
  const c=DATA.certificate;
  return pageHead("§63 Certificate","Auto-generated per mission under Bharatiya Sakshya Adhiniyam 2023 §63 (+ NIST SP 800-86, RFC 3227).",
      (c.signed?badge("signed & countersigned","ok"):badge("unsigned draft","warn"))+' '
      +disBtn("cert.sign","Sign certificate","UI.certSign()","primary"))
    +'<div class="doc"><div class="seal">Jocky<br/>Evidence<br/>Sealed</div>'
    +'<h2>Certificate of Electronic Records</h2><div class="subtitle">Bharatiya Sakshya Adhiniyam, 2023 · Section 63</div>'
    +'<table><tbody>'
    +'<tr><td>Mission</td><td>'+esc(c.mission)+'</td></tr>'
    +'<tr><td>Electronic records</td><td>'+esc(c.records)+' — artifact IDs ART-0001 … ART-0006 (hash chain §chain view)</td></tr>'
    +'<tr><td>Source devices</td><td class="hashline">'+esc(c.devices)+'</td></tr>'
    +'<tr><td>Manner of production</td><td>'+esc(c.production)+'</td></tr>'
    +'<tr><td>Integrity proof</td><td>'+esc(c.integrity)+'</td></tr>'
    +'<tr><td>Authenticity</td><td>'+esc(c.signature)+'</td></tr>'
    +'<tr><td>Standards</td><td>'+esc(c.law)+'</td></tr>'
    +'</tbody></table>'
    +'<p>I certify that the electronic records identified above are faithful and accurate reproductions of data collected from the named devices, produced in the ordinary course of forensic operation, and verified by cryptographic hash chain.</p>'
    +'<div class="sigline"><div class="sig"><div class="line">'+(c.signed?"ed25519:op-console-7f2a…c9 (operator)":"— unsigned —")+'</div>Operator (console)</div>'
    +'<div class="sig"><div class="line">'+(c.signed?"ed25519:mission-key-m2609…41 (agent)":"— unsigned —")+'</div>Agent mission key (countersign)</div></div>'
    +'</div>'
    +'<div class="row mt" style="justify-content:center;gap:8px">'+disBtn("cert.sign",c.signed?"Re-sign":"Sign certificate","UI.certSign()","")+'<button class="btn" onclick="UI.certDownload()">'+ic("dl",14)+' Download certificate</button></div>';
}

function vExports(){
  const cards=DATA.exports.map(function(e){
    return '<div class="card pad"><h3 style="font-size:14px">'+e.name+'</h3><div class="mini" style="margin:6px 0">'+e.use+'</div>'
      +'<div class="mb">'+badge(e.note,"info")+'</div>'
      +'<div class="row">'+disBtn("export","Download","UI.expDownload('"+e.id+"')","sm primary")+'</div></div>';
  }).join("");
  return pageHead("Report Exports","Native JSON for SIEM ingestion, CSV for analysts, STIX 2.1 for threat-intel sharing, bodyfile for timeline tools (§8.4).")
    +'<div class="grid g4">'+cards+'</div>'
    +'<div class="callout info mt">'+ic("info",16)+'<div>Exports are generated from verified, chain-checked artifacts only. Quarantined bundles (A-3C19) are excluded until the anomaly hold is cleared.</div></div>';
}

/* ================= CONSOLE ================= */
function vTransport(){
  const use={}; DATA.agents.forEach(function(a){ if(DATA.transportProfiles.some(function(p){return p.id===a.transport;})) use[a.transport]=(use[a.transport]||0)+1; });
  const cards=DATA.transportProfiles.map(function(p){
    return '<div class="card pad"><div class="row"><h3 class="mono" style="font-size:14px">'+p.id+'</h3><span style="margin-left:auto"></span>'+badge((use[p.id]||0)+" agents","teal")+'</div>'
      +'<div class="mini" style="margin:6px 0"><b>'+esc(p.svc)+'</b></div>'
      +'<div class="code">https://'+esc(p.ep)+'</div>'
      +'<div class="tiny mt">'+esc(p.pattern)+'</div></div>';
  }).join("");
  const tokRows=DATA.missions.map(function(m){
    return '<tr><td class="mono"><b>'+m.id+'</b><span class="sub">'+esc(m.name)+'</span></td><td class="mono">'+esc(m.token.profile)+'</td>'
      +'<td class="mono mini">'+esc(m.token.account)+'</td><td class="mini">'+esc(m.token.perms)+'</td>'
      +'<td>'+(/expir|revok/.test(m.token.expires)?badge(m.token.expires,"warn"):badge(m.token.expires,"ok"))+'</td>'
      +'<td class="right-in-table">'+disBtn("mission.crud","Rotate","UI.rotateToken('"+m.id+"')","xs")+'</td></tr>';
  }).join("");
  const notes=DATA.transportNotes.map(function(n){return '<div class="callout info">'+ic("info",16)+'<div>'+esc(n)+'</div></div>';}).join("");
  return pageHead("Transport & Tokens","Legitimate cloud-storage APIs carry tasking + results as encrypted blobs. Owned TLS stack supplies JA3/JA4 browser mimicry (N2) on every profile (§8.3).")
    +'<div class="grid g4">'+cards+'</div>'
    +'<div class="grid g2 mt"><div class="card"><div class="head">'+ic("globe",15)+' How it works</div><div class="body"><ol class="list-tight">'
    +'<li>Operator provisions a <b>per-mission storage account</b> (Drive / Blob / S3) before the mission.</li>'
    +'<li>Agent uploads forensic results as <b>encrypted blobs</b>.</li>'
    +'<li>C2 polls (or consumes event notifications) and pulls results.</li>'
    +'<li>Tasking is delivered as <b>encrypted blobs in the same account</b> — agent polls for updates.</li></ol>'
    +'<div class="tiny mt">TLS PROFILES (ROTATING, OWNED STACK)</div><div class="tag-row mt">'+DATA.tlsProfiles.map(function(t){return '<span class="chip">'+t+'</span>';}).join("")+'</div></div></div>'
    +'<div><div class="card"><div class="head">'+ic("key",15)+' Per-mission tokens <span class="sub">least-privilege · auto-expiry</span></div>'
    +'<div class="tbl-wrap"><table class="table"><thead><tr><th>Mission</th><th>Profile</th><th>Account</th><th>Permissions</th><th>Expiry</th><th></th></tr></thead><tbody>'+tokRows+'</tbody></table></div></div>'
    +'<div class="mt">'+notes+'</div></div></div>';
}

function vAudit(){
  const cats=["all","auth","mission","tasking","privilege","integrity","build"];
  const list=DATA.audit.filter(function(x){
    if(S.auditCat!=="all"&&x.cat!==S.auditCat) return false;
    if(S.auditQ&&(x.actor+x.act+x.detail).toLowerCase().indexOf(S.auditQ.toLowerCase())<0) return false;
    return true;
  });
  const rows=list.map(function(x){
    const kc={auth:"info",mission:"teal",tasking:"violet",privilege:"warn",integrity:"ok",build:"mut"}[x.cat]||"mut";
    return '<tr><td class="mono" style="white-space:nowrap">'+x.t+'</td><td class="mono">'+esc(x.actor)+'</td>'
      +'<td>'+badge(x.act,kc)+'</td><td class="mini">'+esc(x.detail)+'</td><td class="mono mini">sig '+x.sig+'</td></tr>';
  }).join("");
  return pageHead("Audit Log","Append-only JSON Lines, signed per entry — every login, task, escalation approval, blind() invocation and data access recorded (§8.2).",
      '<button class="btn" onclick="UI.dlAudit()">'+ic("dl",14)+' Download JSONL</button>')
    +'<div class="card"><div class="body"><div class="row wrap">'
    +'<div class="searchbar">'+ic("search",14)+'<input placeholder="search actor / action / detail…" value="'+esc(S.auditQ)+'" oninput="UI.auditQ(this.value)"/></div>'
    +'<select class="mission-select" onchange="UI.auditCat(this.value)">'+cats.map(function(c){return '<option value="'+c+'"'+(S.auditCat===c?" selected":"")+'>'+c+'</option>';}).join("")+'</select>'
    +'<span class="mini grow" style="text-align:right">'+list.length+' entries · tamper-evident, signed per entry</span></div></div>'
    +'<div class="tbl-wrap"><table class="table"><thead><tr><th>Time (UTC)</th><th>Actor</th><th>Action</th><th>Detail</th><th>Signature</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}

function vUsers(){
  const rc={operator:"var(--accent)",analyst:"var(--blue)",readonly:"var(--faint)"};
  const urows=DATA.users.map(function(u){
    return '<tr><td><b>'+esc(u.name)+(u.svc?' <span class="tiny">(service)</span>':"")+'</b><span class="sub mono">'+esc(u.handle)+'</span></td>'
      +'<td><span class="badge" style="border:1px solid '+rc[u.role]+';color:'+rc[u.role]+'">'+u.role+'</span></td>'
      +'<td class="mini">'+esc(u.scope)+'</td><td class="mini">'+esc(u.last)+'</td>'
      +'<td>'+(u.jwtExp==="expired"?badge("expired","bad"):badge("jwt "+u.jwtExp,"ok"))+'</td>'
      +'<td class="right-in-table">'+disBtn("users.manage","Revoke","UI.revoke('"+u.id+"')","xs danger")+'</td></tr>';
  }).join("");
  const mx=DATA.roleMatrix.map(function(r){
    function cell(v){ return '<td style="text-align:center">'+(v?'<span style="color:var(--ok)">●</span>':'<span style="color:var(--faint)">○</span>')+'</td>'; }
    return '<tr><td class="mini">'+r[0]+'</td>'+cell(r[1])+cell(r[2])+cell(r[3])+'</tr>';
  }).join("");
  return pageHead("Users & Roles","JWT tokens with three RBAC roles — operator (full), analyst (read + L0 tasks), readonly (observe). Switch the active identity any time.",
      disBtn("users.manage","＋ Invite user","UI.userAdd()","primary"))
    +'<div class="card mb"><div class="head">'+ic("users",15)+' Active session <span class="sub">click a card to switch identity</span></div><div class="body"><div class="grid g3">'
    +Object.keys(DATA.roles).map(function(r){
      const on=S.user.role===r;
      return '<button class="rolecard'+(on?" on":"")+'" onclick="UI.setRole(\''+r+'\')"><span class="ric" style="color:'+rc[r]+'">'+ic(r==="operator"?"key":(r==="analyst"?"eye":"users"),17)+'</span>'
        +'<span><b>'+DATA.roles[r].label+(on?" · you":"")+'</b><div class="tiny">'+DATA.roles[r].blurb+'</div></span></button>';
    }).join("")+'</div></div></div>'
    +'<div class="grid g52"><div class="card"><div class="head">'+ic("users",15)+' Accounts & sessions</div>'
    +'<div class="tbl-wrap"><table class="table"><thead><tr><th>Account</th><th>Role</th><th>Scope</th><th>Last seen</th><th>JWT</th><th></th></tr></thead><tbody>'+urows+'</tbody></table></div></div>'
    +'<div class="card"><div class="head">'+ic("lock",15)+' Role matrix</div>'
    +'<div class="tbl-wrap"><table class="table"><thead><tr><th></th><th style="text-align:center">oper.</th><th style="text-align:center">anal.</th><th style="text-align:center">read</th></tr></thead><tbody>'+mx+'</tbody></table></div></div></div>';
}

const FULL_CHECKS=[
  ["S1","Byte-pattern signatures","Custom emitter + per-build polymorphism + instruction substitution"],
  ["S2","Hash matching","Per-build seed → unique SHA-256 every build"],
  ["S3","Fuzzy hashing (ssdeep/TLSH)","Structural diversity; runtime itself polymorphized; implementations rotated"],
  ["S4/S5","Import table + import hash","Fully dynamic resolution (PEB-walk hash lookup); degenerate imphash"],
  ["S6","String analysis","All literals encrypted, per-build key; decrypt at use; stack buffers zeroed"],
  ["S7","Entropy analysis","No whole-binary packing; per-section entropy balanced (~6.0–6.5 .text)"],
  ["S8","PE/ELF structure anomalies","Forged toolchain profiles (Rich header, linker, layout, load-config/CFG, build-id), rotated"],
  ["B1","User-mode API hooking","Indirect syscalls (SSN resolution), clean syscall;ret — ambient"],
  ["B4","Process-creation telemetry","Zero-incidental-child invariant; children only where the script names them"],
  ["B6","RWX anomalies","No-W+X invariant: RW → write → flip RX; file-backed sections"],
  ["B7","Unbacked memory execution","File-backed execution only (stomp / ghost / herpaderp / doppelgänging)"],
  ["B8","Thread start-address validation","No new threads where allowed (APC/hijack); else start inside legit module"],
  ["B9","Stack-spoofing detection","Compiler-inserted synthetic frames from signed modules (CET caveat §11)"],
  ["B11","AMSI","Inapplicable by construction: native code, no hosted script engine"],
  ["N2","TLS fingerprinting (JA3/JA4)","Owned TLS stack; rotating browser ClientHello profiles; JA3S inherits CDN"],
];
function vScope(){
  const full=FULL_CHECKS.map(function(r){
    return '<tr><td class="mono"><b>'+r[0]+'</b></td><td class="mini"><b>'+r[1]+'</b></td><td class="mini">'+r[2]+'</td><td>'+badge("owned","ok")+'</td></tr>';
  }).join("");
  const des=DATA.descopes.map(function(r){
    return '<tr><td class="mini"><b>'+r[0]+'</b></td><td class="mini">'+r[1]+'</td><td>'+badge("accepted","warn")+'</td></tr>';
  }).join("");
  return pageHead("Scope Map","What the language guarantees (§2.1), what it deliberately does not build (§2.2), and the PS-mandated exceptions (§2.3).")
    +'<div class="card mb"><div class="head">'+ic("shield",15)+' §2.1 In scope — language-owned (FULL checks) <span class="sub">guaranteed for every program</span></div>'
    +'<div class="tbl-wrap"><table class="table"><thead><tr><th>#</th><th>Check neutralized</th><th>Owning mechanism</th><th></th></tr></thead><tbody>'+full+'</tbody></table></div></div>'
    +'<div class="card mb"><div class="head">'+ic("eye",15)+' §2.2 Descoped — no evasion functionality built (PARTIAL checks) <span class="sub">semantic footprint accepted & documented</span></div>'
    +'<div class="tbl-wrap"><table class="table"><thead><tr><th>Check</th><th>What remains (accepted)</th><th></th></tr></thead><tbody>'+des+'</tbody></table></div></div>'
    +'<div class="grid g2"><div class="card pad"><h4>§2.3 PS-mandated exceptions (kept despite §2.2)</h4><ol class="list-tight">'
    +'<li><b>Multi-vector in-memory execution</b> (PS 3A) — the §6.1 execution substrate, script-addressable vectors.</li>'
    +'<li><b>Kernel subversion via BYOVD</b> (PS 3B) — the §6.2 sensor-blinding module, gated behind L1→L2, exposed as <span class="mono">blind()</span>.</li></ol>'
    +'<div class="row mt"><button class="btn sm" onclick="UI.go(\'blinding\')">Open jrt-blind</button></div></div>'
    +'<div class="card pad"><h4>§2.4 Out of scope entirely</h4><ul class="list-tight">'
    +'<li>Initial access / exploitation for bootstrap (operator interface only).</li>'
    +'<li>Target-specific kernel-CVE exploits (fail version-independence).</li>'
    +'<li>Hypervisor / bootkit / SMM / DMA / BMC-class techniques.</li>'
    +'<li>HVCI <i>evasion</i> — HVCI is probed and degrades blinding gracefully.</li></ul></div></div>';
}

function vLanguage(){
  const verbs=DATA.verbs.map(function(v){
    return '<tr><td class="mono"><b>'+esc(v.sig)+'</b></td><td>'+privBadge(v.priv.split(" ")[0])+'<span class="sub">'+esc(v.priv)+'</span></td><td class="mini">'+esc(v.note)+'</td></tr>';
  }).join("");
  const dec=DATA.decisions.map(function(d){
    return '<tr><td class="mini"><b>'+d[0]+'</b><span class="sub">priv: '+esc(d[1])+' · unpriv: '+esc(d[2])+'</span></td>'
      +'<td>'+badge(d[3].indexOf("Equal")===0?"equal":"conditional","ok")+'<span class="sub">'+esc(d[3])+'</span></td><td class="mini">'+esc(d[4])+'</td></tr>';
  }).join("");
  const vec=DATA.vectors.map(function(v){
    return '<tr><td class="mini"><b>'+v[0]+'</b></td><td class="mini">'+v[1]+'</td><td class="mini">'+v[2]+'</td><td class="mini">'+v[3]+'</td></tr>';
  }).join("");
  const scr=DATA.scripts.map(function(s){
    return '<tr><td class="mono">'+s.n+'</td><td class="mono"><b>'+s.file+'</b></td><td class="mini">'+s.desc+'</td>'
      +'<td>'+privBadge(s.priv.split(" ")[0])+'<span class="sub">'+s.priv+'</span></td><td>'+(s.plat==="Both"?badge("both","teal"):badge(s.plat,"info"))+'</td><td class="mono mini">'+s.eff+'</td></tr>';
  }).join("");
  return pageHead("Language & Scripts","JOCKY verbs, pipeline syntax, the effect/privilege type system, the §4 equal-capability table, execution vectors and the 15-script standard library.")
    +'<div class="grid g2 mb"><div class="card"><div class="head">'+ic("term",15)+' Verb palette (§7) <span class="sub">effect-typed, privilege-annotated</span></div>'
    +'<div class="tbl-wrap"><table class="table"><thead><tr><th>Signature</th><th>MinPriv</th><th>Note</th></tr></thead><tbody>'+verbs+'</tbody></table></div></div>'
    +'<div><div class="card"><div class="head">'+ic("chain",15)+' Pipeline syntax</div><div class="body">'
    +'<div class="code"><span class="c">// artifacts are the unit of tasking</span>\n<span class="k">artifact</span> host_triage {\n  requires <span class="n">L0</span>\n  emits   processes, services, drivers,\n          scheduled_tasks, autoruns\n}\n\ncollect proc_meta | filter(parent == <span class="s">"cmd.exe"</span>) | timeline | upload</div></div></div>'
    +'<div class="callout bad">'+ic("lock",16)+'<div><b>No verbs exist for:</b> raw syscalls · FFI · inline asm · arbitrary library loading · disabling sensors outside <span class="mono">blind()</span>. Evasion "cleverness" is <b>not</b> script-authorable — that is the point.</div></div></div></div>'
    +'<div class="card mb"><div class="head">'+ic("layers",15)+' §4 Unprivileged-when-exactly-equal <span class="sub">"equal" = identical output data, never stealth alone</span></div>'
    +'<div class="tbl-wrap"><table class="table"><thead><tr><th>Operation</th><th>Equal?</th><th>Decision</th></tr></thead><tbody>'+dec+'</tbody></table></div>'
    +'<div class="body"><div class="callout warn">'+ic("alert",16)+'<div><b>Not equal → privileged form mandatory:</b> '+esc(DATA.decisionsNotEqual)+'</div></div></div></div>'
    +'<div class="card mb"><div class="head">'+ic("bolt",15)+' §6.1 Execution substrate <span class="sub">PS 3A multi-vector in-memory — all through the no-W+X, file-backed allocator</span></div>'
    +'<div class="tbl-wrap"><table class="table"><thead><tr><th>Vector</th><th>Windows</th><th>Linux</th><th>Selected when</th></tr></thead><tbody>'+vec+'</tbody></table></div></div>'
    +'<div class="card"><div class="head">'+ic("book",15)+' Standard forensic script library <span class="sub">15 × .jky · compiled through the full polymorphic pipeline · composable via |</span></div>'
    +'<div class="tbl-wrap"><table class="table"><thead><tr><th>#</th><th>Script</th><th>Description</th><th>MinPriv</th><th>Platform</th><th>Effect</th></tr></thead><tbody>'+scr+'</tbody></table></div></div>';
}

function vHonesty(){
  const items=DATA.honesty.map(function(h){
    return '<div class="callout warn">'+ic("alert",16)+'<div><b>'+h[0]+'.</b> '+h[1]+'</div></div>';
  }).join("");
  return pageHead("Honesty Annex","Explicit non-claims — stated, not hidden (§11). The deliverable includes this page.")
    +items
    +'<div class="callout teal">'+ic("shield",16)+'<div><b>P5 — adaptive-detector honesty.</b> No claim of permanent invisibility. The guarantee is economic: re-randomization is one CI iteration, so any signature written against a build decays faster than the cost of writing it.</div></div>';
}

/* ================= UI CONTROLLER ================= */
const VIEWS={ dashboard:vDashboard, agents:vAgents, missions:vMissions, tasks:vTasks,
  escalate:vEscalate, blinding:vBlinding, build:vBuild, invariants:vInvariants,
  verification:vVerification, timeline:vTimeline, artifacts:vArtifacts, ioc:vIoc,
  chain:vChain, certificate:vCertificate, exports:vExports, transport:vTransport,
  audit:vAudit, users:vUsers, scope:vScope, language:vLanguage, honesty:vHonesty };

const UI={
  go:function(v){ S.view=v; renderShell(); window.scrollTo(0,0); },
  setMission:function(id){ S.mission=id; DATA.audit.unshift({t:"2026-09-29 09:58:00Z",actor:S.user.handle,act:"CONTEXT_SWITCH",detail:"active mission → "+id,sig:"new…",cat:"mission"}); renderShell(); toast("Mission context → <b>"+id+"</b>."); },
  setRole:function(r){ S.user={name:{operator:"R. Menon",analyst:"S. Iyer",readonly:"D. Bose"}[r],handle:{operator:"r.menon",analyst:"s.iyer",readonly:"d.bose"}[r],role:r};
    DATA.audit.unshift({t:"2026-09-29 09:58:00Z",actor:S.user.handle,act:"LOGIN",detail:"JWT issued · role="+r+" (demo switch)",sig:"new…",cat:"auth"});
    renderShell(); toast("Active identity → <b>"+r+"</b>. Permissions updated."); },
  toggleTheme:function(){
    S.theme = S.theme==="light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", S.theme);
    try{ localStorage.setItem("jocky-theme", S.theme); }catch(e){}
    const b=document.getElementById("themeBtn");
    if(b) b.innerHTML=ic(S.theme==="light"?"moon":"sun",15);
    toast("Theme \u2192 <b>"+S.theme+"</b> mode.");
  },
  switchUser:function(){
    openModal("Switch identity",
      Object.keys(DATA.roles).map(function(r){
        return '<button class="rolecard mb'+(S.user.role===r?" on":"")+'" onclick="UI.setRole(\''+r+'\');closeModal()"><span class="ric">'+ic("users",16)+'</span><span><b>'+DATA.roles[r].label+'</b><div class="tiny">'+DATA.roles[r].blurb+'</div></span></button>';
      }).join(""),
      {icon:"users",foot:'<button class="btn ghost" onclick="closeModal()">Cancel</button>'});
  },
  alertGo:function(a){
    if(a==="Review bundle") UI.openAgent("A-3C19");
    else if(a==="Rotate token") UI.go("transport");
    else if(a==="View blinding") UI.go("blinding");
    else if(a==="View agent") UI.openAgent("A-6A93");
    else if(a==="Open chain") UI.go("chain");
    else if(a==="View build") UI.go("build");
  },
  openAgent:function(id){ UI_openAgent(id); },
  openMission:function(id){ UI_openMission(id); },
  newMission:function(id){ UI_newMission(id); },
  doNewMission:function(id){ UI_doNewMission(id); },
  schedToggle:function(m,s){ UI_schedToggle(m,s); UI_openMission(m); },
  dispatchTask:function(a){ UI_dispatchTask(a); },
  doDispatch:function(){ UI_doDispatch(); },
  agentQ:function(v){ S.agentFilter.q=v; renderView(); const el=document.querySelector(".searchbar input"); if(el){el.focus(); el.setSelectionRange(el.value.length,el.value.length);} },
  agentF:function(k,v){ S.agentFilter[k]=v; renderView(); },
  taskF:function(f){ S.taskFilter=f; renderView(); },
  approveTask:function(id){ UI_approveTask(id); },
  bumpTask:function(id,d){ UI_bumpTask(id,d); },
  cancelTask:function(id){ UI_cancelTask(id); },
  escalateRun:function(a){ UI_escalateRun(a); },
  newModule:function(){ UI_newModule(); },
  doNewModule:function(){ UI_doNewModule(); },
  doEscalate:function(a){ UI_doEscalate(a); },
  decommission:function(a){ UI_decommission(a); },
  doDecommission:function(a){ UI_doDecommission(a); },
  blindRun:function(a){ UI_blindRun(a); },
  doBlind:function(){ UI_doBlind(); },
  buildSel:function(id){ S.buildId=id; renderView(); },
  artSel:function(id){ S.artId=id; renderView(); },
  tlQ:function(v){ S.tlQ=v; renderView(); const el=document.querySelector(".searchbar input"); if(el){el.focus(); el.setSelectionRange(el.value.length,el.value.length);} },
  tlSrc:function(v){ S.tlSrc=v; renderView(); },
  iocQ:function(v){ S.iocQ=v; renderView(); const el=document.querySelector(".searchbar input"); if(el){el.focus(); el.setSelectionRange(el.value.length,el.value.length);} },
  iocType:function(v){ S.iocType=v; renderView(); },
  auditQ:function(v){ S.auditQ=v; renderView(); const el=document.querySelector(".searchbar input"); if(el){el.focus(); el.setSelectionRange(el.value.length,el.value.length);} },
  auditCat:function(v){ S.auditCat=v; renderView(); },
  tamper:function(){ S.tampered=!S.tampered; renderView(); toast(S.tampered?"Tamper simulated — watch the chain break.":"Chain restored — verification passes."); },
  certSign:function(){
    if(!can("cert.sign")){ toast("Signing requires role: <b>operator</b>.","bad"); return; }
    DATA.certificate.signed=true;
    DATA.audit.unshift({t:"2026-09-29 09:59:00Z",actor:S.user.handle,act:"CERT_SIGN",detail:"§63 certificate signed for "+S.mission+" (countersigned by agent mission key)",sig:"new…",cat:"integrity"});
    renderView(); toast("§63 certificate <b>signed</b> and countersigned.");
  },
  certDownload:function(){
    const c=DATA.certificate;
    download("Jocky-63-certificate-"+S.mission+".txt",
      "CERTIFICATE OF ELECTRONIC RECORDS\nBharatiya Sakshya Adhiniyam, 2023 - Section 63\n\nMission: "+c.mission+"\nRecords: "+c.records+"\nDevices: "+c.devices+"\nProduction: "+c.production+"\nIntegrity: "+c.integrity+"\nAuthenticity: "+c.signature+"\nStandards: "+c.law+"\nStatus: "+(c.signed?"SIGNED + countersigned":"UNSIGNED DRAFT")+"\n");
    toast("Certificate downloaded.");
  },
  expDownload:function(fmt){
    if(!can("export")){ toast("Exports require role: <b>operator / analyst</b>.","bad"); return; }
    if(fmt==="json") download("jocky-artifacts-"+S.mission+".json", JSON.stringify(DATA.artifacts.map(function(a){return{artifact_id:a.id,type:a.t,collection_timestamp:a.when,machine_fingerprint:a.fp,agent_id:a.agent,jocky_build_hash:a.build,data_hash:a.dataHash,collector_signature:a.sig,parent_hash:a.parent};}),null,2), "application/json");
    else if(fmt==="csv") download("jocky-timeline-"+S.mission+".csv", "timestamp,source,type,detail,entry_hash\n"+DATA.timeline.map(function(t){return '"'+t.ts+'","'+t.src+'","'+t.type+'","'+t.detail.replace(/"/g,'""')+'","'+t.hash+'"';}).join("\n"), "text/csv");
    else if(fmt==="stix") download("jocky-iocs-"+S.mission+".stix2.json", JSON.stringify({type:"bundle",id:"bundle--jocky-"+S.mission,spec_version:"2.1",objects:DATA.iocs.map(function(x,i){return{type:"indicator",id:"indicator--jocky-"+i,pattern:"["+x.type+" = '"+x.value+"']",labels:["malicious-activity"],description:"Found by "+x.src+" · refs "+x.refs};})},null,2), "application/json");
    else download("jocky-timeline-"+S.mission+".bodyfile", DATA.timeline.map(function(t){return "0|"+t.detail.replace(/\|/g," ")+" ("+t.type+")|0|0|0|0|"+Date.parse(t.ts)/1000+"|0|0|0";}).join("\n"), "text/plain");
    DATA.audit.unshift({t:"2026-09-29 09:59:00Z",actor:S.user.handle,act:"EXPORT",detail:fmt+" export generated for "+S.mission,sig:"new…",cat:"integrity"});
    toast("Export generated (<b>"+fmt+"</b>) from verified artifacts.");
  },
  dlAudit:function(){
    download("jocky-audit.jsonl", DATA.audit.map(function(x){return JSON.stringify(x);}).join("\n"), "application/jsonl");
    toast("Audit log downloaded (JSONL, signed per entry).");
  },
  rotateToken:function(mid){
    if(!can("mission.crud")){ toast("Token rotation requires role: <b>operator</b>.","bad"); return; }
    const m=missionById(mid); m.token.expires="+72h (rotated 09:59Z)";
    DATA.audit.unshift({t:"2026-09-29 09:59:00Z",actor:S.user.handle,act:"TOKEN_ROTATE",detail:"per-mission token renewed: "+mid+" ("+m.token.profile+")",sig:"new…",cat:"mission"});
    renderView(); toast("Token rotated for <b>"+mid+"</b> — old token revoked.");
  },
  revoke:function(uid){
    if(!can("users.manage")){ toast("User management requires role: <b>operator</b>.","bad"); return; }
    const u=DATA.users.find(function(x){return x.id===uid;}); if(u) u.jwtExp="expired";
    DATA.audit.unshift({t:"2026-09-29 09:59:00Z",actor:S.user.handle,act:"TOKEN_REVOKE",detail:"JWT revoked: "+(u?u.handle:uid),sig:"new…",cat:"auth"});
    renderView(); toast("Session revoked.");
  },
  userAdd:function(){
    if(!can("users.manage")){ toast("User management requires role: <b>operator</b>.","bad"); return; }
    openModal("Invite user",
      '<div class="field"><label>Name</label><input class="input" id="nuName" value="New Analyst"/></div>'
      +'<div class="grid g2"><div class="field"><label>Handle</label><input class="input mono" id="nuHandle" value="n.analyst"/></div>'
      +'<div class="field"><label>Role</label><select class="input" id="nuRole"><option>analyst</option><option>readonly</option><option>operator</option></select></div></div>',
      {icon:"users",foot:'<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="UI.doUserAdd()">Issue JWT</button>'});
  },
  doUserAdd:function(){
    const h=document.getElementById("nuHandle").value||"n.user";
    DATA.users.push({id:"u-"+(10+DATA.users.length),name:document.getElementById("nuName").value,handle:h,role:document.getElementById("nuRole").value,last:"—",jwtExp:"12h",scope:"assigned on first login"});
    DATA.audit.unshift({t:"2026-09-29 09:59:00Z",actor:S.user.handle,act:"USER_INVITE",detail:h+" invited",sig:"new…",cat:"auth"});
    closeModal(); renderView(); toast("User invited — JWT issued.");
  },
};

window.UI=UI; window.closeModal=closeModal; window.closeDrawer=closeDrawer;
renderShell();
