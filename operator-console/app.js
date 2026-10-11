/* ============================================================
   Jocky — Central Management Console (demo)
   app.js — core shell, router, helpers + Operate & Privilege views.
   Plain vanilla JS (per §8.2: "no heavy framework").
   ============================================================ */
"use strict";

/* ---------------- icons (inline SVG, no external assets) ---------------- */
const ICONS = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  cpu:'<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  queue:'<path d="M4 6h16M4 12h16M4 18h10"/>',
  key:'<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2 20 3M15 6l3 3M18 9l2 2"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  hammer:'<path d="M14 4l6 6-2 2-6-6zM12 6L4 14l4 4 8-8M4 14l-1 5 5-1"/>',
  box:'<path d="M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>',
  shield:'<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/><path d="M9 12l2 2 4-4"/>',
  check:'<path d="M4 12.5l5 5L20 6.5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  file:'<path d="M6 2h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path d="M14 2v4h4"/>',
  chain:'<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7L12.5 19"/>',
  cert:'<circle cx="12" cy="9" r="6"/><path d="M8.5 13.5 7 22l5-3 5 3-1.5-8.5"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18"/>',
  log:'<path d="M6 2h12a1 1 0 0 1 1 1v18l-3-2-3 2-3-2-3 2-3-2-2 1V3a1 1 0 0 1 1-1z"/><path d="M9 7h6M9 11h6"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5 6.5-5s5.7 1.5 6.5 5M16 4.5a3.5 3.5 0 0 1 0 7M17.5 15.2c2 .6 3.5 2 4 4.8"/>',
  alert:'<path d="M12 3 2.5 19.5h19zM12 9v5M12 17.5v.5"/>',
  book:'<path d="M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19a2 2 0 0 0 2 2h13"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  play:'<path d="M7 4l13 8-13 8z"/>',
  lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  up:'<path d="M12 19V5M6 11l6-6 6 6"/>',
  down:'<path d="M12 5v14M6 13l6 6 6-6"/>',
  bolt:'<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>',
  net:'<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M8 7.5l3 8M16 7.5l-3 8M8.5 6h7"/>',
  dl:'<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  send:'<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>',
  refresh:'<path d="M20 12a8 8 0 1 1-2.3-5.6M20 3v5h-5"/>',
  layers:'<path d="M12 2 2 8l10 6 10-6zM2 14l10 6 10-6"/>',
  term:'<path d="M4 17l6-6-6-6M12 19h8"/>',
  moon:'<path d="M20 13A8 8 0 1 1 11 4a6.5 6.5 0 0 0 9 9z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
};
function ic(n, s){ return '<svg width="'+(s||16)+'" height="'+(s||16)+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+ICONS[n]+'</svg>'; }

/* ---------------- utils ---------------- */
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function badge(t, kind){ return '<span class="badge '+(kind||"mut")+'">'+t+'</span>'; }
function privBadge(p){
  if(!p) return "";
  if(p.indexOf("L2")===0||p==="L2") return badge("L2 · kernel","l2");
  if(p.indexOf("L1")===0||p==="L1") return badge("L1 · admin","l1");
  return badge("L0 · user","l0");
}
function statusBadge(s){
  if(s==="online") return badge('<span class="bdot"></span>online',"ok");
  if(s==="away") return badge('<span class="bdot"></span>away',"warn");
  return badge('<span class="bdot"></span>offline',"mut");
}
function stateBadge(s){
  if(s==="executing") return badge("executing","teal");
  if(s==="queued") return badge("queued","info");
  if(s==="complete") return badge("complete","ok");
  if(s.indexOf("blocked")===0) return badge(s,"warn");
  return badge(s,"mut");
}
function agentById(id){ return DATA.agents.find(function(a){return a.id===id;}); }
function missionById(id){ return DATA.missions.find(function(m){return m.id===id;}); }
function privRank(p){
  if(!p) return 0;
  if(/^L2/.test(p)) return 2;
  if(/^L1/.test(p)) return 1;
  return 0;
}
function scriptRank(priv){
  if(!priv) return 0;
  if(/L2/.test(priv)) return 2;
  if(/(^|\s)L1/.test(priv)) return 1;
  return 0;
}
function agentRank(a){ return a.priv==="L2"?2:(a.priv==="L1"?1:0); }
function shortHash(h){ return h; }

/* ---------------- permissions (RBAC, §8.2) ---------------- */
const PERMS = {
  "mission.crud":   ["operator"],
  "task.l0":        ["operator","analyst"],
  "task.l1":        ["operator"],
  "escalate.run":   ["operator"],
  "blind.run":      ["operator"],
  "decommission":   ["operator"],
  "export":         ["operator","analyst"],
  "cert.sign":      ["operator"],
  "users.manage":   ["operator"],
};
function can(p){ return PERMS[p].indexOf(S.user.role)>=0; }
function needRoles(p){ return PERMS[p].join(" / "); }
function disBtn(p, label, onclick, cls){
  if(can(p)) return '<button class="btn '+(cls||"")+'" onclick="'+onclick+'">'+label+'</button>';
  return '<button class="btn '+(cls||"")+'" disabled title="Requires role: '+needRoles(p)+' (you are '+S.user.role+')">'+label+'</button>';
}

/* ---------------- toast / modal / drawer ---------------- */
function toast(msg, kind){
  const box = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = "toast "+(kind||"");
  el.innerHTML = ic(kind==="bad"?"alert":(kind==="warn"?"alert":"check"),15)+"<span>"+msg+"</span>";
  box.appendChild(el);
  setTimeout(function(){ el.style.opacity="0"; el.style.transition="opacity .4s"; setTimeout(function(){el.remove();},400); }, 4200);
}
function openModal(title, body, opts){
  closeModal();
  opts = opts||{};
  const scrim = document.createElement("div");
  scrim.className = "modal-scrim"; scrim.id = "mscrim";
  scrim.innerHTML = '<div class="modal'+(opts.wide?" wide":"")+'" role="dialog">'
    +'<div class="mhead">'+ic(opts.icon||"info",16)+'<h3>'+title+'</h3>'
    +'<span style="margin-left:auto"></span><button class="btn ghost sm" onclick="closeModal()">'+ic("x",14)+'</button></div>'
    +'<div class="mbody">'+body+'</div>'
    +(opts.foot?'<div class="mfoot">'+opts.foot+'</div>':"")
    +'</div>';
  scrim.addEventListener("click", function(e){ if(e.target===scrim) closeModal(); });
  document.body.appendChild(scrim);
}
function closeModal(){ const m=document.getElementById("mscrim"); if(m) m.remove(); }
function openDrawer(title, body){
  closeDrawer();
  const d = document.createElement("div");
  d.className = "drawer"; d.id = "drawer";
  d.innerHTML = '<div class="scrim" onclick="closeDrawer()"></div>'
    +'<div class="dhead"><h3 style="font-size:15px">'+title+'</h3>'
    +'<span style="margin-left:auto"></span><button class="btn ghost sm" onclick="closeDrawer()">'+ic("x",14)+'</button></div>'
    +'<div class="dbody">'+body+'</div>';
  document.body.appendChild(d);
  requestAnimationFrame(function(){ d.classList.add("open"); d.querySelector(".scrim").classList.add("on"); });
}
function closeDrawer(){ const d=document.getElementById("drawer"); if(d) d.remove(); }
function download(name, content, mime){
  const b = new Blob([content], {type: mime||"text/plain"});
  const u = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href=u; a.download=name; document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(u); a.remove(); }, 800);
}

/* ---------------- state ---------------- */
const S = {
  user: { name:"R. Menon", handle:"r.menon", role:"operator" },
  mission: "M-2609",
  view: "dashboard",
  agentFilter: { q:"", plat:"all", priv:"all", st:"all" },
  taskFilter: "all",
  auditQ: "", auditCat: "all",
  tlQ: "", tlSrc: "all",
  iocQ: "",
  agentId: null,
  missionId: null,
  buildId: "b-81d4",
  artId: "ART-0001",
  tampered: false,
  feed: [],
  feedN: 9048,
  wsTick: 0,
  theme: "dark",
};
try{ const __t=localStorage.getItem("jocky-theme"); if(__t==="light"||__t==="dark") S.theme=__t; }catch(e){}
document.documentElement.setAttribute("data-theme", S.theme);

const NAV = [
  { group:"Operate", items:[
    ["dashboard","Dashboard","grid"],
    ["agents","Agents & Probes","cpu"],
    ["missions","Missions","target"],
    ["tasks","Task Queue","queue"],
  ]},
  { group:"Privilege", items:[
    ["escalate","jrt-escalate · L0→L1","key"],
    ["blinding","jrt-blind · L1→L2","eye"],
  ]},
  { group:"Build plane", items:[
    ["build","Pipeline & Builds","hammer"],
    ["invariants","Envelope & Invariants","shield"],
    ["verification","Verification","check"],
  ]},
  { group:"Forensics", items:[
    ["timeline","Super-Timeline","clock"],
    ["artifacts","Artifact Browser","file"],
    ["ioc","IOC Search","search"],
    ["chain","Evidence Chain","chain"],
    ["certificate","§63 Certificate","cert"],
    ["exports","Report Exports","dl"],
  ]},
  { group:"Console", items:[
    ["transport","Transport & Tokens","globe"],
    ["audit","Audit Log","log"],
    ["users","Users & Roles","users"],
    ["scope","Scope Map · §2","layers"],
    ["language","Language & Scripts","term"],
    ["honesty","Honesty Annex · §11","book"],
  ]},
];

const VIEW_TITLES = {
  dashboard:["Dashboard","Fleet status, agent map, alerts and the live WebSocket feed — §8.2 console dashboard."],
  agents:["Agents & Probes","Lifecycle, privilege, startup environment probe (§5) and per-agent degradation notes."],
  missions:["Mission Manager","Mission CRUD, encrypted result stores, per-mission tokens, artifact schedules."],
  tasks:["Task Queue","In-process priority queue: dispatch, approve, reorder, canary tasks."],
  escalate:["jrt-escalate · L0 → L1","Operator-supplied C++ modules, probe → select → escalate → cleanup → re-probe (§5.1, §6.0)."],
  blinding:["jrt-blind · L1 → L2","PS 3B sensor-blinding: BYOVD pre-flight, driver blocklist, Linux posture matrix (§6.2)."],
  build:["Build Plane","Two-tier IR compilation, polymorphic CI pipeline, per-build attestation (§3.1)."],
  invariants:["Envelope & Invariants","The ten testable guarantees every build carries (§9)."],
  verification:["Verification","The six-track §10 plan with current evidence status."],
  timeline:["Super-Timeline","Merged chronological view across artifacts + chain hashes (log2timeline/plaso model)."],
  artifacts:["Artifact Browser","Signed JSON outputs with per-artifact integrity fields (§8.4)."],
  ioc:["IOC Search","Sweep artifacts against IOC lists — hashes, IPs, domains, YARA, registry paths."],
  chain:["Evidence Chain","Merkle-style parent_hash chain, C2 independent verification, tamper simulation."],
  certificate:["§63 Certificate","Auto-generated Bharatiya Sakshya Adhiniyam 2023 §63 compliance certificate."],
  exports:["Report Exports","JSON · CSV/TSV · STIX 2.1 · bodyfile — §8.4 export formats."],
  transport:["Transport & Tokens","Cloud-storage API profiles, owned TLS stack (N2), per-mission tokens (§8.3)."],
  audit:["Audit Log","Append-only JSON Lines, signed per entry — every action recorded (§8.2)."],
  users:["Users & Roles","JWT + RBAC: operator / analyst / readonly. Sessions, role matrix, token management."],
  scope:["Scope Map","FULL language-owned guarantees (§2.1), descoped PARTIAL checks (§2.2), PS-mandated exceptions (§2.3)."],
  language:["Language & Scripts","JOCKY verb palette, pipeline syntax, effect system, the 15-script standard library (§7, §8.1.2)."],
  honesty:["Honesty Annex","Explicit non-claims — stated, not hidden (§11)."],
};

/* ---------------- shell ---------------- */
function renderShell(){
  const app = document.getElementById("app");
  const navHtml = NAV.map(function(g){
    let items = g.items.map(function(it){
      let extra = "";
      if(it[0]==="tasks"){
        const n = DATA.tasks.filter(function(t){return t.state.indexOf("blocked")===0;}).length;
        if(n) extra = '<span class="n-badge">'+n+' approval</span>';
      }
      if(it[0]==="dashboard"){
        const n = DATA.alerts.filter(function(a){return a.sev==="crit"||a.sev==="warn";}).length;
        if(n) extra = '<span class="n-badge">'+n+'</span>';
      }
      return '<button class="nav-item'+(S.view===it[0]?" active":"")+'" onclick="UI.go(\''+it[0]+'\')">'
        +ic(it[2],17)+'<span>'+it[1]+'</span>'+extra+'</button>';
    }).join("");
    return '<div class="nav-group"><label>'+g.group+'</label>'+items+'</div>';
  }).join("");

  const roleColor = S.user.role==="operator" ? "var(--accent)" : (S.user.role==="analyst" ? "var(--blue)" : "var(--faint)");
  const missionOpts = DATA.missions.map(function(m){
    return '<option value="'+m.id+'"'+(S.mission===m.id?" selected":"")+'>'+m.id+' · '+esc(m.name)+'</option>';
  }).join("");

  app.innerHTML =
    '<div class="shell">'
    +'<aside class="sidebar">'
    +'<div class="brand"><div class="logo">'+ic("bolt",20)+'</div><div><b>Jocky</b><small>Operator Console</small></div></div>'
    +'<nav class="nav">'+navHtml+'</nav>'
    +'<div class="foot">'
    +'<div class="row"><span class="row" style="gap:6px"><span class="pulse-dot"></span>ws: live</span><span class="mono" id="wsClock">0s</span></div>'
    +'<div class="row"><span>'+esc(DATA.meta.version)+'</span></div>'
    +'</div></aside>'
    +'<div class="main">'
    +'<div class="topbar">'
    +'<div class="crumb">'+esc(VIEW_TITLES[S.view][0])+'<b>'+esc(VIEW_TITLES[S.view][0])+'</b></div>'
    +'<div class="spacer"></div>'
    +'<select class="mission-select" onchange="UI.setMission(this.value)" title="Active mission context">'+missionOpts+'</select>'
    +'<div class="role-chip" onclick="UI.switchUser()" title="Switch user (JWT + RBAC)"><span class="dot" style="background:'+roleColor+'"></span>'+esc(S.user.name)+' · '+esc(S.user.role)+'</div>'
    +'<div class="ws-pill"><span class="pulse-dot"></span>WEBSOCKET</div>'
    +'<button class="theme-btn" id="themeBtn" onclick="UI.toggleTheme()" title="Toggle light / dark theme">'+ic(S.theme==="light"?"moon":"sun",15)+'</button>'
    +'</div>'
    +'<div class="content" id="view"></div>'
    +'</div></div>';
  renderView();
}

function pageHead(title, sub, right){
  return '<div class="view-head"><div><h1>'+title+'</h1><p>'+sub+'</p></div>'
    +'<div class="right">'+(right||"")+'</div></div>';
}

function renderView(){
  closeDrawer();
  const v = document.getElementById("view");
  const fn = VIEWS[S.view] || VIEWS.dashboard;
  v.innerHTML = fn();
  if(S.view==="dashboard") startFeed();
}

/* ---------------- DASHBOARD ---------------- */
function kpiSpark(color){
  return '<svg class="spark" width="72" height="26" viewBox="0 0 72 26"><polyline points="0,20 10,16 20,17 30,10 40,12 50,6 60,9 72,3" fill="none" stroke="'+color+'" stroke-width="1.8" stroke-linecap="round"/></svg>';
}
function kpi(label, val, sub, tint, spark){
  return '<div class="card kpi"><span class="tint" style="background:'+tint+'"></span>'
    +'<div class="lab">'+label+'</div><div class="val">'+val+(sub?'<small> '+sub+'</small>':"")+'</div>'+(spark||"")+'</div>';
}

function agentMap(){
  const W=960, H=400;
  const X=function(lon){return (lon+180)/360*W;}, Y=function(lat){return (90-lat)/180*H;};
  let grat="";
  for(let lon=-150;lon<=150;lon+=30){ grat+='<line x1="'+X(lon)+'" y1="0" x2="'+X(lon)+'" y2="'+H+'" stroke="#16222f" stroke-width="1"/>'; }
  for(let lat=-60;lat<=60;lat+=30){ grat+='<line x1="0" y1="'+Y(lat)+'" x2="'+W+'" y2="'+Y(lat)+'" stroke="#16222f" stroke-width="1"/>'; }
  const c2x=X(20), c2y=Y(30);
  let arcs="", pins="";
  const cols={online:"#34d399",away:"#fbbf24",offline:"#5d6f81"};
  DATA.agents.forEach(function(a){
    const x=X(a.lon), y=Y(a.lat);
    const mx=(c2x+x)/2, my=Math.min(c2y,y)-60;
    if(a.status!=="offline"){
      arcs+='<path class="arc" d="M'+c2x+','+c2y+' Q'+mx+','+my+' '+x+','+y+'" fill="none" stroke="rgba(45,212,191,.45)" stroke-width="1.4"/>';
    }
    const c=cols[a.status];
    pins+='<g style="cursor:pointer" onclick="UI.openAgent(\''+a.id+'\')">'
      +'<title>'+a.id+' · '+esc(a.host)+' · '+a.status+' · '+a.priv+'</title>'
      +(a.status==="online"?'<circle class="pin-ping" cx="'+x+'" cy="'+y+'" r="4" fill="none" stroke="'+c+'" stroke-width="1.5"/>':"")
      +'<circle cx="'+x+'" cy="'+y+'" r="5.5" fill="#0b1118" stroke="'+c+'" stroke-width="2.5"/>'
      +'<text x="'+(x+10)+'" y="'+(y+4)+'" fill="#dbe6f0" font-size="11" font-family="monospace">'+a.id+'</text></g>';
  });
  return '<svg viewBox="0 0 '+W+' '+H+'">'+grat
    +'<g><rect x="'+(c2x-46)+'" y="'+(c2y-14)+'" width="92" height="24" rx="6" fill="#0f1a26" stroke="#2dd4bf" stroke-width="1.2"/>'
    +'<text x="'+c2x+'" y="'+(c2y+2)+'" text-anchor="middle" fill="#2dd4bf" font-size="11" font-family="monospace" font-weight="bold">C2 · CDN</text></g>'
    +arcs+pins+'</svg>';
}

function alertIcon(sev){
  if(sev==="crit") return "alert"; if(sev==="warn") return "alert";
  if(sev==="info") return "info"; return "check";
}
function alertsHtml(list){
  return list.map(function(a){
    return '<div class="alert '+a.sev+'"><div class="ic">'+ic(alertIcon(a.sev),15)+'</div>'
      +'<div><b>'+esc(a.title)+'</b><div class="msg">'+esc(a.msg)+'</div><div class="when">'+esc(a.when)+' · console event</div></div>'
      +'<div class="right">'+(a.action&&a.action!=="—"?'<button class="btn xs" onclick="UI.alertGo(\''+esc(a.action)+'\')">'+esc(a.action)+'</button>':"")+'</div></div>';
  }).join("");
}

function donut(counts){
  const total = counts.reduce(function(s,c){return s+c[1];},0)||1;
  let off=25, segs="";
  counts.forEach(function(c){
    const frac=c[1]/total, len=frac*100;
    segs+='<circle cx="60" cy="60" r="46" fill="none" stroke="'+c[2]+'" stroke-width="16" stroke-dasharray="'+len.toFixed(1)+' 100" stroke-dashoffset="'+(-off+25).toFixed(1)+'" transform="rotate(-90 60 60)"/>';
    off+=len;
  });
  const leg = counts.map(function(c){
    return '<div class="lr"><span class="sw" style="background:'+c[2]+'"></span>'+c[0]+'<b>'+c[1]+'</b></div>';
  }).join("");
  return '<div class="donut-wrap"><svg class="donut" viewBox="0 0 120 120">'+segs
    +'<text x="60" y="58" text-anchor="middle" class="ctr">'+total+'</text>'
    +'<text x="60" y="74" text-anchor="middle" style="font:500 9px sans-serif;fill:#5d6f81">agents</text></svg>'
    +'<div class="legend-list" style="flex:1">'+leg+'</div></div>';
}

function feedItemHtml(f){
  return '<div class="feed-item new"><span class="tm">'+f.t+'</span><span class="ic">'+ic(f.i,13)+'</span><span class="tx">'+f.x+'</span></div>';
}

function vDashboard(){
  const online = DATA.agents.filter(function(a){return a.status==="online";}).length;
  const exec = DATA.tasks.filter(function(t){return t.state==="executing";}).length;
  const blocked = DATA.tasks.filter(function(t){return t.state.indexOf("blocked")===0;}).length;
  const arts = DATA.agents.reduce(function(s,a){return s+a.artifacts;},0);
  const activeM = DATA.missions.filter(function(m){return m.status==="active";}).length;

  const privCounts = [["L0 · unprivileged", DATA.agents.filter(function(a){return a.priv==="L0";}).length, "#60a5fa"],
                      ["L1 · admin/root", DATA.agents.filter(function(a){return a.priv==="L1";}).length, "#fbbf24"],
                      ["L2 · kernel", DATA.agents.filter(function(a){return a.priv==="L2";}).length, "#f87171"]];
  const platCounts = [["Windows", DATA.agents.filter(function(a){return a.platform==="windows";}).length, "#2dd4bf"],
                      ["Linux", DATA.agents.filter(function(a){return a.platform==="linux";}).length, "#a78bfa"]];

  let feedHtml = S.feed.length ? S.feed.map(feedItemHtml).join("") : '<div class="empty">WebSocket feed warming up…</div>';

  return pageHead("Dashboard","Fleet status at a glance — agent map, privilege posture, alerts and the live forensic feed.",
      '<button class="btn" onclick="UI.go(\'missions\')">'+ic("target",14)+' Mission Manager</button>'
      +disBtn("task.l0","＋ New Task","UI.dispatchTask()", "primary"))
    +'<div class="kpis">'
    +kpi("Agents online", online+'<small> / '+DATA.agents.length+'</small>',"", "#34d399", kpiSpark("#34d399"))
    +kpi("Active missions", activeM,"", "#2dd4bf", kpiSpark("#2dd4bf"))
    +kpi("Tasks executing", exec, blocked?('+'+blocked+' awaiting approval'):"", "#60a5fa", kpiSpark("#60a5fa"))
    +kpi("Artifacts collected", arts.toLocaleString(),"chain-verified", "#a78bfa", kpiSpark("#a78bfa"))
    +kpi("Critical / warning alerts", DATA.alerts.filter(function(a){return a.sev==="crit"||a.sev==="warn";}).length,"", "#f87171", kpiSpark("#f87171"))
    +'</div>'
    +'<div class="grid g52 mt"><div class="card"><div class="head">'+ic("globe",15)+' Agent Map <span class="sub">TLS over CDN / cloud APIs · click a pin for the agent</span></div>'
    +'<div class="mapbox">'+agentMap()+'</div>'
    +'<div class="map-legend"><span class="li"><span class="sw" style="background:#34d399"></span>online</span><span class="li"><span class="sw" style="background:#fbbf24"></span>away</span><span class="li"><span class="sw" style="background:#5d6f81"></span>offline</span><span class="li">dashed arcs = tasking / result blobs via cloud-storage profiles</span></div>'
    +'</div>'
    +'<div style="display:flex;flex-direction:column;gap:14px"><div class="card"><div class="head">'+ic("shield",15)+' Privilege Posture</div><div class="body">'
    +donut(privCounts)+'<div class="divider"></div>'+donut(platCounts)
    +'</div></div>'
    +'<div class="card"><div class="head">'+ic("queue",15)+' Queue Snapshot</div><div class="body">'
    +'<div class="row"><span class="mini">executing</span><b class="mono">'+exec+'</b><span class="mini">· queued</span><b class="mono">'+DATA.tasks.filter(function(t){return t.state==="queued";}).length+'</b><span class="mini">· blocked</span><b class="mono">'+blocked+'</b></div>'
    +'<div class="progress mt" style="margin-top:10px"><i style="width:'+Math.round(exec/Math.max(1,DATA.tasks.length)*100)+'%"></i></div>'
    +'<div class="row mt"><button class="btn sm grow" onclick="UI.go(\'tasks\')">Open Task Queue</button></div>'
    +'</div></div></div></div>'
    +'<div class="grid g2 mt"><div class="card"><div class="head">'+ic("alert",15)+' Alerts <span class="sub">newest first</span><span class="right"><button class="btn xs ghost" onclick="UI.go(\'audit\')">audit trail</button></span></div>'
    +'<div>'+alertsHtml(DATA.alerts)+'</div></div>'
    +'<div class="card"><div class="head">'+ic("bolt",15)+' Live Feed <span class="sub">WebSocket · real-time agent status + forensic stream</span><span class="right">'+badge("connected","ok")+'</span></div>'
    +'<div class="feed" id="liveFeed">'+feedHtml+'</div></div></div>';
}

/* live WebSocket feed simulation */
let feedTimer=null;
function startFeed(){
  if(S.feed.length===0){
    seedFeed();
  }
  paintFeed();
  if(feedTimer) clearInterval(feedTimer);
  feedTimer=setInterval(function(){
    pushFeed();
    paintFeed();
    S.wsTick+=6;
    const c=document.getElementById("wsClock"); if(c) c.textContent=S.wsTick+"s";
  }, 6000);
}
function seedFeed(){
  const A=["A-7F3C","A-9D21","A-4B8E","A-2C55","A-1E47"];
  for(let i=0;i<7;i++){
    const t=DATA.feedPool[Math.floor(Math.random()*DATA.feedPool.length)];
    S.feed.push(mkFeed(t, A[Math.floor(Math.random()*A.length)]));
  }
}
function mkFeed(t, a){
  const n = String(S.feedN+Math.floor(Math.random()*40)).slice(-4);
  return { t:"09:"+String(20+Math.floor(Math.random()*39))+":"+String(10+Math.floor(Math.random()*49))+"Z",
           i: t[0]==="result"?"file":(t[0]==="canary"?"shield":(t[0]==="audit"?"log":"bolt")),
           x: t[1].replace("{A}",a).replace("{N}",n) };
}
function pushFeed(){
  const A=["A-7F3C","A-9D21","A-4B8E","A-2C55","A-1E47","A-3C19"];
  const t=DATA.feedPool[Math.floor(Math.random()*DATA.feedPool.length)];
  S.feed.unshift(mkFeed(t, A[Math.floor(Math.random()*A.length)]));
  S.feed = S.feed.slice(0,30);
}
function paintFeed(){
  const f=document.getElementById("liveFeed");
  if(f) f.innerHTML = S.feed.map(feedItemHtml).join("");
}

/* ---------------- AGENTS ---------------- */
function agentRow(a){
  const m = missionById(a.mission);
  return '<tr style="cursor:pointer" onclick="UI.openAgent(\''+a.id+'\')">'
    +'<td><span class="mono"><b>'+a.id+'</b></span><span class="sub">'+esc(a.host)+' · '+esc(a.ip)+'</span></td>'
    +'<td>'+(a.platform==="windows"?"Windows":"Linux")+'<span class="sub">'+esc(a.os)+'</span></td>'
    +'<td>'+privBadge(a.priv)+'<span class="sub">'+esc(a.privSource).slice(0,40)+'…</span></td>'
    +'<td>'+statusBadge(a.status)+'<span class="sub">'+esc(a.lastSeen)+'</span></td>'
    +'<td><span class="mono">'+(m?esc(m.name):"—")+'</span><span class="sub">'+a.mission+'</span></td>'
    +'<td class="right-in-table"><span class="mono">'+a.artifacts+'</span><span class="sub">'+a.tasksDone+' tasks</span></td>'
    +'<td>'+(a.quarantined?badge("quarantined","bad"):(a.lifecycle==="decommissioned"?badge("decommissioned","mut"):badge(a.lifecycle,"teal")))+'</td>'
    +'</tr>';
}
function vAgents(){
  const f=S.agentFilter;
  let list=DATA.agents.filter(function(a){
    if(f.plat!=="all"&&a.platform!==f.plat) return false;
    if(f.priv!=="all"&&a.priv!==f.priv) return false;
    if(f.st!=="all"&&a.status!==f.st) return false;
    if(f.q && (a.id+" "+a.host+" "+a.ip+" "+a.os).toLowerCase().indexOf(f.q.toLowerCase())<0) return false;
    return true;
  });
  const rows=list.map(agentRow).join("") || '<tr><td colspan="7"><div class="empty">No agents match this filter.</div></td></tr>';
  return pageHead("Agents & Probes","Registration → tasking → result collection → decommission (§8.2 lifecycle). Every agent reports its privilege + environment probe at startup (§5).",
      disBtn("task.l0","＋ New Task","UI.dispatchTask()","primary"))
    +'<div class="card"><div class="body"><div class="row wrap">'
    +'<div class="searchbar">'+ic("search",14)+'<input placeholder="filter id / host / ip / os…" value="'+esc(f.q)+'" oninput="UI.agentQ(this.value)"/></div>'
    +'<select class="mission-select" onchange="UI.agentF(\'plat\',this.value)"><option value="all">platform: all</option><option value="windows"'+(f.plat==="windows"?" selected":"")+'>Windows</option><option value="linux"'+(f.plat==="linux"?" selected":"")+'>Linux</option></select>'
    +'<select class="mission-select" onchange="UI.agentF(\'priv\',this.value)"><option value="all">privilege: all</option><option value="L0"'+(f.priv==="L0"?" selected":"")+'>L0</option><option value="L1"'+(f.priv==="L1"?" selected":"")+'>L1</option><option value="L2"'+(f.priv==="L2"?" selected":"")+'>L2</option></select>'
    +'<select class="mission-select" onchange="UI.agentF(\'st\',this.value)"><option value="all">status: all</option><option value="online"'+(f.st==="online"?" selected":"")+'>online</option><option value="away"'+(f.st==="away"?" selected":"")+'>away</option><option value="offline"'+(f.st==="offline"?" selected":"")+'>offline</option></select>'
    +'<span class="mini grow" style="text-align:right">'+list.length+' of '+DATA.agents.length+' agents</span>'
    +'</div></div>'
    +'<div class="tbl-wrap"><table class="table"><thead><tr><th>Agent</th><th>Platform</th><th>Privilege</th><th>Status</th><th>Mission</th><th style="text-align:right">Artifacts</th><th>Lifecycle</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>'
    +'<div class="callout info mt">'+ic("info",16)+'<div><b>Lifecycle (§8.2).</b> Registration (machine fingerprint + capability report) → Tasking (beacon → receive task → execute) → Result collection (encrypted signed JSON → C2 verifies → stores → console notified) → Decommission (cleanup → memory-footprint wipe → final confirmation). Canary tasks + anomaly checks provide evidence-poisoning resistance.</div></div>';
}

function envGrid(a){
  const e=a.env;
  const rows=[
    ["HVCI",e.hvci===true?badge("active","warn"):e.hvci===false?badge("off","ok"):badge("n/a","mut")],
    ["Secure boot",e.secureBoot===true?badge("on","ok"):e.secureBoot===false?badge("off","warn"):badge("n/a","mut")],
    ["Defender / AV",'<span class="mini">'+esc(e.defender)+'</span>'],
    ["EDR drivers",esc((e.edr||[]).join(" · "))||"—"],
    ["Driver blocklist",'<span class="mini">'+esc(e.blocklist)+'</span>'],
    ["Monitors",esc((e.monitors||[]).join(" · "))||"—"],
    ["Linux lockdown",'<span class="mini">'+esc(e.lockdown)+'</span>'],
    ["Module sig enforce",'<span class="mini">'+esc(e.moduleSig)+'</span>'],
    ["BPF / LSM",'<span class="mini">'+esc(e.bpfLsm)+'</span>'],
    ["MAC",'<span class="mini">'+esc(e.mac)+'</span>'],
    ["auditd",'<span class="mini">'+esc(e.auditd)+'</span>'],
  ];
  return '<div class="kv">'+rows.map(function(r){return '<div>'+r[0]+'</div><div>'+r[1]+'</div>';}).join("")+'</div>';
}

function UI_openAgent(id){
  const a=agentById(id); if(!a) return;
  const probes=(DATA.probeResults[id]||[]).map(function(p){
    return '<tr><td class="mono">'+esc(p.m)+'</td><td>'+(p.viable?badge("viable","ok"):badge("not viable","mut"))+'</td><td class="mini">'+esc(p.reason)+'</td></tr>';
  }).join("") || '<tr><td colspan="3"><div class="empty">No escalation modules target this host.</div></td></tr>';
  const strat=DATA.escalationStrategy[id];
  const tasks=DATA.tasks.filter(function(t){return t.agent===id;});
  const taskRows=tasks.map(function(t){
    return '<tr><td class="mono">'+t.id+'</td><td class="mini">'+esc(t.payload)+'</td><td>'+stateBadge(t.state)+'</td></tr>';
  }).join("") || '<tr><td colspan="3"><div class="empty">No tasks for this agent yet.</div></td></tr>';

  openDrawer(a.id+" · "+esc(a.host),
    '<div class="row wrap mb">'+statusBadge(a.status)+privBadge(a.priv)+badge(esc(a.platform),"info")
    +(a.quarantined?badge("quarantined — anomaly hold","bad"):"")
    +'<span class="tiny">fingerprint <span class="mono">'+esc(a.fingerprint)+'</span></span></div>'
    +'<div class="row wrap mb">'
    +disBtn("task.l0",ic("plus",13)+" Task","UI.dispatchTask('"+a.id+"')","sm primary")
    +(agentRank(a)===0?disBtn("escalate.run",ic("key",13)+" Run jrt-escalate","UI.escalateRun('"+a.id+"')","sm approve"):"")
    +(agentRank(a)===1?disBtn("blind.run",ic("eye",13)+" Approve blind()","UI.blindRun('"+a.id+"')","sm approve"):"")
    +(a.lifecycle!=="decommissioned"?disBtn("decommission",ic("x",13)+" Decommission","UI.decommission('"+a.id+"')","sm danger"):"")
    +'</div>'
    +(a.notes?'<div class="callout '+(a.quarantined?"bad":"teal")+'">'+ic("info",16)+'<div>'+esc(a.notes)+'</div></div>':"")
    +'<h4 style="margin:14px 0 8px">Identity & transport</h4>'
    +'<div class="kv">'
    +'<div>OS / arch</div><div class="mini">'+esc(a.os)+' · '+esc(a.arch)+'</div>'
    +'<div>IP</div><div class="mono">'+esc(a.ip)+'</div>'
    +'<div>Privilege source</div><div class="mini">'+esc(a.privSource)+'</div>'
    +'<div>Transport</div><div class="mini">'+esc(a.transport)+' · TLS profile <span class="mono">'+esc(a.tlsProfile)+'</span> · jitter '+a.beaconJitter+'</div>'
    +'<div>Build</div><div class="mono">'+esc(a.buildHash)+'</div>'
    +'<div>Lifecycle</div><div>'+badge(a.lifecycle, a.lifecycle==="decommissioned"?"mut":"teal")+'</div>'
    +'</div>'
    +'<h4 style="margin:14px 0 8px">Environment probe (§5 startup report)</h4>'+envGrid(a)
    +(a.degrade.length?'<h4 style="margin:14px 0 8px">Degradation notes</h4>'+a.degrade.map(function(d){return '<div class="callout warn">'+ic("alert",15)+'<div>'+esc(d)+'</div></div>';}).join(""):"")
    +'<h4 style="margin:14px 0 8px">Escalation probe() results (read-only)</h4>'
    +'<table class="table"><thead><tr><th>Module</th><th>Probe</th><th>Reason</th></tr></thead><tbody>'+probes+'</tbody></table>'
    +(strat?'<div class="mini mt">Operator strategy: <span class="mono">'+strat.order.map(esc).join(" → ")+'</span> · fallback <b>'+strat.fallback+'</b></div>':"")
    +'<h4 style="margin:14px 0 8px">Tasks on this agent</h4>'
    +'<table class="table"><thead><tr><th>ID</th><th>Payload</th><th>State</th></tr></thead><tbody>'+taskRows+'</tbody></table>'
  );
}

/* dispatch task */
function UI_dispatchTask(agentId){
  const pre = agentId?agentById(agentId):null;
  const agents = DATA.agents.filter(function(a){return a.lifecycle!=="decommissioned";});
  const scripts = DATA.scripts.map(function(s){
    return '<option value="'+s.file+'">'+esc(s.file)+' · '+s.priv+' · '+s.plat+'</option>';
  }).join("");
  openModal("Dispatch task",
    '<div class="grid g2">'
    +'<div class="field"><label>Agent</label><select class="input mono" id="dtAgent">'
    +agents.map(function(a){return '<option value="'+a.id+'"'+(pre&&pre.id===a.id?" selected":"")+'>'+a.id+' · '+esc(a.host)+' ('+a.priv+')</option>';}).join("")
    +'</select></div>'
    +'<div class="field"><label>Priority</label><select class="input" id="dtPri"><option>P0 · canary / blinding</option><option selected>P1 · standard</option><option>P2 · bulk / scheduled</option></select></div>'
    +'</div>'
    +'<div class="field"><label>Script / payload (.jky — composable via pipeline syntax |)</label><select class="input mono" id="dtScript">'+scripts+'</select></div>'
    +'<div class="field"><label>Pipeline / arguments</label><textarea class="input" rows="2" id="dtArgs" placeholder=\'collect proc_meta | filter(parent == "cmd.exe") | timeline | upload\'>collect proc_meta | timeline | upload</textarea></div>'
    +'<div class="grid g2"><div class="field"><label>Exec vector (§6.1)</label><select class="input mono" id="dtVec">'
    +DATA.injectModes.map(function(m){return '<option>'+m+'</option>';}).join("")+'</select></div>'
    +'<div class="field"><label>Beacon profile</label><select class="input mono"><option>CDN_FRONT · jitter 0.3</option><option>CDN_FRONT · jitter 0.2</option><option>CLOUD_API · jitter 0.4</option></select></div></div>'
    +'<div class="callout warn">'+ic("lock",16)+'<div><b>Privilege gate.</b> L1/L2 payloads require the <b>operator</b> role and an agent already at that privilege. L0 payloads may be dispatched by operator or analyst. Cross-user inject, MFT, evtlog, Tier-2 capture and blind() are never L0.</div></div>',
    { wide:true, icon:"send", foot:'<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="UI.doDispatch()">'+ic("send",14)+' Dispatch</button>' }
  );
}
function UI_doDispatch(){
  const ag=agentById(document.getElementById("dtAgent").value);
  const script=document.getElementById("dtScript").value;
  const args=document.getElementById("dtArgs").value.trim();
  const pri=document.getElementById("dtPri").value.split(" ")[0];
  const srec=DATA.scripts.find(function(s){return s.file===script;});
  const need=scriptRank(srec.priv);
  if(need===0 && !can("task.l0")){ toast("Your role (<b>"+S.user.role+"</b>) cannot dispatch tasks. Requires "+needRoles("task.l0")+".","bad"); return; }
  if(need>=1 && !can("task.l1")){ toast("L1/L2 payloads require role: <b>"+needRoles("task.l1")+"</b>. You are "+S.user.role+".","bad"); return; }
  if(agentRank(ag)<need){ toast("Agent "+ag.id+" is "+ag.priv+" — payload needs L"+need+". Task will be queued as <b>blocked · approval</b>.","warn"); }
  const id="T-"+(S.feedN++);
  DATA.tasks.unshift({ id:id, mission:ag.mission, agent:ag.id,
    payload: script+(args&&args!==("collect proc_meta | timeline | upload")?" — "+args:""),
    pri:pri, minPriv:"L"+need,
    state: agentRank(ag)<need?"blocked · approval":"queued", since:"—", note:"dispatched by "+S.user.handle });
  DATA.audit.unshift({ t:"2026-09-29 09:52:00Z", actor:S.user.handle, act:"TASK_DISPATCH", detail:script+" → "+ag.id+" ("+pri+" · L"+need+")", sig:"new…", cat:"tasking" });
  closeModal(); renderView();
  toast("Task <b>"+id+"</b> dispatched to "+ag.id+(agentRank(ag)<need?" — held for privilege approval.":""));
}

/* ---------------- MISSIONS ---------------- */
function vMissions(){
  const cards=DATA.missions.map(function(m){
    const ags=m.agents.map(function(id){const a=agentById(id);return a?a.id+" ("+a.priv+")":id;}).join(" · ");
    return '<div class="card pad"><div class="row"><h3 class="mono">'+m.id+' · '+esc(m.name)+'</h3><span style="margin-left:auto"></span>'
      +(m.status==="active"?badge("active","ok"):badge("complete","mut"))+'</div>'
      +'<p class="mini" style="margin:8px 0">'+esc(m.objective)+'</p>'
      +'<div class="tag-row mb">'+m.agents.map(function(id){const a=agentById(id);return '<span class="chip">'+id+(a?" · "+a.status:"")+'</span>';}).join("")+'</div>'
      +'<div class="mini">store <span class="mono">'+esc(m.store)+'</span> · '+esc(m.storeEnc)+'</div>'
      +'<div class="mini">token <span class="mono">'+esc(m.token.profile)+'</span> · expires '+esc(m.token.expires)+'</div>'
      +'<div class="row mt"><button class="btn sm" onclick="UI.openMission(\''+m.id+'\')">Open mission</button>'
      +(m.id===S.mission?badge("context","teal"):'<button class="btn sm ghost" onclick="UI.setMission(\''+m.id+'\')">Set context</button>')+'</div></div>';
  }).join("");
  return pageHead("Mission Manager","One encrypted SQLite store per mission, per-mission least-privilege cloud tokens with auto-expiry, artifact schedules and rules of engagement.",
      disBtn("mission.crud","＋ New Mission","UI.newMission()","primary"))
    +'<div class="grid g2">'+cards+'</div>';
}
function UI_openMission(id){
  const m=missionById(id); if(!m) return;
  const sched=m.schedules.map(function(s){
    return '<tr><td class="mono">'+s.id+'</td><td class="mono">'+esc(s.script)+'</td><td>'+esc(s.every)+'</td><td class="mini">'+esc(s.target)+'</td>'
      +'<td>'+(can("mission.crud")
        ?'<label class="switch"><input type="checkbox"'+(s.on?" checked":"")+' onchange="UI.schedToggle(\''+m.id+'\',\''+s.id+'\')"/><span class="tr"></span></label>'
        :badge(s.on?"on":"off", s.on?"ok":"mut"))+'</td></tr>';
  }).join("") || '<tr><td colspan="5"><div class="empty">No artifact schedules — ad-hoc tasking only.</div></td></tr>';
  openDrawer(m.id+" · "+esc(m.name),
    '<div class="row mb">'+(m.status==="active"?badge("active","ok"):badge("complete","mut"))+'<span class="tiny">created '+esc(m.created)+' by '+esc(m.by)+'</span></div>'
    +'<p class="mini">'+esc(m.objective)+'</p>'
    +'<div class="row wrap mb">'+disBtn("mission.crud","Edit mission","UI.newMission('"+m.id+"')","sm")+disBtn("task.l0","Dispatch task","UI.dispatchTask()","sm")+disBtn("export","Generate §63 certificate","UI.go('certificate')","sm")+'</div>'
    +'<h4 style="margin:12px 0 8px">Result store & token</h4><div class="kv">'
    +'<div>Store</div><div class="mono">'+esc(m.store)+'<br/><span class="tiny">'+esc(m.storeEnc)+' — zero-dependency, portable, mission data isolated</span></div>'
    +'<div>Cloud token</div><div class="mono">'+esc(m.token.account)+'<br/><span class="tiny">'+esc(m.token.profile)+' · '+esc(m.token.perms)+' · expires '+esc(m.token.expires)+'</span></div>'
    +'<div>Canary policy</div><div class="mini">'+esc(m.canary)+'</div>'
    +'<div>Rules of engagement</div><div class="mini">'+esc(m.roe)+'</div></div>'
    +'<h4 style="margin:14px 0 8px">Agents</h4><div class="tag-row">'+m.agents.map(function(aid){const a=agentById(aid);return a?'<button class="chip" onclick="UI.openAgent(\''+aid+'\')">'+aid+' · '+a.priv+' · '+a.status+'</button>':'<span class="chip">'+aid+'</span>';}).join("")+'</div>'
    +'<h4 style="margin:14px 0 8px">Artifact schedules</h4>'
    +'<table class="table"><thead><tr><th>ID</th><th>Script</th><th>Cadence</th><th>Target</th><th>Enabled</th></tr></thead><tbody>'+sched+'</tbody></table>'
  );
}
function UI_newMission(editId){
  if(!can("mission.crud")){ toast("Mission CRUD requires role: <b>operator</b>.","bad"); return; }
  const m=editId?missionById(editId):null;
  openModal(m?"Edit mission "+m.id:"New mission",
    '<div class="field"><label>Mission name</label><input class="input" id="nmName" value="'+(m?esc(m.name):"OP-NEW-SWEEP")+'"/></div>'
    +'<div class="field"><label>Objective</label><textarea class="input" rows="2" id="nmObj">'+(m?esc(m.objective):"")+'</textarea></div>'
    +'<div class="grid g2"><div class="field"><label>Transport profile</label><select class="input mono" id="nmProf">'
    +DATA.transportProfiles.map(function(p){return '<option value="'+p.id+'">'+p.id+' — '+esc(p.svc)+'</option>';}).join("")+'</select></div>'
    +'<div class="field"><label>Token lifetime</label><select class="input" id="nmTok"><option>+72h auto-expiry</option><option>+7d</option><option>mission window</option></select></div></div>'
    +'<div class="field"><label>Rules of engagement</label><textarea class="input" rows="2" id="nmRoe">'+(m?esc(m.roe):"blind() never by default; L1+ ops need per-invocation approval.")+'</textarea></div>'
    +'<div class="callout teal">'+ic("info",16)+'<div>Creates an isolated encrypted SQLite store (<span class="mono">mission_&lt;id&gt;.enc.sqlite</span>) and a per-mission least-privilege cloud token with auto-expiry.</div></div>',
    { icon:"target", foot:'<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="UI.doNewMission(\''+(editId||"")+'\')">'+(m?"Save":"Create mission")+'</button>' });
}
function UI_doNewMission(editId){
  const name=document.getElementById("nmName").value||"OP-UNNAMED";
  if(editId){
    const m=missionById(editId); m.name=name;
    m.objective=document.getElementById("nmObj").value; m.roe=document.getElementById("nmRoe").value;
    DATA.audit.unshift({t:"2026-09-29 09:52:00Z",actor:S.user.handle,act:"MISSION_EDIT",detail:editId+" updated",sig:"new…",cat:"mission"});
    toast("Mission <b>"+editId+"</b> updated.");
  }else{
    const id="M-"+(2610+Math.floor(Math.random()*20));
    DATA.missions.unshift({ id:id, name:name, status:"active", objective:document.getElementById("nmObj").value,
      agents:[], created:"2026-09-29 09:52Z", by:S.user.handle, store:"mission_"+id+".enc.sqlite", storeEnc:"AES-256-GCM (SQLCipher)",
      token:{profile:document.getElementById("nmProf").value, account:"pending provisioning", expires:"+72h", perms:"least-privilege, auto-expiry"},
      canary:"canary on first task of each beacon window", roe:document.getElementById("nmRoe").value, schedules:[] });
    DATA.audit.unshift({t:"2026-09-29 09:52:00Z",actor:S.user.handle,act:"MISSION_CREATE",detail:id+" "+name+" created",sig:"new…",cat:"mission"});
    toast("Mission <b>"+id+"</b> created with isolated encrypted store.");
  }
  closeModal(); renderView();
}
function UI_schedToggle(mid, sid){
  const m=missionById(mid); const s=m.schedules.find(function(x){return x.id===sid;});
  s.on=!s.on;
  DATA.audit.unshift({t:"2026-09-29 09:52:00Z",actor:S.user.handle,act:"SCHEDULE_"+(s.on?"ENABLE":"DISABLE"),detail:mid+" "+sid+" "+s.script,sig:"new…",cat:"mission"});
  toast("Schedule <b>"+sid+"</b> "+(s.on?"enabled":"paused")+".");
}

/* ---------------- TASKS ---------------- */
function vTasks(){
  const f=S.taskFilter;
  const counts={all:DATA.tasks.length,executing:0,queued:0,blocked:0,complete:0};
  DATA.tasks.forEach(function(t){
    if(t.state==="executing")counts.executing++;
    else if(t.state==="queued")counts.queued++;
    else if(t.state.indexOf("blocked")===0)counts.blocked++;
    else if(t.state==="complete")counts.complete++;
  });
  const list=DATA.tasks.filter(function(t){
    if(f==="all")return true;
    if(f==="blocked")return t.state.indexOf("blocked")===0;
    return t.state===f;
  });
  const tabs=["all","executing","queued","blocked","complete"].map(function(k){
    return '<button class="tab'+(f===k?" on":"")+'" onclick="UI.taskF(\''+k+'\')">'+k+' ('+counts[k]+')</button>';
  }).join("");
  const rows=list.map(function(t){
    const a=agentById(t.agent);
    const isCanary=/canary/i.test(t.payload);
    return '<tr class="'+(t.state.indexOf("blocked")===0?"sel":"")+'">'
      +'<td class="mono"><b>'+t.id+'</b>'+(isCanary?'<span class="sub">canary task</span>':"")+'</td>'
      +'<td><span class="mono">'+t.pri+'</span></td>'
      +'<td class="mini">'+esc(t.payload)+'<span class="sub">'+esc(t.note||"")+'</span></td>'
      +'<td>'+(a?'<span class="mono">'+a.id+'</span><span class="sub">'+esc(a.host)+' · '+a.priv+'</span>':t.agent)+'</td>'
      +'<td>'+privBadge(t.minPriv)+'</td>'
      +'<td>'+stateBadge(t.state)+'<span class="sub">'+esc(t.since)+'</span></td>'
      +'<td class="right-in-table">'
      +(t.state.indexOf("blocked")===0?disBtn(t.minPriv==="L0"?"task.l0":"task.l1","Approve","UI.approveTask('"+t.id+"')","xs approve"):"")
      +(t.state==="queued"?'<button class="btn xs ghost" onclick="UI.bumpTask(\''+t.id+'\',-1)" title="raise priority">'+ic("up",12)+'</button><button class="btn xs ghost" onclick="UI.bumpTask(\''+t.id+'\',1)" title="lower priority">'+ic("down",12)+'</button>':"")
      +(t.state!=="complete"?disBtn("task.l0","Cancel","UI.cancelTask('"+t.id+"')","xs ghost"):"")
      +'</td></tr>';
  }).join("");
  return pageHead("Task Queue","In-process priority queue. P0 (canary / blinding) preempts P1/P2. Blocked items wait on privilege or operator approval — the agent never self-authorizes.",
      disBtn("task.l0","＋ New Task","UI.dispatchTask()","primary"))
    +'<div class="card"><div class="tabs" style="padding:0 14px">'+tabs+'</div>'
    +'<div class="tbl-wrap"><table class="table"><thead><tr><th>ID</th><th>Pri</th><th>Payload</th><th>Agent</th><th>MinPriv</th><th>State</th><th style="text-align:right">Actions</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>'
    +'<div class="callout teal mt">'+ic("shield",16)+'<div><b>Evidence-poisoning resistance (§8.2).</b> Canary tasks (benign, fixed nonce) interleave with real tasking; every returned bundle passes anomaly checks before the console accepts it. A-3C19 is currently quarantined on a canary mismatch.</div></div>';
}
function UI_approveTask(id){
  const t=DATA.tasks.find(function(x){return x.id===id;});
  const need=t.minPriv==="L0"?"task.l0":"task.l1";
  if(!can(need)){ toast("Approving this task requires role: <b>"+needRoles(need)+"</b>.","bad"); return; }
  const a=agentById(t.agent);
  if(a&&agentRank(a)<privRank(t.minPriv)){ toast("Agent "+a.id+" is still "+a.priv+" — escalate first (see jrt-escalate). Approval recorded, task stays blocked.","warn"); return; }
  t.state="queued"; t.note="approved by "+S.user.handle;
  DATA.audit.unshift({t:"2026-09-29 09:53:00Z",actor:S.user.handle,act:"TASK_APPROVE",detail:id+" released to queue",sig:"new…",cat:"tasking"});
  renderView(); toast("Task <b>"+id+"</b> approved and queued.");
}
function UI_bumpTask(id,dir){
  const i=DATA.tasks.findIndex(function(x){return x.id===id;});
  const j=i+dir;
  if(i<0||j<0||j>=DATA.tasks.length) return;
  const tmp=DATA.tasks[i]; DATA.tasks[i]=DATA.tasks[j]; DATA.tasks[j]=tmp;
  renderView(); toast("Queue order updated.");
}
function UI_cancelTask(id){
  const i=DATA.tasks.findIndex(function(x){return x.id===id;});
  if(i>=0){ DATA.tasks.splice(i,1);
    DATA.audit.unshift({t:"2026-09-29 09:53:00Z",actor:S.user.handle,act:"TASK_CANCEL",detail:id+" cancelled",sig:"new…",cat:"tasking"});
    renderView(); toast("Task <b>"+id+"</b> cancelled."); }
}

/* ---------------- ESCALATE (jrt-escalate, §5.1 / §6.0) ---------------- */
function vEscalate(){
  const modRows=DATA.modules.map(function(m){
    return '<tr><td class="mono"><b>'+esc(m.id)+'</b><span class="sub">'+esc(m.desc)+'</span></td>'
      +'<td>'+m.plat+'</td><td class="mini">'+esc(m.versions)+'</td>'
      +'<td>'+badge(m.rel, m.rel==="HIGH"?"ok":(m.rel==="EXPERIMENTAL"?"violet":"warn"))+'</td>'
      +'<td class="mono">'+esc(m.cve)+'</td><td class="mini">'+esc(m.build)+'</td>'
      +'<td>'+badge(m.status, m.status==="active"?"ok":"info")+'</td></tr>';
  }).join("");
  const logRows=DATA.escalationLog.map(function(l){
    return '<tr><td class="mini mono">'+esc(l.t)+'</td><td class="mono">'+esc(l.agent)+'</td><td class="mono">'+esc(l.module)+'</td>'
      +'<td>'+(l.probe==="viable"?badge("probe: viable","ok"):badge("probe: "+l.probe,"mut"))+'</td>'
      +'<td class="mini">'+esc(l.outcome)+'</td><td class="mini">'+esc(l.cleanup)+'</td><td class="mini">'+esc(l.by)+'</td></tr>';
  }).join("");
  const stratCards=Object.keys(DATA.escalationStrategy).map(function(aid){
    const a=agentById(aid), st=DATA.escalationStrategy[aid];
    const probs=(DATA.probeResults[aid]||[]).map(function(p){
      return '<div class="row" style="margin:4px 0"><span class="mono mini grow">'+esc(p.m)+'</span>'+(p.viable?badge("viable","ok"):badge("skip","mut"))+'</div>';
    }).join("");
    return '<div class="card pad"><div class="row"><b class="mono">'+aid+'</b>'+(a?statusBadge(a.status)+privBadge(a.priv):"")+'<span style="margin-left:auto"></span>'
      +(a&&agentRank(a)===0?disBtn("escalate.run","Run escalation","UI.escalateRun('"+aid+"')","sm approve"):badge(a&&a.priv!=="L0"?"already "+(a?a.priv:""):"n/a","mut"))+'</div>'
      +'<div class="mt">'+probs+'</div>'
      +'<div class="tiny mt">order: <span class="mono">'+st.order.map(esc).join(" → ")+'</span> · fallback <b>'+st.fallback+'</b></div></div>';
  }).join("");

  return pageHead("jrt-escalate · L0 → L1","The operator-extensible escalation engine. Ships zero exploits — operators supply C++ modules implementing probe / escalate / cleanup. C2 must approve before anything runs.",
      disBtn("escalate.run","＋ Register Module","UI.newModule()","primary"))
    +'<div class="card mb"><div class="head">'+ic("key",15)+' Privilege Chain <span class="sub">L0 —jrt-escalate→ L1 —jrt-blind→ L2 (§6.0)</span></div><div class="body">'
    +'<div class="flow"><div class="node">L0<small>runtime default</small></div><div class="arrow">—jrt-escalate→<small>operator-supplied C++ module</small></div>'
    +'<div class="node">L1<small>admin / root</small></div><div class="arrow">—jrt-blind→<small>operator-approved blind()</small></div>'
    +'<div class="node kernel">L2<small>kernel (jrt-blind only)</small></div></div></div></div>'
    +'<div class="stepper card mb">'
    +[['1','Probe','each module probe() — read-only, automatic'],['2','Select','C2 + operator pick module from probe results'],['3','Escalate','operator-approved escalate() via jrt-core substrate'],['4','Cleanup','module cleanup() — idempotent, automatic'],['5','Re-probe','agent re-assesses at L1; blind() unlocks']].map(function(s,i){
      return '<div class="step'+(i<2?" done":(i===2?" now":""))+'"><div class="knob">'+(i<2?"✓":s[0])+'</div><b>'+s[1]+'</b><div class="tiny">'+s[2]+'</div></div>';
    }).join("")+'</div>'
    +'<div class="grid g2"><div><h3 style="margin:4px 0 10px;font-size:14px">Operator strategies</h3><div class="grid" style="gap:12px">'+stratCards+'</div></div>'
    +'<div><h3 style="margin:4px 0 10px;font-size:14px">Escalation interface (C++ SDK)</h3>'
    +'<div class="code"><span class="c">// operator implements per target OS/version; compiled through the Jocky pipeline</span>\n<span class="k">struct</span> EscalationModuleInfo {\n    <span class="k">const char</span>* module_id;      <span class="c">// e.g. "win_lpe_CVE_2024_XXXXX"</span>\n    Platform    target_os;\n    <span class="k">const char</span>* target_versions[];\n    Reliability reliability;   <span class="c">// HIGH | MEDIUM | LOW | EXPERIMENTAL</span>\n};\n<span class="k">class</span> <span class="n">IEscalationModule</span> {\n<span class="k">public</span>:\n    <span class="k">virtual</span> EscalationModuleInfo <span class="n">info</span>() = <span class="n">0</span>;\n    <span class="k">virtual bool</span> <span class="n">probe</span>(<span class="k">const</span> HostEnvironment&amp; env) = <span class="n">0</span>;  <span class="c">// Phase 1: non-destructive</span>\n    <span class="k">virtual</span> EscalationResult <span class="n">escalate</span>() = <span class="n">0</span>;               <span class="c">// Phase 2: operator-approved</span>\n    <span class="k">virtual void</span> <span class="n">cleanup</span>() = <span class="n">0</span>;                           <span class="c">// Phase 3: idempotent</span>\n};\n<span class="c">// modules are compiled INTO the binary — never hot-loaded at runtime</span></div>'
    +'<div class="callout warn">'+ic("alert",16)+'<div><b>Honest limits.</b> No built-in exploits — without operator modules jrt-escalate is inert. Attempts are inherently noisy (service crashes, event logs, EDR heuristics); reliability is the operator\u2019s responsibility.</div></div>'
    +'</div></div>'
    +'<div class="card mt"><div class="head">'+ic("box",15)+' Module Registry <span class="sub">built into binaries at compile time — build pipeline re-polymorphizes on every change</span></div>'
    +'<div class="tbl-wrap"><table class="table"><thead><tr><th>Module</th><th>OS</th><th>Target versions</th><th>Reliability</th><th>CVE</th><th>Build link</th><th>Status</th></tr></thead><tbody>'+modRows+'</tbody></table></div></div>'
    +'<div class="card mt"><div class="head">'+ic("log",15)+' Escalation Execution Log <span class="sub">module ID · probe · outcome · cleanup — full auditability</span></div>'
    +'<div class="tbl-wrap"><table class="table"><thead><tr><th>Time</th><th>Agent</th><th>Module</th><th>Probe</th><th>Outcome</th><th>Cleanup</th><th>Approved by</th></tr></thead><tbody>'+logRows+'</tbody></table></div></div>';
}
function UI_newModule(){
  if(!can("escalate.run")){ toast("Registering modules requires role: <b>operator</b>.","bad"); return; }
  openModal("Register escalation module",
    '<div class="grid g2"><div class="field"><label>Module ID</label><input class="input mono" id="mdId" value="win_lpe_CVE_2025_XXXXX"/></div>'
    +'<div class="field"><label>Platform</label><select class="input" id="mdPlat"><option>Windows</option><option>Linux</option></select></div></div>'
    +'<div class="grid g2"><div class="field"><label>Target versions</label><input class="input mono" id="mdVer" value="10.0.22631"/></div>'
    +'<div class="field"><label>Reliability</label><select class="input" id="mdRel"><option>HIGH</option><option>MEDIUM</option><option>LOW</option><option>EXPERIMENTAL</option></select></div></div>'
    +'<div class="grid g2"><div class="field"><label>CVE (optional)</label><input class="input mono" id="mdCve" value="CVE-2025-XXXXX"/></div>'
    +'<div class="field"><label>Source</label><select class="input"><option>upload .cpp (SDK headers)</option><option>paste source</option></select></div></div>'
    +'<div class="field"><label>Description</label><input class="input" id="mdDesc" value="Operator-supplied LPE module"/></div>'
    +'<div class="callout teal">'+ic("info",16)+'<div>On submit the CI pipeline compiles the module through the same LLVM pass pipeline (CFG flatten · MBA · string encrypt — seeded per build), links it into the next build, and records module metadata in the build attestation.</div></div>',
    { icon:"plus", foot:'<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="UI.doNewModule()">Compile into next build</button>' });
}
function UI_doNewModule(){
  const id=document.getElementById("mdId").value||"mod_unnamed";
  DATA.modules.push({ id:id, plat:document.getElementById("mdPlat").value, versions:document.getElementById("mdVer").value,
    rel:document.getElementById("mdRel").value, cve:document.getElementById("mdCve").value,
    desc:document.getElementById("mdDesc").value, build:"queued for next CI build", status:"lab" });
  DATA.audit.unshift({t:"2026-09-29 09:54:00Z",actor:S.user.handle,act:"MODULE_REGISTER",detail:id+" queued for CI build",sig:"new…",cat:"build"});
  closeModal(); renderView(); toast("Module <b>"+esc(id)+"</b> registered — queued for the polymorphic CI build.");
}
function UI_escalateRun(aid){
  if(!can("escalate.run")){ toast("Running escalation requires role: <b>operator</b>.","bad"); return; }
  const a=agentById(aid);
  const st=DATA.escalationStrategy[aid];
  const opts=(DATA.probeResults[aid]||[]).map(function(p,i){
    return '<label class="rolecard mb" style="padding:10px 12px"><input type="radio" name="escmod" value="'+esc(p.m)+'"'+(p.viable&&i===(DATA.probeResults[aid].findIndex(function(x){return x.viable;}))?" checked":"")+(p.viable?"":" disabled")+' style="margin-top:4px"/>'
      +'<span><b class="mono">'+esc(p.m)+'</b><div class="tiny">'+esc(p.reason)+' — '+(p.viable?"probe viable":"probe false, skipped")+'</div></span></label>';
  }).join("");
  openModal("Approve jrt-escalate · "+aid,
    '<div class="mini mb">Agent <b class="mono">'+aid+'</b> ('+esc(a.os)+') · strategy order <span class="mono">'+st.order.map(esc).join(" → ")+'</span> · fallback <b>'+st.fallback+'</b></div>'
    +opts
    +'<div class="callout warn">'+ic("lock",16)+'<div>The agent <b>never</b> self-escalates. This approval is recorded in the tasking log with module ID, probe result, outcome and cleanup status.</div></div>'
    +'<div id="escProg"></div>',
    { icon:"key", foot:'<button class="btn ghost" onclick="closeModal()">Deny</button><button class="btn approve" id="escGo" onclick="UI.doEscalate(\''+aid+'\')">'+ic("key",14)+' Approve & run</button>' });
}
function UI_doEscalate(aid){
  const sel=document.querySelector('input[name="escmod"]:checked');
  if(!sel){ toast("Select a viable module first.","warn"); return; }
  const prog=document.getElementById("escProg");
  document.getElementById("escGo").disabled=true;
  const steps=["probe("+sel.value+") → viable, non-destructive","escalate() executing through jrt-core in-memory substrate…","escalate() SUCCESS — L1 handle acquired","cleanup() — artifacts removed, idempotent","re-probe at L1 — reporting to C2"];
  let i=0;
  prog.innerHTML='<div class="progress mt"><i id="escBar" style="width:5%"></i></div><div class="mini mt" id="escMsg">'+steps[0]+'</div>';
  const tick=setInterval(function(){
    i++;
    if(i<steps.length){
      document.getElementById("escBar").style.width=(5+i/steps.length*95)+"%";
      document.getElementById("escMsg").textContent=steps[i];
    }else{
      clearInterval(tick);
      const a=agentById(aid);
      a.priv="L1"; a.privSource="jrt-escalate · "+sel.value+" (approved by "+S.user.handle+")";
      a.notes="Escalated L0→L1. blind() now available (L1 → BYOVD → L2) pending separate approval.";
      a.degrade=["blind(): run pre-flight before any driver load (§6.2)"];
      DATA.escalationLog.unshift({ t:"2026-09-29 09:55:00Z", agent:aid, module:sel.value, probe:"viable", outcome:"SUCCESS — L1 acquired", cleanup:"clean — no artifacts", by:S.user.handle });
      DATA.audit.unshift({t:"2026-09-29 09:55:00Z",actor:S.user.handle,act:"ESCALATE_APPROVE",detail:"jrt-escalate approved: "+aid+" · "+sel.value,sig:"new…",cat:"privilege"});
      closeModal(); renderView();
      toast("<b>"+aid+"</b> escalated to L1 via "+esc(sel.value)+".");
    }
  }, 900);
}
function UI_decommission(aid){
  if(!can("decommission")){ toast("Decommission requires role: <b>operator</b>.","bad"); return; }
  const a=agentById(aid);
  openModal("Decommission "+aid,
    '<p class="mini">Lifecycle final step (§8.2): dispatch cleanup task → agent wipes its memory footprint → final confirmation → console marks decommissioned. This ends tasking for <b class="mono">'+aid+'</b>.</p>'
    +'<div class="callout warn">'+ic("alert",16)+'<div>Irreversible in this session. Result store for the mission is retained (encrypted SQLite).</div></div>',
    { icon:"x", foot:'<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn danger" onclick="UI.doDecommission(\''+aid+'\')">Decommission agent</button>' });
}
function UI_doDecommission(aid){
  const a=agentById(aid);
  a.status="offline"; a.lifecycle="decommissioned"; a.lastSeen="just now";
  a.notes="Decommissioned: cleanup task executed, memory footprint wiped, final confirmation received.";
  DATA.tasks.unshift({id:"T-"+(S.feedN++),mission:a.mission,agent:aid,payload:"decommission: cleanup + wipe",pri:"P0",minPriv:"L0",state:"complete",since:"—",note:"final confirmation received"});
  DATA.audit.unshift({t:"2026-09-29 09:56:00Z",actor:S.user.handle,act:"DECOMMISSION",detail:aid+" decommissioned — footprint wiped",sig:"new…",cat:"mission"});
  closeModal(); renderView(); toast("<b>"+aid+"</b> decommissioned.");
}

/* ---------------- BLINDING (jrt-blind, §6.2) ---------------- */
function vBlinding(){
  const pre=DATA.blindPreflight.map(function(p){
    return '<tr><td class="mono">check '+p.n+'</td><td class="mini">'+esc(p.q)+'</td><td>'+badge("done","ok")+'</td><td class="mono mini">'+esc(p.result)+'</td></tr>';
  }).join("");
  const drv=DATA.blindDrivers.map(function(d){
    return '<tr><td class="mono">'+esc(d.drv)+'</td><td>'+(d.status==="VIABLE"?badge("viable","ok"):badge("blocked","bad"))+'</td><td class="mini">'+esc(d.reason)+'</td></tr>';
  }).join("");
  const acts=DATA.blindActionsWin.map(function(x){
    return '<tr><td class="mini">'+esc(x.a)+'</td><td>'+badge("callback stripped","ok")+'</td><td class="mini">'+esc(x.out)+'</td></tr>';
  }).join("");
  const lin=DATA.blindLinuxMatrix.map(function(r){
    return '<tr><td><b>'+esc(r.posture)+'</b></td><td class="mini">'+esc(r.probe)+'</td><td class="mini">'+esc(r.approach)+'</td>'
      +'<td>'+(r.hard?badge("hard limit","bad"):badge("handled","ok"))+'<span class="sub">'+esc(r.limits)+'</span></td></tr>';
  }).join("");
  const o=DATA.blindOutcome;
  return pageHead("jrt-blind · L1 → L2","The PS 3B sensor-blinding module — the only component touching kernel state. Privilege-declared, HVCI-profiled, single-shot, operator-approved, never by default.",
      '<button class="btn primary" onclick="UI.blindRun()">'+ic("eye",14)+' New blind() invocation</button>')
    +'<div class="callout bad">'+ic("alert",16)+'<div><b>Honest limit (Windows).</b> The Microsoft Vulnerable Driver Blocklist is comprehensive and growing. On fully updated Windows 11 with HVCI + blocklist enabled, kernel-level blinding is effectively unavailable — <span class="mono">blind()</span> reports degraded mode instead. This is stated in §11, not hidden.</div></div>'
    +'<div class="grid g2">'
    +'<div class="card"><div class="head">'+ic("shield",15)+' Windows · BYOVD pre-flight <span class="sub">run before any driver load attempt</span></div>'
    +'<div class="tbl-wrap"><table class="table"><thead><tr><th>#</th><th>Check</th><th>Status</th><th>Result</th></tr></thead><tbody>'+pre+'</tbody></table></div>'
    +'<div class="body"><h4 style="margin:2px 0 8px;font-size:13px">Driver set × live blocklist</h4>'
    +'<table class="table"><thead><tr><th>Driver</th><th>Status</th><th>Reason</th></tr></thead><tbody>'+drv+'</tbody></table>'
    +'<div class="callout warn">'+ic("info",16)+'<div>Driver set is updatable via the CI pipeline; new additions are checked against the live blocklist before deployment. If no driver is viable (common on updated Win 11), collection continues at L1 with the full §2.1 envelope — or a legitimately signed WinPmem-class driver is used for memory access (a forensic tool, not an exploit).</div></div></div></div>'
    +'<div class="card"><div class="head">'+ic("term",15)+' Linux · blinding by security posture</div>'
    +'<div class="tbl-wrap"><table class="table"><thead><tr><th>Posture</th><th>Probe</th><th>Approach</th><th>Outcome</th></tr></thead><tbody>'+lin+'</tbody></table></div>'
    +'<div class="body"><div class="mini"><b>Linux blind() sequence:</b> Probe → report capability matrix to C2 → operator approves → flush audit rules (if not immutable) → stop auditd → detach/replace eBPF programs → unload/neutralize LKM monitors → report outcome → proceed with collection.</div></div></div>'
    +'</div>'
    +'<div class="grid g2 mt"><div class="card"><div class="head">'+ic("bolt",15)+' If viable: kernel actions <span class="sub">BYOVD loader → kernel R/W</span></div>'
    +'<div class="tbl-wrap"><table class="table"><thead><tr><th>Action</th><th>Effect</th><th>Reported to tasking record</th></tr></thead><tbody>'+acts+'</tbody></table></div></div>'
    +'<div class="card"><div class="head">'+ic("check",15)+' Last reported outcome <span class="sub">blind() reports its own outcome</span></div><div class="body">'
    +'<div class="kv"><div>Agent</div><div class="mono">'+o.agent+' · '+o.when+'</div>'
    +'<div>Mode</div><div class="mini">'+esc(o.mode)+'</div>'
    +'<div>Callbacks stripped</div><div class="mono">'+o.callbacksStripped+' notify-routine + '+o.objectCallbacks+' ObCallback</div>'
    +'<div>Sessions killed</div><div class="mono">'+o.sessionsKilled+' EDR trace sessions</div>'
    +'<div>Rules flushed</div><div class="mono">'+o.rulesFlushed+' audit rules</div>'
    +'<div>Approved by</div><div class="mini">'+esc(o.approvedBy)+' · task record '+o.taskRecord+'</div></div>'
    +'<div class="mini mt">Post-blind operations (§6.3): injection, collection, persistence, C2 proceed with local telemetry largely silent. Network-level and out-of-host sensors are unaffected (P5 honesty).</div>'
    +'</div></div></div>';
}
function UI_blindRun(preAgent){
  if(!can("blind.run")){ toast("Invoking blind() requires role: <b>operator</b>.","bad"); return; }
  const elig=DATA.agents.filter(function(a){return a.lifecycle!=="decommissioned";});
  openModal("Approve blind() invocation",
    '<div class="field"><label>Target agent (must already hold L1)</label><select class="input mono" id="blAgent">'
    +elig.map(function(a){return '<option value="'+a.id+'"'+(preAgent===a.id?" selected":"")+'>'+a.id+' · '+esc(a.host)+' · '+a.priv+'</option>';}).join("")+'</select></div>'
    +'<div class="grid g2"><div class="field"><label>Mode</label><select class="input mono" id="blMode"><option>BYOVD (Windows)</option><option>posture-driven (Linux)</option></select></div>'
    +'<div class="field"><label>Profile</label><select class="input mono"><option>AUTO (HVCI-aware)</option><option>data-only (pool writes, callback arrays)</option></select></div></div>'
    +'<div class="callout bad">'+ic("alert",16)+'<div><b>Single-shot, never by default.</b> Runs before the first sensitive operation only when the operator asks. HVCI present → data-only profile; kernel-code patching is disabled, never attempted.</div></div>'
    +'<div id="blProg"></div>',
    { icon:"eye", foot:'<button class="btn ghost" onclick="closeModal()">Deny</button><button class="btn approve" id="blGo" onclick="UI.doBlind()">'+ic("eye",14)+' Approve & invoke</button>' });
}
function UI_doBlind(){
  const aid=document.getElementById("blAgent").value;
  const a=agentById(aid);
  if(agentRank(a)<1){ toast("Agent "+aid+" is "+a.priv+" — blind() requires L1 as precondition. Escalate first.","bad"); return; }
  document.getElementById("blGo").disabled=true;
  const prog=document.getElementById("blProg");
  const hvci = a.env.hvci===true;
  const steps=["pre-flight: blocklist cross-reference…","BYOVD loader / posture probe…",
    hvci?"HVCI detected → data-only profile (pool writes, callback arrays)":"kernel R/W acquired — stripping callback arrays…",
    "corrupting EDR trace sessions…","outcome reported to tasking record"];
  let i=0;
  prog.innerHTML='<div class="progress mt"><i id="blBar" style="width:5%"></i></div><div class="mini mt" id="blMsg">'+steps[0]+'</div>';
  const tick=setInterval(function(){
    i++;
    if(i<steps.length){ document.getElementById("blBar").style.width=(5+i/steps.length*95)+"%"; document.getElementById("blMsg").textContent=steps[i]; }
    else{
      clearInterval(tick);
      if(!hvci){ a.priv="L2"; a.privSource="jrt-blind · approved by "+S.user.handle; }
      else { a.degrade=["blind(): data-only profile — HVCI blocked kernel-code path (§11)"]; }
      a.notes="blind() invoked 2026-09-29 (tasking record). Outcome reported: callbacks/sessions/rules counts in log.";
      DATA.audit.unshift({t:"2026-09-29 09:57:00Z",actor:S.user.handle,act:"BLIND_APPROVE",detail:"blind() approved for "+aid+(hvci?" · data-only (HVCI)":" · L2"),sig:"new…",cat:"privilege"});
      DATA.tasks.unshift({id:"T-"+(S.feedN++),mission:a.mission,agent:aid,payload:"blind(mode: BYOVD, profile: AUTO)",pri:"P0",minPriv:"L2",state:"complete",since:"—",note:"outcome reported"});
      closeModal(); renderView();
      toast(hvci?"<b>"+aid+"</b>: blind() completed in <b>data-only</b> mode (HVCI present).":"<b>"+aid+"</b> reached L2 — sensor blinding reported.");
    }
  }, 900);
}
