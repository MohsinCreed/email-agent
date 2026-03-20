import { useState, useEffect } from "react";

/* ─── Color tokens ───────────────────────────────────── */
const T = {
  bg0:      "#080F17",   // deepest bg
  bg1:      "#0D1B28",   // page bg
  bg2:      "#111F2E",   // card bg
  bg3:      "#162840",   // card hover / raised
  border:   "#1E3350",   // subtle borders
  border2:  "#264466",   // stronger borders
  yellow:   "#FFDA02",   // Joblogic secondary — hero accent
  yellowDim:"#FFDA0222", // yellow fill tint
  blue:     "#0056B3",   // tertiary
  blueDim:  "#0056B314",
  navy:     "#213A54",   // primary
  white:    "#F0F5FB",   // primary text
  muted:    "#5B7A96",   // secondary text
  faint:    "#2A4060",   // very muted
  green:    "#22C55E",
  amber:    "#F59E0B",
  red:      "#EF4444",
  onYellow: "#080F17",
};

const CLS_COLORS = {
  Job:         { dot:"#3B82F6", bg:"#1E3A8A22", text:"#60A5FA", border:"#1E3A8A55" },
  Quote:       { dot:"#10B981", bg:"#06443022", text:"#34D399", border:"#06443055" },
  PPM:         { dot:"#A855F7", bg:"#7C3AED22", text:"#C084FC", border:"#7C3AED55" },
  Invoice:     { dot:"#F59E0B", bg:"#92400E22", text:"#FBB048", border:"#92400E55" },
  Combination: { dot:"#EC4899", bg:"#9D174D22", text:"#F472B6", border:"#9D174D55" },
  Other:       { dot:"#6B7280", bg:"#37415122", text:"#9CA3AF", border:"#37415155" },
};

const WORKFLOWS = [
  { id:1,  name:"Log New Job",         trigger:"Job",         direction:"Inbound",  active:true,  runs:142, lastRun:"2m ago",  rc:true,  description:"Extracts customer details, site address, fault description and urgency from inbound email. Creates a draft job record in the FSM system held for human review before any engineer is assigned." },
  { id:2,  name:"Generate Quote",      trigger:"Quote",       direction:"Inbound",  active:true,  runs:87,  lastRun:"1h ago",  rc:true,  description:"Parses scope of works, site details and budget from quote request. Matches against service catalogue and prepares a draft quote with line items requiring human approval before sending." },
  { id:3,  name:"Schedule PPM",        trigger:"PPM",         direction:"Inbound",  active:true,  runs:34,  lastRun:"3h ago",  rc:false, description:"Extracts site locations, asset types and service intervals from PPM schedule emails. Creates recurring maintenance tasks in the calendar pending confirmation." },
  { id:4,  name:"Process Invoice",     trigger:"Invoice",     direction:"Inbound",  active:false, runs:56,  lastRun:"1d ago",  rc:true,  description:"Matches invoice to existing job records and checks amounts against agreed rates. Routes discrepancies to accounts with a summary before any action is taken." },
  { id:5,  name:"Combination Handler", trigger:"Combination", direction:"Inbound",  active:true,  runs:19,  lastRun:"2d ago",  rc:false, description:"Splits multi-request emails into sub-tasks and triggers the relevant workflow for each. Every sub-workflow follows its own configured approval process independently." },
  { id:6,  name:"General Triage",      trigger:"Other",       direction:"Inbound",  active:true,  runs:203, lastRun:"5m ago",  rc:true,  description:"Summarises unclassified emails and suggests the most likely category. Flags for manual review — no automated actions until a human assigns the correct workflow." },
  { id:7,  name:"Quote Follow-Up",     trigger:"Quote",       direction:"Outbound", active:true,  runs:41,  lastRun:"30m ago", rc:true,  description:"Triggered when a quote sits in Pending Approval for 48+ hours. Drafts a polite follow-up referencing the original quote number and detail, held for human approval before sending." },
  { id:8,  name:"Job Confirmation",    trigger:"Job",         direction:"Outbound", active:true,  runs:98,  lastRun:"10m ago", rc:true,  description:"Triggered when a job is approved and assigned. Drafts a confirmation email with job ref, engineer details and arrival window — requires human sign-off before customer receives it." },
  { id:9,  name:"Invoice Reminder",    trigger:"Invoice",     direction:"Outbound", active:false, runs:22,  lastRun:"1d ago",  rc:true,  description:"Triggered when an invoice passes its due date by 7+ days. Drafts a payment reminder with outstanding amount and payment details. Inactive until credit control policy is confirmed." },
];

const THREADS = [
  { id:"T1", subject:"Urgent: AC Unit broken at Site B", classification:"Job", lastTime:"09:16", lastDate:"2026-03-20", unread:true,
    messages:[
      { id:"T1-1", from:"john.smith@acmecorp.com",       dir:"Inbound",  time:"09:14", wfId:1, status:"received", body:"Hi,\n\nOur AC unit at Site B has stopped working — we need an engineer ASAP. Unit is Daikin 36BTU, installed 2019. Customer ref: ACME-001.\n\nPlease advise on earliest availability.\n\nJohn Smith" },
      { id:"T1-2", from:"ops@yourfsm.com", to:"john.smith@acmecorp.com", dir:"Outbound", time:"09:16", wfId:8, status:"draft", ai:true, body:"Dear John,\n\nThank you for contacting us. Your request has been logged under job reference JOB-2026-0441.\n\nAn engineer has been provisionally scheduled — you will receive a confirmed visit window within 2 hours. Please ensure safe access to the unit.\n\nFSM Operations Team" },
    ]},
  { id:"T2", subject:"Quote Request – Plumbing Works", classification:"Quote", lastTime:"09:05", lastDate:"2026-03-20", unread:true,
    messages:[
      { id:"T2-1", from:"procurement@buildright.co.uk",  dir:"Inbound",  time:"08:55", wfId:2, status:"received", body:"Hi,\n\nWe need a formal quote for plumbing works at our new development. Budget ~£15,000, timeline Q2 2026. Spec attached.\n\nBuildRight Procurement" },
      { id:"T2-2", from:"ops@yourfsm.com", to:"procurement@buildright.co.uk", dir:"Outbound", time:"09:05", wfId:2, status:"draft", ai:true, body:"Dear Procurement Team,\n\nThank you for your request. Our indicative quote:\n\n• Labour (5 days @ £650/day): £3,250\n• Materials: £9,100\n• Mobilisation: £800\n• Contingency (10%): £1,315\n• Total (ex. VAT): £14,465\n\nSubject to site survey. Ref: QT-2026-0182.\n\nFSM Operations Team" },
    ]},
  { id:"T3", subject:"March 2026 PPM Schedule – GreenTech", classification:"PPM", lastTime:"Yesterday", lastDate:"2026-03-19", unread:false,
    messages:[
      { id:"T3-1", from:"facilities@greentech.com",      dir:"Inbound",  time:"Tue 14:20", wfId:3, status:"received", body:"Hi team,\n\nPlease find the March 2026 PPM schedule for all 12 GreenTech sites attached. Please confirm receipt and that tasks are loaded.\n\nFacilities, GreenTech" },
      { id:"T3-2", from:"ops@yourfsm.com", to:"facilities@greentech.com", dir:"Outbound", time:"Tue 14:35", wfId:8, status:"sent", ai:true, body:"Dear Facilities Team,\n\nConfirmed — March 2026 PPM schedule received. All tasks loaded across 12 sites and engineers assigned. Individual visit confirmations to follow.\n\nFSM Operations Team" },
    ]},
  { id:"T4", subject:"Invoice Query – INV-2024-0892", classification:"Invoice", lastTime:"Yesterday", lastDate:"2026-03-19", unread:false,
    messages:[
      { id:"T4-1", from:"accounts@northstar.co.uk",      dir:"Inbound",  time:"Tue 10:05", wfId:4, status:"received", body:"Hi,\n\nINV-2024-0892 for £4,200 doesn't match our PO-NS-0034 raised for £3,800. Could you clarify the discrepancy?\n\nNorthStar Accounts" },
    ]},
  { id:"T5", subject:"New Job + Invoice – City Plaza", classification:"Combination", lastTime:"Mon", lastDate:"2026-03-18", unread:false,
    messages:[
      { id:"T5-1", from:"ops@citywide.com",              dir:"Inbound",  time:"Mon 11:30", wfId:5, status:"received", body:"Hi,\n\n1) Urgent drainage inspection needed at City Plaza.\n2) Please send invoice for electrical work completed 14th March.\n\nCitywide FM" },
    ]},
  { id:"T6", subject:"Follow-Up – Quote QT-2026-0175", classification:"Quote", lastTime:"08:30", lastDate:"2026-03-20", unread:false,
    messages:[
      { id:"T6-1", from:"ops@yourfsm.com", to:"sarah.jones@retailgroup.com", dir:"Outbound", time:"08:30", wfId:7, status:"draft", ai:true, body:"Dear Sarah,\n\nFollowing up on quote QT-2026-0175 sent 3 days ago for electrical maintenance works at your retail units. We wanted to check if you have any questions or require any amendments.\n\nFSM Operations Team" },
    ]},
  { id:"T7", subject:"Overdue Notice – INV-2024-0790", classification:"Invoice", lastTime:"Mon", lastDate:"2026-03-18", unread:false,
    messages:[
      { id:"T7-1", from:"ops@yourfsm.com", to:"accounts@northstar.co.uk", dir:"Outbound", time:"Mon 09:00", wfId:9, status:"sent", ai:true, body:"Dear Accounts Team,\n\nINV-2024-0790 for £3,450 is now 7 days overdue. Please arrange payment at your earliest convenience.\n\nBank: HSBC | Sort: 40-12-34 | Acc: 12345678\n\nFSM Finance Team" },
    ]},
  { id:"T8", subject:"Boiler Fault – Bridge Hotel", classification:"Job", lastTime:"Mon", lastDate:"2026-03-18", unread:false,
    messages:[
      { id:"T8-1", from:"mark.patel@bridgehotel.co.uk",  dir:"Inbound",  time:"Fri 08:45", wfId:1, status:"received", body:"Hi,\n\nBoiler in the plant room has been making a loud banging noise since this morning. Need someone urgently.\n\nMark Patel, Facilities Manager" },
      { id:"T8-2", from:"ops@yourfsm.com", to:"mark.patel@bridgehotel.co.uk", dir:"Outbound", time:"Mon 09:15", wfId:8, status:"sent", ai:true, body:"Dear Mark,\n\nJob logged and approved. Ref: JOB-2026-0438.\n\nEngineer: Tom Richards — on site by 2:00 PM today. Please ensure plant room access.\n\nFSM Operations Team" },
    ]},
];

const DATE_PRESETS = ["Today","Yesterday","Last 7 days","Last 30 days","Custom"];
const FONTS = ["DM Sans","Georgia","Helvetica Neue","Trebuchet MS","Garamond","Courier New"];

const NAV = [
  { id:"dashboard",      label:"Dashboard",       icon:"M3 12L5 10M5 10L12 3L19 10M5 10V20A1 1 0 001 21H9M19 10V20A1 1 0 0020 21H16M9 21A1 1 0 009 20V16A1 1 0 0110 15H14A1 1 0 0115 16V20A1 1 0 0016 21M9 21H16" },
  { id:"mail",           label:"Mail",            icon:"M3 8L10.89 13.26A2 2 0 0013.11 13.26L21 8M5 19H19A2 2 0 0021 17V7A2 2 0 0019 5H5A2 2 0 003 7V17A2 2 0 005 19Z", badge:9 },
  { id:"workflows",      label:"Workflows",       icon:"M13 10V3L4 14H11V21L20 10H13Z" },
  { id:"personalization",label:"Personalization", icon:"M10.325 4.317C10.751 2.561 13.249 2.561 13.675 4.317A1.724 1.724 0 0015.571 5.402A1.724 1.724 0 0017.606 3.5C18.93 2.294 20.971 3.715 20.292 5.35A1.724 1.724 0 0021.5 7.499A1.724 1.724 0 0023.253 9.175C24.43 10.366 23.63 12.5 21.5 12.5A1.724 1.724 0 0019.93 14.175A1.724 1.724 0 0020.292 16.65C20.971 18.285 18.93 19.706 17.606 18.5A1.724 1.724 0 0015.571 17.598A1.724 1.724 0 0013.675 18.683C13.249 20.439 10.751 20.439 10.325 18.683A1.724 1.724 0 008.429 17.598A1.724 1.724 0 006.394 19.5C5.07 20.706 3.029 19.285 3.708 17.65A1.724 1.724 0 002.5 15.501A1.724 1.724 0 00.747 13.825C-.43 12.634.37 10.5 2.5 10.5A1.724 1.724 0 004.07 8.825A1.724 1.724 0 003.708 6.35C3.029 4.715 5.07 3.294 6.394 4.5A1.724 1.724 0 008.429 5.402A1.724 1.724 0 0010.325 4.317Z M12 15A3 3 0 100 6 3 3 0 000-6Z" },
];

/* ══════════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════════ */
export default function App() {
  const [page,    setPage]    = useState("dashboard");
  const [thread,  setThread]  = useState(null);
  const [navOpen, setNavOpen] = useState(true);
  const [wfSt,    setWfSt]    = useState(
    WORKFLOWS.reduce((a,w)=>({...a,[w.id]:{active:w.active,rc:w.rc}}),{})
  );
  const toggleWf = id => setWfSt(p=>({...p,[id]:{...p[id],active:!p[id].active}}));
  const toggleRc = id => setWfSt(p=>({...p,[id]:{...p[id],rc:!p[id].rc}}));

  const W = navOpen ? 220 : 64;

  return (
    <div style={{ display:"flex", height:"100vh", background:T.bg1, color:T.white, fontFamily:"'Outfit','DM Sans','Segoe UI',sans-serif", overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${T.faint};border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{background:${T.muted}}
        .hov{transition:all .14s}
        .hov:hover{background:${T.bg3}!important;border-color:${T.border2}!important}
        .trow{cursor:pointer;transition:all .14s;border-left:2px solid transparent}
        .trow:hover{background:${T.bg3}!important}
        .trow.sel{background:${T.bg3}!important;border-left-color:${T.yellow}!important}
        .ts-toggle{position:relative;width:36px;height:19px;flex-shrink:0}
        .ts-toggle input{opacity:0;width:0;height:0}
        .ts-sl{position:absolute;cursor:pointer;inset:0;background:${T.faint};border-radius:20px;transition:.25s}
        .ts-sl:before{content:"";position:absolute;width:13px;height:13px;left:3px;top:3px;background:${T.muted};border-radius:50%;transition:.25s}
        input:checked+.ts-sl{background:${T.yellow}22;border:1px solid ${T.yellow}66}
        input:checked+.ts-sl:before{background:${T.yellow};transform:translateX(17px)}
        .fi{border:1px solid ${T.border};border-radius:7px;padding:7px 10px;font-size:12.5px;outline:none;color:${T.white};width:100%;background:${T.bg2};font-family:inherit;transition:border .15s}
        .fi:focus{border-color:${T.yellow}66}
        .fs{border:1px solid ${T.border};border-radius:7px;padding:7px 10px;font-size:12.5px;outline:none;color:${T.white};width:100%;background:${T.bg2};cursor:pointer;font-family:inherit}
        .card{background:${T.bg2};border:1px solid ${T.border};border-radius:14px}
        .pill{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:10.5px;font-weight:600;white-space:nowrap}
        .btn-y{background:${T.yellow};color:${T.onYellow};border:none;padding:8px 18px;border-radius:8px;font-weight:700;font-size:12.5px;cursor:pointer;font-family:inherit;transition:all .15s}
        .btn-y:hover{filter:brightness(1.08);transform:translateY(-1px)}
        .btn-g{background:${T.bg3};color:${T.white};border:1px solid ${T.border2};padding:7px 14px;border-radius:8px;font-weight:500;font-size:12.5px;cursor:pointer;font-family:inherit;transition:all .15s}
        .btn-g:hover{border-color:${T.muted}}
        .tab-btn{padding:7px 14px;border:none;background:none;font-family:inherit;font-size:12.5px;font-weight:500;cursor:pointer;color:${T.muted};border-radius:8px;transition:all .14s;white-space:nowrap}
        .tab-btn.on{background:${T.yellowDim};color:${T.yellow};font-weight:700;outline:1px solid ${T.yellow}44}
        .glow-dot{width:7px;height:7px;border-radius:50%;background:${T.green};box-shadow:0 0 6px ${T.green};flex-shrink:0}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .pulse{animation:pulse 2s ease-in-out infinite}
      `}</style>

      {/* ── SIDEBAR ── */}
      <div style={{ width:W, background:T.bg0, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", flexShrink:0, transition:"width .22s ease", overflow:"hidden" }}>

        {/* Logo */}
        <div style={{ padding:"18px 14px 14px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:10, minHeight:64 }}>
          <div style={{ width:34, height:34, background:T.yellow, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path d="M3 8L10.89 13.26A2 2 0 0013.11 13.26L21 8M5 19H19A2 2 0 0021 17V7A2 2 0 0019 5H5A2 2 0 003 7V17A2 2 0 005 19Z" stroke={T.onYellow} strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          {navOpen && <div>
            <div style={{ color:T.white, fontWeight:800, fontSize:13.5, lineHeight:1.2, letterSpacing:"-0.2px" }}>Email AI Agent</div>
            <div style={{ color:T.muted, fontSize:10.5 }}>FSM Control Panel</div>
          </div>}
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:"12px 8px", display:"flex", flexDirection:"column", gap:2, overflowY:"auto" }}>
          {NAV.map(item => {
            const on = page === item.id;
            return (
              <div key={item.id}
                onClick={()=>{ setPage(item.id); setThread(null); }}
                style={{ display:"flex", alignItems:"center", gap:10, padding:navOpen?"10px 12px":"10px", borderRadius:10, cursor:"pointer", background:on?T.yellowDim:"transparent", outline:on?`1px solid ${T.yellow}33`:"none", color:on?T.yellow:T.muted, fontWeight:on?700:400, fontSize:13, transition:"all .14s", position:"relative" }}
                className="hov"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" style={{ flexShrink:0, opacity:on?1:0.6 }}>
                  <path d={item.icon} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {navOpen && <span style={{ flex:1, whiteSpace:"nowrap" }}>{item.label}</span>}
                {navOpen && item.badge && (
                  <span style={{ background:T.yellow, color:T.onYellow, fontSize:9.5, fontWeight:800, padding:"1px 6px", borderRadius:10, lineHeight:1.5 }}>{item.badge}</span>
                )}
                {!navOpen && item.badge && (
                  <span style={{ position:"absolute", top:6, right:6, width:6, height:6, background:T.yellow, borderRadius:"50%" }}></span>
                )}
              </div>
            );
          })}
        </nav>

        {/* Status + collapse */}
        <div style={{ padding:"10px 8px 14px", borderTop:`1px solid ${T.border}` }}>
          {navOpen && (
            <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 12px", marginBottom:8, display:"flex", alignItems:"center", gap:8 }}>
              <div className="glow-dot pulse"></div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11.5, fontWeight:600, color:T.white }}>Agent Running</div>
                <div style={{ fontSize:10, color:T.muted }}>Last email: 2m ago</div>
              </div>
            </div>
          )}
          <button onClick={()=>setNavOpen(!navOpen)}
            style={{ width:"100%", padding:"8px", background:"transparent", border:`1px solid ${T.border}`, borderRadius:8, color:T.muted, cursor:"pointer", fontSize:12, fontFamily:"inherit", transition:"all .14s" }}
            className="hov">
            {navOpen ? "← Collapse" : "→"}
          </button>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Topbar */}
        <div style={{ background:T.bg0, borderBottom:`1px solid ${T.border}`, padding:"0 24px", height:52, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ fontSize:11.5, color:T.muted, letterSpacing:"0.08em", textTransform:"uppercase", fontWeight:600 }}>
            {NAV.find(n=>n.id===page)?.label}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ fontSize:11.5, color:T.muted }}>Fri 20 Mar 2026</div>
            <div style={{ width:1, height:16, background:T.border }}></div>
            <div style={{ width:30, height:30, background:`linear-gradient(135deg,${T.navy},${T.blue})`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:11, fontWeight:700, border:`2px solid ${T.border2}` }}>JD</div>
          </div>
        </div>

        {/* Page */}
        <div style={{ flex:1, overflowY:"auto", padding:22 }}>
          {page==="dashboard"       && <Dashboard />}
          {page==="mail"            && <MailView thread={thread} setThread={setThread} />}
          {page==="workflows"       && <WorkflowsView wfSt={wfSt} toggleWf={toggleWf} toggleRc={toggleRc} />}
          {page==="personalization" && <PersonalizationView />}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════ */
function Dashboard() {
  const [preset, setPreset] = useState("Today");
  const [cf, setCf] = useState(""); const [ct, setCt] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(()=>{ const t=setInterval(()=>setTick(p=>p+1),3000); return()=>clearInterval(t); },[]);

  const ACTIVITY = [
    { time:"09:16", icon:"✓", color:T.green,  text:"Job JOB-2026-0441 drafted — awaiting approval" },
    { time:"09:05", icon:"✓", color:T.green,  text:"Quote QT-2026-0182 generated for BuildRight" },
    { time:"08:55", icon:"●", color:T.yellow, text:"New quote request received from BuildRight" },
    { time:"08:30", icon:"↑", color:T.blue,   text:"Follow-up drafted for QT-2026-0175" },
    { time:"08:14", icon:"✓", color:T.green,  text:"PPM schedule loaded — 12 GreenTech sites" },
    { time:"07:52", icon:"!",  color:T.amber,  text:"Invoice query flagged for manual review" },
    { time:"07:30", icon:"●", color:T.yellow, text:"3 inbound emails classified on startup" },
  ];

  return (
    <div>
      {/* Header row */}
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:22, gap:16, flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:T.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:4 }}>Good morning, James</div>
          <h1 style={{ fontSize:28, fontWeight:900, color:T.white, letterSpacing:"-0.8px", lineHeight:1 }}>
            AI Email <span style={{ color:T.yellow }}>Overview</span>
          </h1>
        </div>
        {/* Date pills */}
        <div style={{ display:"flex", alignItems:"center", gap:4, background:T.bg2, border:`1px solid ${T.border}`, borderRadius:10, padding:"5px" }}>
          {DATE_PRESETS.map(p=>(
            <button key={p} onClick={()=>setPreset(p)}
              style={{ padding:"5px 11px", borderRadius:7, border:"none", background:preset===p?T.yellow:"transparent", color:preset===p?T.onYellow:T.muted, fontFamily:"inherit", fontSize:11.5, fontWeight:preset===p?700:400, cursor:"pointer", transition:"all .14s" }}>
              {p}
            </button>
          ))}
          {preset==="Custom" && (
            <div style={{ display:"flex", gap:6, alignItems:"center", marginLeft:4 }}>
              <input type="date" value={cf} onChange={e=>setCf(e.target.value)} className="fi" style={{ width:130 }}/>
              <span style={{ color:T.muted, fontSize:11 }}>–</span>
              <input type="date" value={ct} onChange={e=>setCt(e.target.value)} className="fi" style={{ width:130 }}/>
              <button className="btn-y" style={{ padding:"7px 11px" }}>Go</button>
            </div>
          )}
        </div>
      </div>

      {/* Big stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
        {[
          { label:"Emails today",    value:"47",  sub:"+12% vs yesterday",    accent:T.yellow, up:true  },
          { label:"Auto-processed",  value:"38",  sub:"81% automation rate",  accent:T.blue,   up:true  },
          { label:"Pending review",  value:"9",   sub:"3 fewer than yesterday",accent:T.amber, up:false },
          { label:"Workflows fired", value:"124", sub:"+8% vs yesterday",     accent:T.green,  up:true  },
        ].map(s=>(
          <div key={s.label} className="card hov" style={{ padding:"18px 20px", cursor:"default" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <span style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:"0.08em" }}>{s.label}</span>
              <div style={{ width:6, height:6, borderRadius:"50%", background:s.accent, boxShadow:`0 0 8px ${s.accent}88` }}></div>
            </div>
            <div style={{ fontSize:38, fontWeight:900, color:T.white, letterSpacing:"-2px", lineHeight:1, marginBottom:6 }}>{s.value}</div>
            <div style={{ fontSize:11, color:s.up?"#34D399":"#F87171", fontWeight:500 }}>
              {s.up?"↑":"↓"} {s.sub}
            </div>
            <div style={{ marginTop:10, height:2, background:T.border, borderRadius:2 }}>
              <div style={{ height:"100%", width:s.up?"72%":"38%", background:s.accent, borderRadius:2, opacity:0.7 }}></div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:14 }}>

        {/* Left: Classification + Workflow grid */}
        <div style={{ display:"grid", gap:14 }}>

          {/* Classification breakdown */}
          <div className="card" style={{ padding:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:16 }}>Classification breakdown</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
              {[["Job",38],["Quote",22],["PPM",17],["Invoice",12],["Combination",7],["Other",4]].map(([l,p])=>{
                const c=CLS_COLORS[l];
                return (
                  <div key={l} style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:10, padding:"12px 14px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:c.text }}>{l}</span>
                      <span style={{ fontSize:18, fontWeight:900, color:T.white }}>{p}%</span>
                    </div>
                    <div style={{ background:T.bg0, borderRadius:4, height:4 }}>
                      <div style={{ background:c.dot, width:`${p*2.5}%`, height:"100%", borderRadius:4 }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active workflows mini grid */}
          <div className="card" style={{ padding:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:16 }}>Active workflows</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
              {WORKFLOWS.filter(w=>w.active).map(wf=>{
                const c=CLS_COLORS[wf.trigger];
                return (
                  <div key={wf.id} style={{ background:T.bg1, border:`1px solid ${T.border}`, borderRadius:9, padding:"11px 12px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                      <span style={{ fontSize:11.5, fontWeight:700, color:T.white, lineHeight:1.3 }}>{wf.name}</span>
                      <span style={{ width:5, height:5, borderRadius:"50%", background:c.dot, flexShrink:0, marginTop:2 }}></span>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:10.5 }}>
                      <span style={{ color:c.text, fontWeight:700 }}>{wf.runs} runs</span>
                      <span style={{ color:T.muted }}>{wf.lastRun}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Activity feed */}
        <div className="card" style={{ padding:20, display:"flex", flexDirection:"column" }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:16 }}>Live activity</div>
          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:0 }}>
            {ACTIVITY.map((a,i)=>(
              <div key={i} style={{ display:"flex", gap:10, padding:"9px 0", borderBottom:i<ACTIVITY.length-1?`1px solid ${T.border}`:"none" }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:0, paddingTop:2 }}>
                  <div style={{ width:20, height:20, borderRadius:6, background:`${a.color}22`, border:`1px solid ${a.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, color:a.color, fontWeight:900, flexShrink:0 }}>
                    {a.icon}
                  </div>
                  {i<ACTIVITY.length-1 && <div style={{ width:1, flex:1, background:T.border, marginTop:4, minHeight:8 }}></div>}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11.5, color:T.white, lineHeight:1.4 }}>{a.text}</div>
                  <div style={{ fontSize:10, color:T.muted, marginTop:2 }}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIL
══════════════════════════════════════════════════════ */
function MailView({ thread, setThread }) {
  const [tab, setTab]         = useState("Inbound");
  const [fOpen, setFOpen]     = useState(false);
  const [editId, setEditId]   = useState(null);
  const [editBodies, setEditBodies] = useState({});
  const [sent, setSent]       = useState({});
  const [fSearch,setFSearch]  = useState("");
  const [fClass,setFClass]    = useState("");
  const [fStatus,setFStatus]  = useState("");
  const [fWf,setFWf]          = useState("");
  const [fFrom,setFFrom]      = useState("");
  const [fTo,setFTo]          = useState("");

  const activeFC = [fSearch,fClass,fStatus,fWf,fFrom,fTo].filter(Boolean).length;
  const clearF = ()=>{ setFSearch(""); setFClass(""); setFStatus(""); setFWf(""); setFFrom(""); setFTo(""); };

  const isDraft = th => th.messages.some(m=>!sent[m.id]&&m.status==="draft");

  const counts = {
    Inbound:  THREADS.filter(t=>t.messages.some(m=>m.dir==="Inbound")).length,
    Outbound: THREADS.filter(t=>t.messages.some(m=>m.dir==="Outbound")).length,
    Drafts:   THREADS.filter(isDraft).length,
  };

  const filtered = THREADS.filter(th => {
    if (tab==="Inbound"  && !th.messages.some(m=>m.dir==="Inbound"))  return false;
    if (tab==="Outbound" && !th.messages.some(m=>m.dir==="Outbound")) return false;
    if (tab==="Drafts"   && !isDraft(th)) return false;
    const hay = JSON.stringify(th).toLowerCase();
    if (fSearch  && !hay.includes(fSearch.toLowerCase())) return false;
    if (fClass   && th.classification!==fClass) return false;
    if (fStatus  && !th.messages.some(m=>m.status===fStatus)) return false;
    if (fWf      && !th.messages.some(m=>String(m.wfId)===fWf)) return false;
    if (fFrom    && th.lastDate<fFrom) return false;
    if (fTo      && th.lastDate>fTo)   return false;
    return true;
  });

  return (
    <div style={{ display:"flex", gap:14, height:"calc(100vh - 114px)" }}>

      {/* List panel */}
      <div style={{ width:300, flexShrink:0, display:"flex", flexDirection:"column", background:T.bg2, border:`1px solid ${T.border}`, borderRadius:14, overflow:"hidden" }}>

        {/* Tabs */}
        <div style={{ display:"flex", gap:4, padding:"10px 10px 8px", borderBottom:`1px solid ${T.border}` }}>
          {["Inbound","Outbound","Drafts"].map(t=>(
            <button key={t} className={`tab-btn${tab===t?" on":""}`} onClick={()=>{setTab(t);setThread(null);}} style={{ flex:1, fontSize:11.5 }}>
              {t}
              <span style={{ marginLeft:4, fontSize:10, opacity:0.7 }}>{counts[t]}</span>
            </button>
          ))}
        </div>

        {/* Search + filter */}
        <div style={{ padding:"8px 10px", borderBottom:`1px solid ${T.border}`, display:"flex", gap:6 }}>
          <input value={fSearch} onChange={e=>setFSearch(e.target.value)} placeholder="Search…" className="fi" style={{ flex:1, fontSize:12 }}/>
          <button onClick={()=>setFOpen(!fOpen)}
            style={{ background:activeFC>0?T.yellowDim:"transparent", border:`1px solid ${activeFC>0?T.yellow+"66":T.border}`, borderRadius:7, padding:"0 10px", cursor:"pointer", fontSize:11.5, color:activeFC>0?T.yellow:T.muted, fontFamily:"inherit", display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
            ⚙{activeFC>0&&<span style={{ background:T.yellow,color:T.onYellow,borderRadius:10,padding:"0 4px",fontSize:9 }}>{activeFC}</span>}
          </button>
        </div>

        {/* Filters */}
        {fOpen && (
          <div style={{ padding:"10px", borderBottom:`1px solid ${T.border}`, background:T.bg1, display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
            <div style={{ gridColumn:"1/-1" }}>
              <div style={{ fontSize:9.5,fontWeight:700,color:T.muted,marginBottom:3,textTransform:"uppercase" }}>Classification</div>
              <select value={fClass} onChange={e=>setFClass(e.target.value)} className="fs" style={{ fontSize:11.5 }}>
                <option value="">All</option>{Object.keys(CLS_COLORS).map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize:9.5,fontWeight:700,color:T.muted,marginBottom:3,textTransform:"uppercase" }}>Status</div>
              <select value={fStatus} onChange={e=>setFStatus(e.target.value)} className="fs" style={{ fontSize:11.5 }}>
                <option value="">All</option>{["draft","sent","received"].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize:9.5,fontWeight:700,color:T.muted,marginBottom:3,textTransform:"uppercase" }}>Workflow</div>
              <select value={fWf} onChange={e=>setFWf(e.target.value)} className="fs" style={{ fontSize:11.5 }}>
                <option value="">All</option>{WORKFLOWS.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize:9.5,fontWeight:700,color:T.muted,marginBottom:3,textTransform:"uppercase" }}>Date from</div>
              <input type="date" value={fFrom} onChange={e=>setFFrom(e.target.value)} className="fi" style={{ fontSize:11 }}/>
            </div>
            <div>
              <div style={{ fontSize:9.5,fontWeight:700,color:T.muted,marginBottom:3,textTransform:"uppercase" }}>Date to</div>
              <input type="date" value={fTo} onChange={e=>setFTo(e.target.value)} className="fi" style={{ fontSize:11 }}/>
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <button onClick={clearF} style={{ fontSize:11,color:T.muted,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit" }}>✕ Clear filters</button>
            </div>
          </div>
        )}

        <div style={{ padding:"4px 10px 4px", fontSize:10.5, color:T.muted, borderBottom:`1px solid ${T.border}` }}>
          {filtered.length} thread{filtered.length!==1?"s":""}
        </div>

        {/* Thread rows */}
        <div style={{ flex:1, overflowY:"auto" }}>
          {filtered.length===0
            ? <div style={{ padding:24,textAlign:"center",color:T.muted,fontSize:12.5 }}>No threads</div>
            : filtered.map(th=>{
              const hasDraft=isDraft(th);
              const c=CLS_COLORS[th.classification];
              return (
                <div key={th.id} className={`trow${thread?.id===th.id?" sel":""}`}
                  onClick={()=>setThread(th)}
                  style={{ padding:"11px 12px", borderBottom:`1px solid ${T.border}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      {th.unread && <div style={{ width:5,height:5,borderRadius:"50%",background:T.yellow,flexShrink:0 }}></div>}
                      <span style={{ fontSize:11.5, fontWeight:th.unread?700:500, color:T.white, maxWidth:170, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {th.messages[0].dir==="Inbound"?th.messages[0].from.split("@")[0]:th.messages[0].to?.split("@")[0]||"Outbound"}
                      </span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      {th.messages.length>1 && <span style={{ fontSize:9.5,color:T.muted }}>🔗{th.messages.length}</span>}
                      <span style={{ fontSize:10,color:T.muted }}>{th.lastTime}</span>
                    </div>
                  </div>
                  <div style={{ fontSize:12, fontWeight:th.unread?600:400, color:th.unread?T.white:T.muted, marginBottom:6, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{th.subject}</div>
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                    <span className="pill" style={{ background:c.bg, color:c.text, border:`1px solid ${c.border}` }}>
                      <span style={{ width:4,height:4,borderRadius:"50%",background:c.dot }}></span>
                      {th.classification}
                    </span>
                    {[...new Set(th.messages.map(m=>m.dir))].map(d=>
                      <span key={d} className="pill" style={{ background:d==="Inbound"?T.blueDim:"#FFDA0211", color:d==="Inbound"?T.blue:T.yellow, border:`1px solid ${d==="Inbound"?T.blue+"33":T.yellow+"33"}` }}>
                        {d==="Inbound"?"↓ In":"↑ Out"}
                      </span>
                    )}
                    {hasDraft && <span className="pill" style={{ background:"#F59E0B11",color:T.amber,border:`1px solid ${T.amber}33` }}>Draft</span>}
                  </div>
                </div>
              );
            })
          }
        </div>
      </div>

      {/* Thread detail */}
      <div style={{ flex:1, background:T.bg2, border:`1px solid ${T.border}`, borderRadius:14, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {thread
          ? <ThreadDetail thread={thread} editId={editId} setEditId={setEditId} editBodies={editBodies} setEditBodies={setEditBodies} sent={sent} onSend={id=>{setSent(p=>({...p,[id]:true}));setEditId(null);}}/>
          : <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10 }}>
              <div style={{ width:52,height:52,background:T.bg1,borderRadius:14,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>✉</div>
              <div style={{ fontSize:13.5,fontWeight:600,color:T.muted }}>Select a thread</div>
            </div>
        }
      </div>
    </div>
  );
}

/* ── Thread Detail ─────────────────────────────────── */
function ThreadDetail({ thread, editId, setEditId, editBodies, setEditBodies, sent, onSend }) {
  const c = CLS_COLORS[thread.classification];
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      {/* Header */}
      <div style={{ padding:"16px 20px", borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
        <h3 style={{ fontSize:14.5, fontWeight:700, color:T.white, marginBottom:8, letterSpacing:"-0.2px" }}>{thread.subject}</h3>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          <span className="pill" style={{ background:c.bg,color:c.text,border:`1px solid ${c.border}` }}>
            <span style={{ width:4,height:4,borderRadius:"50%",background:c.dot }}></span>
            {thread.classification}
          </span>
          <span className="pill" style={{ background:T.bg1,color:T.muted,border:`1px solid ${T.border}` }}>🔗 {thread.messages.length} message{thread.messages.length>1?"s":""}</span>
          {[...new Set(thread.messages.map(m=>m.dir))].map(d=>(
            <span key={d} className="pill" style={{ background:d==="Inbound"?T.blueDim:"#FFDA0211",color:d==="Inbound"?T.blue:T.yellow,border:`1px solid ${d==="Inbound"?T.blue+"33":T.yellow+"33"}` }}>
              {d==="Inbound"?"↓ Inbound":"↑ Outbound"}
            </span>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"18px 20px", display:"flex", flexDirection:"column", gap:20 }}>
        {thread.messages.map(msg=>{
          const wf     = WORKFLOWS.find(w=>w.id===msg.wfId);
          const isOut  = msg.dir==="Outbound";
          const isSent = sent[msg.id]||msg.status==="sent"||msg.status==="approved";
          const isEdit = editId===msg.id;
          const body   = editBodies[msg.id]??msg.body;

          return (
            <div key={msg.id} style={{ display:"flex", flexDirection:"column", alignItems:isOut?"flex-end":"flex-start" }}>
              {/* Avatar + meta */}
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7, flexDirection:isOut?"row-reverse":"row" }}>
                <div style={{ width:30,height:30,borderRadius:9,background:isOut?T.yellow:T.bg1,border:`1px solid ${isOut?T.yellow+"44":T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10.5,fontWeight:800,color:isOut?T.onYellow:T.muted,flexShrink:0 }}>
                  {isOut?"AI":msg.from.charAt(0).toUpperCase()}
                </div>
                <div style={{ textAlign:isOut?"right":"left" }}>
                  <div style={{ fontSize:12, fontWeight:600, color:T.white }}>{isOut?"AI Agent":msg.from}</div>
                  <div style={{ fontSize:10.5, color:T.muted }}>{msg.time} · {isOut?(isSent?"Delivered":"Awaiting approval"):"Received"}</div>
                </div>
              </div>

              {/* Bubble */}
              <div style={{ maxWidth:"84%" }}>
                {isEdit
                  ? <textarea value={body} onChange={e=>setEditBodies(p=>({...p,[msg.id]:e.target.value}))}
                      style={{ width:"100%", minHeight:150, border:`1.5px solid ${T.yellow}66`, borderRadius:12, padding:"14px 16px", fontSize:13, lineHeight:1.75, color:T.white, resize:"vertical", outline:"none", fontFamily:"inherit", background:T.bg1 }}/>
                  : <div style={{ background:isOut?(isSent?"#22C55E11":"#FFDA0209"):T.bg1, border:`1px solid ${isOut?(isSent?"#22C55E33":"#FFDA0233"):T.border}`, borderRadius:12, padding:"13px 16px", fontSize:13, lineHeight:1.75, color:T.white, whiteSpace:"pre-line" }}>
                      {body}
                    </div>
                }

                {/* Workflow bar */}
                {wf && (
                  <div style={{ marginTop:6, display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                    <span style={{ fontSize:10.5, color:T.muted }}>⚡ <b style={{ color:T.white }}>{wf.name}</b></span>
                    {msg.ai && <span className="pill" style={{ background:"#A855F722",color:"#C084FC",border:"1px solid #A855F744" }}>✦ AI Generated</span>}
                    {isOut&&!isSent && <span className="pill" style={{ background:T.yellowDim,color:T.yellow,border:`1px solid ${T.yellow}33` }}>⏳ Pending approval</span>}
                    {isSent && <span className="pill" style={{ background:"#22C55E11",color:T.green,border:"1px solid #22C55E33" }}>✓ Sent</span>}
                  </div>
                )}

                {/* Actions */}
                {isOut && !isSent && (
                  <div style={{ display:"flex", gap:7, justifyContent:"flex-end", marginTop:10 }}>
                    {isEdit
                      ? <button className="btn-g" onClick={()=>setEditId(null)}>✕ Cancel</button>
                      : <button className="btn-g" onClick={()=>setEditId(msg.id)}>✏ Edit Draft</button>
                    }
                    <button className="btn-y" onClick={()=>onSend(msg.id)}>✓ Approve &amp; Send</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Pending placeholder */}
        {(()=>{
          const last=thread.messages[thread.messages.length-1];
          if (last.dir==="Inbound"&&!thread.messages.some(m=>m.dir==="Outbound")) {
            const wf=WORKFLOWS.find(w=>w.id===last.wfId);
            return (
              <div style={{ display:"flex", justifyContent:"flex-end" }}>
                <div style={{ background:T.bg1, border:`1px dashed ${T.border2}`, borderRadius:12, padding:"14px 18px", maxWidth:"84%", textAlign:"center" }}>
                  <div style={{ fontSize:12.5, color:T.muted, fontWeight:500 }}>
                    ⏳ Preparing draft via <b style={{ color:T.white }}>{wf?.name}</b>
                  </div>
                  <div style={{ fontSize:11, color:T.faint, marginTop:3 }}>Will appear here for your approval</div>
                </div>
              </div>
            );
          }
          return null;
        })()}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   WORKFLOWS
══════════════════════════════════════════════════════ */
function WorkflowsView({ wfSt, toggleWf, toggleRc }) {
  const [fOpen,setFOpen]=useState(false);
  const [fName,setFName]=useState(""); const [fTrig,setFTrig]=useState("");
  const [fDir,setFDir]=useState("");   const [fStat,setFStat]=useState("");
  const activeFC=[fName,fTrig,fDir,fStat].filter(Boolean).length;
  const clearF=()=>{setFName("");setFTrig("");setFDir("");setFStat("");};

  const list=WORKFLOWS.filter(wf=>{
    if(fName&&!wf.name.toLowerCase().includes(fName.toLowerCase())) return false;
    if(fTrig&&wf.trigger!==fTrig) return false;
    if(fDir&&wf.direction!==fDir) return false;
    if(fStat==="active"&&!wfSt[wf.id].active) return false;
    if(fStat==="inactive"&&wfSt[wf.id].active) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:22 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:T.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:4 }}>Automation</div>
          <h1 style={{ fontSize:28, fontWeight:900, color:T.white, letterSpacing:"-0.8px" }}>
            <span style={{ color:T.yellow }}>Workflows</span>
          </h1>
        </div>
        <div style={{ fontSize:12, color:T.muted }}>
          <span style={{ color:T.green, fontWeight:700 }}>{Object.values(wfSt).filter(s=>s.active).length}</span> active · {WORKFLOWS.length} total
        </div>
      </div>

      {/* Filter bar */}
      <div className="card" style={{ padding:"10px 14px", marginBottom:14, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
        <input value={fName} onChange={e=>setFName(e.target.value)} placeholder="Search workflows…" className="fi" style={{ maxWidth:220 }}/>
        <button onClick={()=>setFOpen(!fOpen)}
          style={{ background:fOpen||activeFC>0?T.yellowDim:"transparent", border:`1px solid ${activeFC>0?T.yellow+"66":T.border}`, borderRadius:7, padding:"7px 12px", cursor:"pointer", fontSize:12, fontWeight:600, color:activeFC>0?T.yellow:T.muted, fontFamily:"inherit", display:"flex", alignItems:"center", gap:5 }}>
          ⚙ Filters {activeFC>0&&<span style={{ background:T.yellow,color:T.onYellow,borderRadius:10,padding:"0 5px",fontSize:9.5 }}>{activeFC}</span>}
        </button>
        {activeFC>0&&<button onClick={clearF} style={{ fontSize:12,color:T.muted,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit" }}>✕ Clear</button>}
        {fOpen&&(
          <div style={{ width:"100%", display:"flex", gap:10, paddingTop:10, borderTop:`1px solid ${T.border}`, flexWrap:"wrap" }}>
            {[["Classification",fTrig,setFTrig,"trig"],["Direction",fDir,setFDir,"dir"],["Status",fStat,setFStat,"stat"]].map(([lbl,val,set,key])=>(
              <div key={key} style={{ minWidth:150 }}>
                <div style={{ fontSize:9.5,fontWeight:700,color:T.muted,marginBottom:4,textTransform:"uppercase" }}>{lbl}</div>
                <select value={val} onChange={e=>set(e.target.value)} className="fs">
                  <option value="">All</option>
                  {key==="trig"?Object.keys(CLS_COLORS).map(c=><option key={c}>{c}</option>):
                   key==="dir"?<><option>Inbound</option><option>Outbound</option></>:
                   <><option value="active">Active</option><option value="inactive">Inactive</option></>}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display:"grid", gap:10 }}>
        {list.map(wf=>{
          const st=wfSt[wf.id];
          const c=CLS_COLORS[wf.trigger];
          return (
            <div key={wf.id} className="card hov" style={{ padding:"18px 20px", display:"flex", gap:18, borderLeft:`3px solid ${st.active?c.dot:T.border}`, opacity:st.active?1:0.55, transition:"opacity .2s, border .2s" }}>

              {/* Dot indicator */}
              <div style={{ paddingTop:2, flexShrink:0 }}>
                <div style={{ width:8,height:8,borderRadius:"50%",background:st.active?c.dot:T.faint,boxShadow:st.active?`0 0 8px ${c.dot}88`:"none",transition:"all .3s" }}></div>
              </div>

              {/* Info */}
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:6 }}>
                  <span style={{ fontSize:14, fontWeight:700, color:T.white }}>{wf.name}</span>
                  <span className="pill" style={{ background:c.bg,color:c.text,border:`1px solid ${c.border}` }}>{wf.trigger}</span>
                  <span className="pill" style={{ background:wf.direction==="Inbound"?T.blueDim:"#FFDA0211",color:wf.direction==="Inbound"?T.blue:T.yellow,border:`1px solid ${wf.direction==="Inbound"?T.blue+"33":T.yellow+"33"}` }}>
                    {wf.direction==="Inbound"?"↓ Inbound":"↑ Outbound"}
                  </span>
                </div>
                <p style={{ fontSize:12.5,color:T.muted,lineHeight:1.6,marginBottom:10 }}>{wf.description}</p>
                <div style={{ display:"flex", gap:14, fontSize:11.5 }}>
                  <span style={{ color:T.muted }}>⚡ <b style={{ color:T.white }}>{wf.runs}</b> runs</span>
                  <span style={{ color:T.muted }}>🕐 <b style={{ color:T.white }}>{wf.lastRun}</b></span>
                </div>
              </div>

              {/* Toggles */}
              <div style={{ display:"flex", flexDirection:"column", gap:8, flexShrink:0, minWidth:185 }}>
                {[
                  ["Workflow", st.active?"Running":"Paused", st.active, ()=>toggleWf(wf.id)],
                  ["Human in the Loop", st.rc?"Confirm before send":"Automated", st.rc, ()=>toggleRc(wf.id)],
                ].map(([lbl,sub,val,fn])=>(
                  <div key={lbl} style={{ background:T.bg1,border:`1px solid ${T.border}`,borderRadius:9,padding:"8px 11px",display:"flex",alignItems:"center",gap:8 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11,fontWeight:600,color:T.white }}>{lbl}</div>
                      <div style={{ fontSize:10,color:T.muted,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{sub}</div>
                    </div>
                    <label className="ts-toggle"><input type="checkbox" checked={val} onChange={fn}/><span className="ts-sl"></span></label>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   PERSONALIZATION
══════════════════════════════════════════════════════ */
function PersonalizationView() {
  const [tone,setTone]=useState("professional");
  const [autoApp,setAutoApp]=useState(false);
  const [sig,setSig]=useState("Best regards,\nFSM Email AI Agent");
  const [font,setFont]=useState("DM Sans");
  const [fs,setFs]=useState("14");
  const [lh,setLh]=useState("1.6");
  const [ew,setEw]=useState("640");

  const Section = ({title, children}) => (
    <div className="card" style={{ padding:22, marginBottom:14 }}>
      <div style={{ fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:16 }}>{title}</div>
      {children}
    </div>
  );

  const Row = ({label, desc, val, fn}) => (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 0",borderTop:`1px solid ${T.border}` }}>
      <div>
        <div style={{ fontSize:12.5,fontWeight:600,color:T.white }}>{label}</div>
        <div style={{ fontSize:11,color:T.muted }}>{desc}</div>
      </div>
      <label className="ts-toggle"><input type="checkbox" checked={val} onChange={fn}/><span className="ts-sl"></span></label>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:22 }}>
        <div style={{ fontSize:11,fontWeight:700,color:T.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4 }}>Settings</div>
        <h1 style={{ fontSize:28,fontWeight:900,color:T.white,letterSpacing:"-0.8px" }}>
          <span style={{ color:T.yellow }}>Personalization</span>
        </h1>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, alignItems:"start" }}>
        <div>
          <Section title="Email Stationery">
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6 }}>Font Family</div>
              <select value={font} onChange={e=>setFont(e.target.value)} className="fs">{FONTS.map(f=><option key={f} value={f}>{f}</option>)}</select>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
              <div>
                <div style={{ fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6 }}>Font Size</div>
                <select value={fs} onChange={e=>setFs(e.target.value)} className="fs">{["12","13","14","15","16"].map(s=><option key={s}>{s}px</option>)}</select>
              </div>
              <div>
                <div style={{ fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6 }}>Line Height</div>
                <select value={lh} onChange={e=>setLh(e.target.value)} className="fs">{["1.4","1.5","1.6","1.7","1.8"].map(s=><option key={s}>{s}</option>)}</select>
              </div>
            </div>
            <div>
              <div style={{ fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6 }}>Email Width</div>
              <select value={ew} onChange={e=>setEw(e.target.value)} className="fs">{["560","600","640","700","760"].map(s=><option key={s}>{s}px</option>)}</select>
            </div>
          </Section>

          <Section title="AI Behaviour">
            <div style={{ marginBottom:4 }}>
              <div style={{ fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8 }}>Response Tone</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                {["professional","friendly","concise"].map(t=>(
                  <button key={t} onClick={()=>setTone(t)}
                    style={{ padding:"8px", border:`1px solid ${tone===t?T.yellow+"66":T.border}`, background:tone===t?T.yellowDim:T.bg1, color:tone===t?T.yellow:T.muted, borderRadius:8, fontSize:11.5, fontWeight:tone===t?700:400, cursor:"pointer", textTransform:"capitalize", transition:"all .14s", fontFamily:"inherit" }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <Row label="Auto-Approve (>95% confidence)" desc="Skip human review for high-confidence actions" val={autoApp} fn={()=>setAutoApp(!autoApp)}/>
            <Row label="Human-in-the-Loop (Global)" desc="All drafts require approval before sending" val={true} fn={()=>{}}/>
          </Section>

          <Section title="Email Signature">
            <textarea value={sig} onChange={e=>setSig(e.target.value)} rows={4}
              style={{ width:"100%",border:`1px solid ${T.border}`,borderRadius:9,padding:"10px 12px",fontSize:13,color:T.white,resize:"vertical",outline:"none",fontFamily:"inherit",background:T.bg1 }}/>
          </Section>

          <Section title="Notifications">
            {[["Email classified","Notify when AI classifies an email",true],["Workflow completed","Notify when a workflow finishes",true],["Draft created","Notify when a draft needs approval",true],["Classification failed","Notify when AI cannot classify",false]].map(([l,d,def])=>(
              <Row key={l} label={l} desc={d} val={def} fn={()=>{}}/>
            ))}
          </Section>
        </div>

        {/* Live preview */}
        <div style={{ position:"sticky", top:0 }}>
          <div className="card" style={{ padding:22, marginBottom:14 }}>
            <div style={{ fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3 }}>Live Preview</div>
            <div style={{ fontSize:11.5, color:T.muted, marginBottom:16 }}>Sample email with stationery applied</div>
            <div style={{ background:T.bg1, borderRadius:10, padding:12, overflow:"auto", border:`1px solid ${T.border}` }}>
              <div style={{ fontFamily:font, fontSize:`${fs}px`, lineHeight:lh, color:"#2D3748", maxWidth:`${ew}px`, padding:"22px 26px", background:"white", borderRadius:10 }}>
                <div style={{ height:3, background:"#FFDA02", borderRadius:3, marginBottom:18 }}></div>
                <p style={{ marginBottom:13 }}>Dear John Smith,</p>
                <p style={{ marginBottom:13 }}>We have logged your request for the AC unit fault at Site B under job reference <b>JOB-2026-0441</b>. An engineer will be in touch shortly.</p>
                <p style={{ marginBottom:16 }}>Kind regards,</p>
                <p style={{ fontSize:`${Math.max(11,Number(fs)-1)}px`, color:"#718096", whiteSpace:"pre-line" }}>{sig}</p>
                <div style={{ height:2, background:"#213A54", borderRadius:3, marginTop:18, opacity:0.12 }}></div>
              </div>
            </div>
          </div>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:9 }}>
            <button className="btn-g">Discard</button>
            <button className="btn-y">Save Settings</button>
          </div>
        </div>
      </div>
    </div>
  );
}