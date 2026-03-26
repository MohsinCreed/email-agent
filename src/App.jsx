import { useState } from "react";
import React from "react";

/* ─── Brand Colors ───────────────────────────────────── */
const C = {
  primary:   "#213A54",   // deep navy
  secondary: "#FFDA02",   // Joblogic yellow
  tertiary:  "#0056B3",   // blue
  neutral:   "#3C434A",   // dark grey
  bg:        "#F0F3F6",
  surface:   "#FFFFFF",
  border:    "#E0E6ED",
  muted:     "#8896A4",
  // text on yellow
  onYellow:  "#213A54",
};

const NAV_ITEMS = [
  { id: "dashboard",      label: "Dashboard",       icon: "⊞" },
  { id: "mail",           label: "Mail",            icon: "✉", badge: 9 },
  { id: "workflows",      label: "Workflows",       icon: "⚡" },
  { id: "personalization",label: "Personalization", icon: "⚙" },
];

const CLS_COLORS = {
  Job:         { bg: "#1e3a8a", light: "#dbeafe", text: "#1e40af" },
  Quote:       { bg: "#065f46", light: "#d1fae5", text: "#065f46" },
  PPM:         { bg: "#7c3aed", light: "#ede9fe", text: "#6d28d9" },
  Invoice:     { bg: "#92400e", light: "#fef3c7", text: "#92400e" },
  Combination: { bg: "#9d174d", light: "#fce7f3", text: "#9d174d" },
  Other:       { bg: "#374151", light: "#f3f4f6", text: "#374151" },
};

const WORKFLOWS = [
  {
    id: 1, name: "Log New Job", trigger: "Job", direction: "Inbound",
    description: "When an inbound email is classified as a Job request, this workflow extracts customer details, site address, fault description, and urgency level. It then creates a draft job record in the FSM system pre-filled with extracted data. The record is held in draft state pending human review and approval before any engineer is assigned or customer is contacted.",
    active: true,  runs: 142, lastRun: "2 min ago",   requireConfirm: true,
  },
  {
    id: 2, name: "Generate Quote", trigger: "Quote", direction: "Inbound",
    description: "Triggered when an inbound email is identified as a quote request. The workflow parses the email for scope of works, site details, and any budget indicators. It matches the request against the service catalogue and prepares a draft quote document with line items. A human must review, adjust pricing if necessary, and approve before the quote is sent to the customer.",
    active: true,  runs: 87,  lastRun: "1 hr ago",    requireConfirm: true,
  },
  {
    id: 3, name: "Schedule PPM", trigger: "PPM", direction: "Inbound",
    description: "Handles inbound emails containing planned preventive maintenance schedules or requests. The workflow extracts site locations, asset types, service intervals, and preferred visit windows. It creates recurring maintenance tasks in the scheduling calendar and notifies the relevant field engineers. Confirmation is required before tasks are published to engineer diaries.",
    active: true,  runs: 34,  lastRun: "3 hrs ago",   requireConfirm: false,
  },
  {
    id: 4, name: "Process Invoice", trigger: "Invoice", direction: "Inbound",
    description: "Activated when an invoice-related email arrives — whether a new invoice, a query, or a dispute. The workflow attempts to match the invoice number against existing job records and checks amounts against agreed rates. It then routes the item to the accounts team with a summary of discrepancies found. Human approval is mandatory before any payment or credit is actioned.",
    active: false, runs: 56,  lastRun: "Yesterday",   requireConfirm: true,
  },
  {
    id: 5, name: "Combination Handler", trigger: "Combination", direction: "Inbound",
    description: "Used when a single inbound email contains multiple distinct requests — for example a new job request alongside an invoice query. This workflow splits the email into separate sub-tasks, classifies each independently, and triggers the relevant individual workflow for each. Each sub-workflow then follows its own confirmation and approval process as configured.",
    active: true,  runs: 19,  lastRun: "2 days ago",  requireConfirm: false,
  },
  {
    id: 6, name: "General Triage", trigger: "Other", direction: "Inbound",
    description: "A catch-all workflow for inbound emails that could not be confidently classified into a primary category. The AI summarises the email content, suggests the most likely classification, and flags it for manual review in the control panel. No automated actions are taken until a human agent reviews the email and assigns it to the correct workflow.",
    active: true,  runs: 203, lastRun: "5 min ago",   requireConfirm: true,
  },
  {
    id: 7, name: "Quote Follow-Up", trigger: "Quote", direction: "Outbound",
    description: "Automatically triggered when a quote created via the Generate Quote workflow has remained in Pending Approval status for more than 48 hours without a customer response. The workflow drafts a polite follow-up email referencing the original quote number and key details. Requires human approval before sending to avoid unwanted automated chasing.",
    active: true,  runs: 41,  lastRun: "30 min ago",  requireConfirm: true,
  },
  {
    id: 8, name: "Job Confirmation", trigger: "Job", direction: "Outbound",
    description: "Triggered when a job logged via the Log New Job workflow is approved and assigned to an engineer. The workflow automatically drafts a confirmation email to the customer including the job reference number, assigned engineer name, and estimated arrival window. The email is held for approval to allow the team to verify the details before it reaches the customer.",
    active: true,  runs: 98,  lastRun: "10 min ago",  requireConfirm: true,
  },
  {
    id: 9, name: "Invoice Reminder", trigger: "Invoice", direction: "Outbound",
    description: "Activated when an invoice in the system passes its due date by 7 or more days without a payment record. The workflow identifies the overdue invoice, retrieves customer contact details, and drafts a professional payment reminder email with the outstanding amount, due date, and payment instructions. Currently inactive — enable only after reviewing credit control policies.",
    active: false, runs: 22,  lastRun: "Yesterday",   requireConfirm: true,
  },
];

/* ─── Thread Data ─────────────────────────────────────── */
// direction: "Inbound" = customer → us, "Outbound" = AI → customer
// status: "received" | "draft" | "approved" | "sent"
const THREADS = [
  {
    id: "T1", subject: "Urgent: AC Unit broken at Site B", classification: "Job",
    lastTime: "09:16 AM", lastDate: "2026-03-20", unread: true,
    draftRecord: {
      type: "Job", ref: "DRAFT",
      fields: [
        { label:"Customer",              value:"ACME Corp",          mandatory:true  },
        { label:"Site",                  value:"Site B",               mandatory:true  },
        { label:"Job Description",       value:"AC unit not operational. Daikin 36BTU installed 2019. Engineer required ASAP to diagnose and repair fault.", mandatory:true  },
        { label:"Job Type",              value:"Reactive Maintenance",            mandatory:true  },
        { label:"Job Owner",             value:"System User",          system:true     },
        { label:"Date Logged",           value:"20 Mar 2026, 09:14 AM",          system:true     },
        { label:"Customer Order Number", value:" ",                               optional:true   },
        { label:"Priority",              value:"High",                            optional:true   },
        { label:"Contact Info",          value:"john.smith@acmecorp.com",         optional:true   },
        { label:"Attachments",           value:"None",                            optional:true   },
        { label:"Job Category",          value:"HVAC",                            optional:true   },
        { label:"Job Primary Trade",     value:"Air Conditioning",                optional:true   },
        { label:"Reference Number",      value:" ",                           optional:true   },
      ],
    },
    messages: [
      { id:"T1-1", from:"john.smith@acmecorp.com",   to:"ops@yourfsm.com",            direction:"Inbound",  time:"09:14 AM", workflowId:1, status:"received", body:"Hi,\n\nOur AC unit at Site B has stopped working. We need an engineer ASAP. The unit is a Daikin 36BTU, installed in 2019. Customer ref: ACME-001.\n\nPlease advise on earliest availability.\n\nRegards,\nJohn Smith" },
      { id:"T1-2", from:"ops@yourfsm.com",           to:"john.smith@acmecorp.com",    direction:"Outbound", time:"09:16 AM", workflowId:8, status:"draft",    aiGenerated:true, body:"Dear John,\n\nThank you for contacting us. We have logged your request for the AC unit fault at Site B under job reference JOB-2026-0441.\n\nAn engineer has been provisionally scheduled and you will receive a confirmed visit time within the next 2 hours. Please ensure safe access to the unit is available in the meantime.\n\nKind regards,\nFSM Operations Team" },
    ],
  },
  {
    id: "T2", subject: "Request for Quote – Plumbing Works", classification: "Quote",
    lastTime: "09:05 AM", lastDate: "2026-03-20", unread: true,
    draftRecord: {
      type: "Quote", ref: "DRAFT",
      fields: [
        { label:"Customer",             value:"BuildRight",                    mandatory:true },
        { label:"Site",                 value:"New Development Site, BuildRight",                 mandatory:true },
        { label:"Description",          value:"Plumbing works as per submitted specification sheet. Scope includes supply and installation across new development site.", mandatory:true },
        { label:"Job Type",             value:"Quoted Works",                                     mandatory:true },
        { label:"Quote Owner",          value:"System User",                           system:true   },
        { label:"Date Logged",          value:"20 Mar 2026, 08:55 AM",                           system:true   },
        { label:"Job Category",         value:"Plumbing",                                         optional:true },
        { label:"Quote Reference",      value:"DRAFT",                                            optional:true },
        { label:"Quote Trade",          value:"Plumbing & Drainage",                              optional:true },
        { label:"Title",                value:"Plumbing Works — New Development Site Q2 2026",    optional:true },
        { label:"Priority",             value:"Standard",                                         optional:true },
        { label:"Contact Info",         value:"procurement@buildright.co.uk",                     optional:true },
        { label:"Attachments",          value:"Specification sheet (referenced in email)",        optional:true },
      ],
    },
    messages: [
      { id:"T2-1", from:"procurement@buildright.co.uk", to:"ops@yourfsm.com",         direction:"Inbound",  time:"08:55 AM", workflowId:2, status:"received", body:"Hi,\n\nWe require a formal quote for plumbing works at our new development site. Please see the attached specification sheet. Our indicative budget is approx £15,000 and the timeline is Q2 2026.\n\nPlease confirm receipt.\n\nThanks,\nProcurement Team, BuildRight" },
      { id:"T2-2", from:"ops@yourfsm.com",             to:"procurement@buildright.co.uk", direction:"Outbound", time:"09:05 AM", workflowId:2, status:"draft", aiGenerated:true, body:"Dear Procurement Team,\n\nThank you for your quote request. We have reviewed your specification and are pleased to provide the following indicative quote for plumbing works at your new development:\n\n• Labour (est. 5 days @ £650/day): £3,250\n• Materials (as per spec): £9,100\n• Site mobilisation: £800\n• Contingency (10%): £1,315\n• Total (ex. VAT): £14,465\n\nThis is subject to a site survey, which we will arrange shortly. Quote reference: QT-2026-0182.\n\nKind regards,\nFSM Operations Team" },
    ],
  },
  {
    id: "T3", subject: "Monthly PPM Schedule – March 2026", classification: "PPM",
    lastTime: "Yesterday", lastDate: "2026-03-19", unread: false,
    messages: [
      { id:"T3-1", from:"facilities@greentech.com",   to:"ops@yourfsm.com",            direction:"Inbound",  time:"Yesterday", workflowId:3, status:"received", body:"Hi team,\n\nPlease find attached the monthly PPM schedule for March 2026. All 12 sites are included. Please confirm receipt and that tasks have been loaded into your system.\n\nBest,\nFacilities, GreenTech" },
      { id:"T3-2", from:"ops@yourfsm.com",            to:"facilities@greentech.com",   direction:"Outbound", time:"Yesterday", workflowId:8, status:"sent",     aiGenerated:true, body:"Dear Facilities Team,\n\nThank you. We confirm receipt of the March 2026 PPM schedule for all 12 GreenTech sites. All tasks have been loaded into our scheduling system and assigned to engineers accordingly.\n\nYou will receive individual site visit confirmations as dates are finalised.\n\nKind regards,\nFSM Operations Team" },
    ],
  },
  {
    id: "T4", subject: "Invoice Query – INV-2024-0892", classification: "Invoice",
    lastTime: "Yesterday", lastDate: "2026-03-19", unread: false,
    messages: [
      { id:"T4-1", from:"accounts@northstar.co.uk",   to:"ops@yourfsm.com",            direction:"Inbound",  time:"Yesterday", workflowId:4, status:"received", body:"Hi,\n\nWe have a query regarding invoice INV-2024-0892 for £4,200. The amount does not match our purchase order PO-NS-0034 which was raised for £3,800. Could you please clarify the discrepancy?\n\nRegards,\nAccounts, NorthStar Ltd" },
    ],
  },
  {
    id: "T5", subject: "New Job + Invoice for Completed Work", classification: "Combination",
    lastTime: "Mon", lastDate: "2026-03-18", unread: false,
    messages: [
      { id:"T5-1", from:"ops@citywide.com",            to:"ops@yourfsm.com",            direction:"Inbound",  time:"Mon", workflowId:5, status:"received", body:"Hi,\n\nTwo things:\n1) We have a new job request at City Plaza — drainage inspection needed urgently.\n2) Can you also send us the invoice for the electrical work completed on 14th March?\n\nThanks,\nOps, Citywide FM" },
    ],
  },
  // Outbound-only threads (triggered by system events)
  {
    id: "T6", subject: "Quote Follow-Up – QT-2026-0175", classification: "Quote",
    lastTime: "08:30 AM", lastDate: "2026-03-20", unread: false,
    messages: [
      { id:"T6-1", from:"ops@yourfsm.com",            to:"sarah.jones@retailgroup.com", direction:"Outbound", time:"08:30 AM", workflowId:7, status:"draft", aiGenerated:true, body:"Dear Sarah,\n\nI hope you are well. I wanted to follow up on our quote QT-2026-0175 submitted 3 days ago for the electrical maintenance works at your retail units.\n\nWe haven't yet received a response and wanted to check if you had any questions or required any amendments to the proposal.\n\nWe are happy to arrange a call to discuss at your convenience.\n\nKind regards,\nFSM Operations Team" },
    ],
  },
  {
    id: "T7", subject: "Invoice Overdue Reminder – INV-2024-0790", classification: "Invoice",
    lastTime: "Mon", lastDate: "2026-03-18", unread: false,
    messages: [
      { id:"T7-1", from:"ops@yourfsm.com",            to:"accounts@northstar.co.uk",   direction:"Outbound", time:"Mon",      workflowId:9, status:"sent",     aiGenerated:true, body:"Dear Accounts Team,\n\nThis is a reminder that invoice INV-2024-0790 for £3,450 remains outstanding and is now 7 days overdue. Please arrange payment at your earliest convenience.\n\nPayment details:\nBank: HSBC | Sort: 40-12-34 | Acc: 12345678\n\nKind regards,\nFSM Finance Team" },
    ],
  },
  {
    id: "T8", subject: "Job Confirmation – JOB-2026-0438", classification: "Job",
    lastTime: "Mon", lastDate: "2026-03-18", unread: false,
    messages: [
      { id:"T8-1", from:"mark.patel@bridgehotel.co.uk", to:"ops@yourfsm.com",          direction:"Inbound",  time:"Fri",      workflowId:1, status:"received", body:"Hi,\n\nWe have a boiler issue in the plant room at Bridge Hotel. It has been making a loud banging noise since this morning. We need someone urgently.\n\nMark Patel, Facilities Manager" },
      { id:"T8-2", from:"ops@yourfsm.com",             to:"mark.patel@bridgehotel.co.uk", direction:"Outbound", time:"Mon", workflowId:8, status:"sent", aiGenerated:true, body:"Dear Mark,\n\nWe have logged and approved your job request. Job reference: JOB-2026-0438.\n\nYour assigned engineer is Tom Richards. He will be on site by 2:00 PM today. Please ensure access to the plant room is available.\n\nKind regards,\nFSM Operations Team" },
    ],
  },
  {
    id: "T9", subject: "PPM Confirmation – April Schedule – SiteCo", classification: "PPM",
    lastTime: "08:00 AM", lastDate: "2026-03-20", unread: false,
    messages: [
      { id:"T9-1", from:"ops@yourfsm.com",            to:"fm@siteco.co.uk",            direction:"Outbound", time:"08:00 AM", workflowId:8, status:"draft", aiGenerated:true, body:"Dear FM Team,\n\nPlease find below your confirmed PPM visit schedule for April 2026 across all SiteCo locations:\n\n• Site A (Manchester): 7th April — HVAC & Fire Systems\n• Site B (Leeds): 9th April — Electrical & Plumbing\n• Site C (Sheffield): 14th April — Full Facility Check\n\nEngineers will contact you 48 hours prior to each visit to confirm access.\n\nKind regards,\nFSM Operations Team" },
    ],
  },
];

const STATS = [
  { label:"Emails Today",    value:"47", change:"+12%", up:true  },
  { label:"Pending Review",  value:"9",  change:"-3",   up:false },
  { label:"Processed by AI - Human In Loop", value:"36", change:"63%",  up:true  },
  { label:"Processed by AI", value:"6", change:"11%",  up:true  },
];
const DATE_PRESETS = ["Today","Yesterday","Last 7 days","Last 30 days","Custom"];
const FONTS = ["DM Sans","Georgia","Helvetica Neue","Trebuchet MS","Garamond","Courier New"];

/* ══════════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════════ */
export default function App() {
  const [activeNav,      setActiveNav]      = useState("dashboard");
  const [selectedThread, setSelectedThread] = useState(null);
  const [collapsed,      setCollapsed]      = useState(false);
  const [wfStates,       setWfStates]       = useState(
    WORKFLOWS.reduce((a,w) => ({ ...a, [w.id]:{ active:w.active, requireConfirm:w.requireConfirm, generalAck:false } }), {})
  );
  const toggleWf      = (id) => setWfStates(p => ({ ...p, [id]:{ ...p[id], active:!p[id].active } }));
  const toggleConfirm = (id) => setWfStates(p => ({ ...p, [id]:{ ...p[id], requireConfirm:!p[id].requireConfirm } }));
  const toggleAck     = (id) => setWfStates(p => ({ ...p, [id]:{ ...p[id], generalAck:!p[id].generalAck } }));

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'DM Sans','Segoe UI',sans-serif", background:C.bg, overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#c4cdd6;border-radius:3px}
        .ni{transition:all .18s;cursor:pointer;border-left:3px solid transparent}
        .ni:hover{background:rgba(255,255,255,.1)!important}
        .ni.act{background:rgba(255,218,2,.12)!important;border-left-color:${C.secondary}!important}
        .ts{position:relative;width:40px;height:21px;flex-shrink:0}
        .ts input{opacity:0;width:0;height:0}
        .sl{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#cbd5e1;border-radius:22px;transition:.3s}
        .sl:before{position:absolute;content:"";height:15px;width:15px;left:3px;bottom:3px;background:white;border-radius:50%;transition:.3s}
        input:checked+.sl{background:${C.tertiary}}
        input:checked+.sl:before{transform:translateX(19px)}
        .tr{transition:background .14s;cursor:pointer;border-left:3px solid transparent}
        .tr:hover{background:#f6f8fa!important}
        .tr.sel{background:#FFF8E1!important;border-left-color:${C.secondary}!important}
        .sc{transition:transform .2s,box-shadow .2s}
        .sc:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(33,58,84,.12)!important}
        .bp{background:${C.secondary};color:${C.onYellow};border:none;padding:7px 16px;border-radius:6px;font-weight:700;cursor:pointer;font-size:12px;transition:all .2s;font-family:inherit;white-space:nowrap}
        .bp:hover{background:#e6c800}
        .bt{background:${C.tertiary};color:white;border:none;padding:7px 16px;border-radius:6px;font-weight:600;cursor:pointer;font-size:12px;transition:all .2s;font-family:inherit;white-space:nowrap}
        .bt:hover{background:#004999}
        .bg{background:transparent;color:${C.primary};border:1px solid ${C.border};padding:6px 13px;border-radius:6px;font-weight:500;cursor:pointer;font-size:12px;transition:all .2s;font-family:inherit;white-space:nowrap}
        .bg:hover{background:#EEF2F6}
        .fi{border:1px solid ${C.border};border-radius:6px;padding:6px 9px;font-size:12px;outline:none;color:${C.neutral};width:100%;background:white;font-family:inherit}
        .fi:focus{border-color:${C.tertiary};box-shadow:0 0 0 2px rgba(0,86,179,.12)}
        .fs{border:1px solid ${C.border};border-radius:6px;padding:6px 9px;font-size:12px;outline:none;color:${C.neutral};width:100%;background:white;cursor:pointer;font-family:inherit}
        .fs:focus{border-color:${C.tertiary}}
        .tb{flex:1;padding:10px 4px;border:none;background:none;font-family:inherit;font-size:12px;cursor:pointer;border-bottom:2px solid transparent;transition:all .18s}
        .mb{border-radius:10px;padding:13px 15px;font-size:13px;line-height:1.75;color:${C.neutral};white-space:pre-line}
      `}</style>

      {/* SIDEBAR */}
      <div style={{ width:collapsed?62:222, background:C.primary, display:"flex", flexDirection:"column", flexShrink:0, transition:"width .25s", overflow:"hidden" }}>
        <div style={{ padding:"17px 13px", borderBottom:`1px solid rgba(255,255,255,.1)`, display:"flex", alignItems:"center", gap:9 }}>
          <div style={{ width:32, height:32, background:C.secondary, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>✉</div>
          {!collapsed && <div>
            <div style={{ color:"white", fontWeight:700, fontSize:13, lineHeight:1.2 }}>Email AI Agent</div>
            <div style={{ color:"rgba(255,255,255,.5)", fontSize:10.5 }}>Control Panel</div>
          </div>}
        </div>
        <nav style={{ flex:1, padding:"10px 0", overflowY:"auto" }}>
          {NAV_ITEMS.map(item => (
            <div key={item.id} className={`ni${activeNav===item.id?" act":""}`}
              onClick={() => { setActiveNav(item.id); setSelectedThread(null); }}
              style={{ display:"flex", alignItems:"center", gap:11, padding:"11px 15px", color:activeNav===item.id?C.secondary:"rgba(255,255,255,.6)", fontWeight:activeNav===item.id?600:400, fontSize:13 }}>
              <span style={{ fontSize:15, width:19, textAlign:"center", flexShrink:0 }}>{item.icon}</span>
              {!collapsed && <>
                <span style={{ flex:1 }}>{item.label}</span>
                {item.badge && <span style={{ background:C.secondary, color:C.onYellow, fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:10 }}>{item.badge}</span>}
              </>}
            </div>
          ))}
        </nav>
        <div style={{ padding:"12px 13px", borderTop:`1px solid rgba(255,255,255,.1)` }}>
          <button onClick={() => setCollapsed(!collapsed)}
            style={{ background:"rgba(255,255,255,.07)", border:"none", color:"rgba(255,255,255,.45)", width:"100%", padding:"6px", borderRadius:6, cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>
            {collapsed?"→":"← Collapse"}
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Topbar */}
        <div style={{ background:"white", borderBottom:`1px solid ${C.border}`, padding:"0 22px", height:52, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <h1 style={{ fontSize:15.5, fontWeight:700, color:C.primary }}>
            {NAV_ITEMS.find(n=>n.id===activeNav)?.label}
          </h1>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:5, background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:20, padding:"4px 11px", fontSize:11.5, color:"#16a34a", fontWeight:600 }}>
              <span style={{ width:6, height:6, background:"#22c55e", borderRadius:"50%", display:"inline-block" }}></span>
              Agent Active
            </div>
            <div style={{ width:31, height:31, background:C.primary, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:11.5, fontWeight:700 }}>JD</div>
          </div>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:20 }}>
          {activeNav==="dashboard"       && <Dashboard />}
          {activeNav==="mail"            && <MailView selectedThread={selectedThread} setSelectedThread={setSelectedThread} />}
          {activeNav==="workflows"       && <WorkflowsView wfStates={wfStates} toggleWf={toggleWf} toggleConfirm={toggleConfirm} toggleAck={toggleAck} />}
          {activeNav==="personalization" && <PersonalizationView />}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════ */
function Dashboard() {
  const [preset,setPreset]=useState("Today");
  const [cFrom,setCFrom]=useState("");
  const [cTo,setCTo]=useState("");
  return (
    <div>
      {/* Date filter */}
      <div style={{ background:"white", borderRadius:10, padding:"8px 14px", marginBottom:12, boxShadow:`0 2px 8px rgba(33,58,84,.06)`, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
        <span style={{ fontSize:11.5, fontWeight:600, color:C.muted, marginRight:2 }}>Period:</span>
        {DATE_PRESETS.map(p=>(
          <button key={p} onClick={()=>setPreset(p)}
            style={{ padding:"5px 13px", borderRadius:6, fontSize:12, cursor:"pointer", fontFamily:"inherit", transition:"all .18s", border:`1.5px solid ${preset===p?C.secondary:C.border}`, background:preset===p?C.secondary:"white", color:preset===p?C.onYellow:C.muted, fontWeight:preset===p?700:400 }}>
            {p}
          </button>
        ))}
        {preset==="Custom"&&(
          <div style={{ display:"flex", alignItems:"center", gap:7, marginLeft:2 }}>
            <input type="date" value={cFrom} onChange={e=>setCFrom(e.target.value)} className="fi" style={{ width:136 }}/>
            <span style={{ fontSize:11, color:C.muted }}>to</span>
            <input type="date" value={cTo} onChange={e=>setCTo(e.target.value)} className="fi" style={{ width:136 }}/>
            <button className="bp">Apply</button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:12 }}>
        {STATS.map(s=>(
          <div key={s.label} className="sc" style={{ background:"white", borderRadius:11, padding:"11px 14px", boxShadow:`0 2px 8px rgba(33,58,84,.07)`, borderTop:`3px solid ${s.up?C.tertiary:"#e5e7eb"}` }}>
            <div style={{ fontSize:10.5, color:C.muted, fontWeight:500, marginBottom:3 }}>{s.label}</div>
            <div style={{ fontSize:22, fontWeight:700, color:C.primary, lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:10.5, color:s.up?"#16a34a":"#dc2626", fontWeight:500, marginTop:3 }}>{s.up?"▲":"▼"} {s.change} vs prev period</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <div style={{ background:"white", borderRadius:11, padding:"13px 16px", boxShadow:`0 2px 8px rgba(33,58,84,.06)` }}>
          <h3 style={{ fontSize:12.5, fontWeight:700, color:C.primary, marginBottom:8 }}>Email Activity</h3>
          <TrendChart />
        </div>
        <ClassificationInsights />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   CLASSIFICATION INSIGHTS
══════════════════════════════════════════════════════ */
const CLS_DATA = [
  { label:"Job",         count:18, pct:38 },
  { label:"Quote",       count:10, pct:22 },
  { label:"PPM",         count:8,  pct:17 },
  { label:"Invoice",     count:6,  pct:12 },
  { label:"Combination", count:3,  pct:7  },
  { label:"Other",       count:2,  pct:4  },
];
const TOTAL_EMAILS = CLS_DATA.reduce((s,d) => s + d.count, 0);

function ClassificationInsights() {
  const [selected, setSelected] = useState("Job");
  const cls = CLS_DATA.find(d => d.label === selected);
  const col = CLS_COLORS[selected] || { bg:"#374151", light:"#f3f4f6", text:"#374151" };
  const relatedWfs = WORKFLOWS.filter(w => w.trigger === selected);

  return (
    <div style={{ background:"white", borderRadius:11, padding:"13px 15px", boxShadow:`0 2px 8px rgba(33,58,84,.06)`, display:"flex", flexDirection:"column" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:9 }}>
        <h3 style={{ fontSize:12.5, fontWeight:700, color:C.primary }}>Classification Insights</h3>
        <span style={{ fontSize:10.5, color:C.muted }}>{TOTAL_EMAILS} total</span>
      </div>

      {/* Category pills */}
      <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:11 }}>
        {CLS_DATA.map(d => {
          const c = CLS_COLORS[d.label] || { bg:"#374151", light:"#f3f4f6", text:"#374151" };
          const active = selected === d.label;
          return (
            <button key={d.label} onClick={() => setSelected(d.label)}
              style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 10px", borderRadius:20, cursor:"pointer", fontFamily:"inherit", transition:"all .18s",
                border:`1.5px solid ${active ? c.bg : C.border}`,
                background: active ? c.bg : "white",
                color: active ? "white" : C.neutral,
                fontWeight: active ? 700 : 400, fontSize:11 }}>
              {d.label}
              <span style={{ background: active ? "rgba(255,255,255,.3)" : C.bg, color: active ? "white" : C.muted,
                fontSize:9.5, fontWeight:700, padding:"0 5px", borderRadius:10 }}>{d.pct}%</span>
            </button>
          );
        })}
      </div>

      {/* Stat strip */}
      <div style={{ background:col.light, borderRadius:9, padding:"9px 12px", marginBottom:10, display:"flex", alignItems:"center", gap:16 }}>
        <div>
          <div style={{ fontSize:9.5, color:col.text, fontWeight:600, opacity:.75 }}>EMAILS</div>
          <div style={{ fontSize:22, fontWeight:700, color:col.text, lineHeight:1.1 }}>{cls.count}</div>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:9.5, color:col.text, fontWeight:600, opacity:.75, marginBottom:4 }}>SHARE</div>
          <div style={{ background:"rgba(255,255,255,.5)", borderRadius:4, height:5, overflow:"hidden" }}>
            <div style={{ background:col.bg, width:`${cls.pct}%`, height:"100%", borderRadius:4, transition:"width .4s" }}></div>
          </div>
          <div style={{ fontSize:10.5, fontWeight:700, color:col.text, marginTop:2 }}>{cls.pct}% of {TOTAL_EMAILS}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:9.5, color:col.text, fontWeight:600, opacity:.75 }}>WORKFLOWS</div>
          <div style={{ fontSize:22, fontWeight:700, color:col.text, lineHeight:1.1 }}>{relatedWfs.length}</div>
        </div>
      </div>

      {/* Workflow list */}
      <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.5, marginBottom:6 }}>
        Workflows — {selected}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:6, overflowY:"auto" }}>
        {relatedWfs.length === 0
          ? <div style={{ fontSize:11.5, color:C.muted }}>No workflows for this category.</div>
          : relatedWfs.map(wf => (
            <div key={wf.id} style={{ background:C.bg, borderRadius:8, padding:"8px 11px", border:`1px solid ${C.border}`, borderLeft:`3px solid ${wf.active ? col.bg : C.border}`, display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:3 }}>
                  <span style={{ fontSize:11.5, fontWeight:700, color:C.primary }}>{wf.name}</span>
                  <span style={{ width:6, height:6, borderRadius:"50%", background: wf.active ? "#22c55e" : "#cbd5e1", flexShrink:0 }}></span>
                </div>
                <div style={{ display:"flex", gap:4 }}>
                  <DirBadge d={wf.direction} small />
                  {wf.requireConfirm && <span style={{ background:"#FFF8E1", color:"#92400e", fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:5 }}>Human Loop</span>}
                </div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.tertiary }}>{wf.runs} runs</div>
                <div style={{ fontSize:9.5, color:C.muted }}>Last: {wf.lastRun}</div>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TREND CHART
══════════════════════════════════════════════════════ */
const CHART_DATA = [
  { date:"Mar 14", emails:31, auto:6,  humanLoop:24, pending:7  },
  { date:"Mar 15", emails:38, auto:7,  humanLoop:29, pending:9  },
  { date:"Mar 16", emails:27, auto:5,  humanLoop:20, pending:6  },
  { date:"Mar 17", emails:42, auto:8,  humanLoop:34, pending:7  },
  { date:"Mar 18", emails:35, auto:6,  humanLoop:27, pending:7  },
  { date:"Mar 19", emails:29, auto:5,  humanLoop:22, pending:6  },
  { date:"Mar 20", emails:47, auto:6,  humanLoop:36, pending:9  },
];

const CHART_LINES = [
  { key:"emails",    label:"Emails Today",                    color:"#0056B3" },
  { key:"pending",   label:"Pending Review",                  color:"#dc2626" },
  { key:"humanLoop", label:"Processed by AI - Human In Loop", color:"#f59e0b" },
  { key:"auto",      label:"Processed by AI",                 color:"#16a34a" },
];

function TrendChart() {
  const [active, setActive] = useState(CHART_LINES.map(l=>l.key));
  const [tooltip, setTooltip] = useState(null);

  const W = 500, H = 160, PL = 30, PR = 10, PT = 6, PB = 18;
  const cW = W - PL - PR, cH = H - PT - PB;

  const visibleLines = CHART_LINES.filter(l => active.includes(l.key));
  const allVals = visibleLines.flatMap(l => CHART_DATA.map(d => d[l.key]));
  const maxVal = allVals.length ? Math.max(...allVals) : 100;
  const yMax = Math.ceil(maxVal / 20) * 20 || 20;

  const xPos = i => PL + (i / (CHART_DATA.length - 1)) * cW;
  const yPos = v => PT + cH - (v / yMax) * cH;

  const toPath = key =>
    CHART_DATA.map((d, i) => `${i === 0 ? "M" : "L"}${xPos(i).toFixed(1)},${yPos(d[key]).toFixed(1)}`).join(" ");

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(r => Math.round(r * yMax));

  const toggle = key => setActive(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key]);

  return (
    <div>
      {/* Legend */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:6 }}>
        {CHART_LINES.map(l => (
          <button key={l.key} onClick={() => toggle(l.key)}
            style={{ display:"flex", alignItems:"center", gap:4, background:"none", border:"none", cursor:"pointer", padding:0, fontFamily:"inherit", opacity: active.includes(l.key) ? 1 : 0.35 }}>
            <span style={{ width:16, height:2.5, background:l.color, borderRadius:2, display:"inline-block" }}></span>
            <span style={{ fontSize:10, color:C.neutral, fontWeight:500 }}>{l.label}</span>
          </button>
        ))}
      </div>

      {/* SVG chart */}
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow:"visible", display:"block" }}
        onMouseLeave={() => setTooltip(null)}>

        {/* Y grid + labels */}
        {yTicks.map(v => (
          <g key={v}>
            <line x1={PL} x2={PL + cW} y1={yPos(v)} y2={yPos(v)}
              stroke="#E0E6ED" strokeWidth={v === 0 ? 1.5 : 1} strokeDasharray={v === 0 ? "none" : "3,3"} />
            <text x={PL - 5} y={yPos(v) + 4} textAnchor="end" fontSize={9} fill={C.muted}>{v}</text>
          </g>
        ))}

        {/* X labels */}
        {CHART_DATA.map((d, i) => (
          <text key={i} x={xPos(i)} y={H - 6} textAnchor="middle" fontSize={9} fill={C.muted}>{d.date}</text>
        ))}

        {/* Lines */}
        {visibleLines.map(l => (
          <path key={l.key} d={toPath(l.key)} fill="none" stroke={l.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}

        {/* Dots + hover zones */}
        {CHART_DATA.map((d, i) => (
          <g key={i}>
            <rect x={xPos(i) - 14} y={PT} width={28} height={cH} fill="transparent"
              onMouseEnter={() => setTooltip({ i, x: xPos(i), d })} />
            {visibleLines.map(l => (
              <circle key={l.key} cx={xPos(i)} cy={yPos(d[l.key])} r={3}
                fill="white" stroke={l.color} strokeWidth={2} />
            ))}
          </g>
        ))}

        {/* Tooltip */}
        {tooltip && (() => {
          const tx = tooltip.x + 8 + 110 > W ? tooltip.x - 118 : tooltip.x + 8;
          return (
            <g>
              <line x1={tooltip.x} x2={tooltip.x} y1={PT} y2={PT + cH} stroke="#CBD5E1" strokeWidth={1} strokeDasharray="3,3" />
              <rect x={tx} y={PT} width={110} height={visibleLines.length * 16 + 22} rx={5} fill="white"
                stroke={C.border} strokeWidth={1} filter="drop-shadow(0 2px 4px rgba(0,0,0,.08))" />
              <text x={tx + 8} y={PT + 13} fontSize={9.5} fontWeight="700" fill={C.primary}>{tooltip.d.date}</text>
              {visibleLines.map((l, li) => (
                <g key={l.key}>
                  <rect x={tx + 8} y={PT + 20 + li * 16} width={8} height={3} rx={1} fill={l.color} />
                  <text x={tx + 20} y={PT + 27 + li * 16} fontSize={9} fill={C.neutral}>{l.label}: <tspan fontWeight="700" fill={C.primary}>{tooltip.d[l.key]}</tspan></text>
                </g>
              ))}
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIL VIEW — tabs: Inbound · Outbound · Drafts
══════════════════════════════════════════════════════ */
function MailView({ selectedThread, setSelectedThread }) {
  const [tab,         setTab]         = useState("Inbound");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editingId,   setEditingId]   = useState(null);
  const [editBodies,  setEditBodies]  = useState({});
  const [sentIds,     setSentIds]     = useState({});

  // Filter state
  const [fSearch,  setFSearch]  = useState("");
  const [fSender,  setFSender]  = useState("");
  const [fSubject, setFSubject] = useState("");
  const [fClass,   setFClass]   = useState("");
  const [fStatus,  setFStatus]  = useState("");
  const [fWf,      setFWf]      = useState("");
  const [fFrom,    setFFrom]    = useState("");
  const [fTo,      setFTo]      = useState("");

  const activeFC = [fSearch,fSender,fSubject,fClass,fStatus,fWf,fFrom,fTo].filter(Boolean).length;
  const clearF   = () => { setFSearch(""); setFSender(""); setFSubject(""); setFClass(""); setFStatus(""); setFWf(""); setFFrom(""); setFTo(""); };

  // Derive draft status considering live sent state
  const isThreadDraft = (th) =>
    th.messages.some(m => {
      const isSentLive = sentIds[m.id];
      return !isSentLive && (m.status==="draft");
    });

  // Tab filtering
  const tabFilter = (th) => {
    if (tab==="Inbound")  return th.messages.some(m=>m.direction==="Inbound");
    if (tab==="Outbound") return th.messages.some(m=>m.direction==="Outbound");
    if (tab==="Review")   return isThreadDraft(th);
    return true;
  };

  const tabCounts = {
    Inbound:  THREADS.filter(t=>t.messages.some(m=>m.direction==="Inbound")).length,
    Outbound: THREADS.filter(t=>t.messages.some(m=>m.direction==="Outbound")).length,
    Review:   THREADS.filter(t=>isThreadDraft(t)).length,
  };

  const filtered = THREADS.filter(th => {
    if (!tabFilter(th)) return false;
    const hay = JSON.stringify(th).toLowerCase();
    if (fSearch  && !hay.includes(fSearch.toLowerCase()))                                   return false;
    if (fSender  && !th.messages.some(m=>m.from.toLowerCase().includes(fSender.toLowerCase()))) return false;
    if (fSubject && !th.subject.toLowerCase().includes(fSubject.toLowerCase()))              return false;
    if (fClass   && th.classification!==fClass)                                             return false;
    if (fStatus  && !th.messages.some(m=>m.status===fStatus))                              return false;
    if (fWf      && !th.messages.some(m=>String(m.workflowId)===fWf))                      return false;
    if (fFrom    && th.lastDate<fFrom) return false;
    if (fTo      && th.lastDate>fTo)   return false;
    return true;
  });

  const handleApproveAndSend = (msgId) => {
    setSentIds(p => ({ ...p, [msgId]:true }));
    setEditingId(null);
  };

  return (
    <div style={{ display:"flex", gap:14, height:"calc(100vh - 114px)" }}>

      {/* Thread list */}
      <div style={{ width:322, background:"white", borderRadius:11, boxShadow:`0 2px 8px rgba(33,58,84,.07)`, display:"flex", flexDirection:"column", flexShrink:0 }}>

        {/* Tabs */}
        <div style={{ display:"flex", borderBottom:`1px solid ${C.border}` }}>
          {["Inbound","Outbound","Review"].map(t=>(
            <button key={t} className="tb" onClick={()=>{setTab(t);setSelectedThread(null);}}
              style={{ color:tab===t?C.tertiary:C.muted, fontWeight:tab===t?700:400, borderBottom:tab===t?`2px solid ${C.tertiary}`:"2px solid transparent" }}>
              {t}
              <span style={{ marginLeft:3, background:tab===t?"#EEF6FF":C.bg, color:tab===t?C.tertiary:C.muted, fontSize:10, fontWeight:700, padding:"1px 5px", borderRadius:8 }}>
                {tabCounts[t]}
              </span>
            </button>
          ))}
        </div>

        {/* Search + toggle */}
        <div style={{ padding:"9px 11px", borderBottom:`1px solid ${C.border}`, display:"flex", gap:6 }}>
          <input value={fSearch} onChange={e=>setFSearch(e.target.value)} placeholder="Search…" className="fi"/>
          <button className="bt">Sync</button>
          <button onClick={()=>setFiltersOpen(!filtersOpen)}
            style={{ background:filtersOpen||activeFC>0?"#FFF8E1":"#F6F8FA", border:`1.5px solid ${activeFC>0?C.secondary:C.border}`, borderRadius:6, padding:"6px 9px", cursor:"pointer", display:"flex", alignItems:"center", gap:4, fontSize:11, fontWeight:600, color:activeFC>0?C.onYellow:C.muted, whiteSpace:"nowrap", fontFamily:"inherit" }}>
            ⚙ {activeFC>0&&<span style={{ background:C.secondary, color:C.onYellow, borderRadius:10, padding:"0 4px", fontSize:10 }}>{activeFC}</span>}
          </button>
        </div>

        {/* Filters */}
        {filtersOpen&&(
          <div style={{ padding:"10px 11px", borderBottom:`1px solid ${C.border}`, background:C.bg }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
              {[["SENDER",fSender,setFSender,"text","e.g. acmecorp"],["SUBJECT",fSubject,setFSubject,"text","keyword"]].map(([lbl,val,set,type,ph])=>(
                <div key={lbl}>
                  <div style={{ fontSize:9.5, fontWeight:700, color:C.muted, marginBottom:3 }}>{lbl}</div>
                  <input type={type} value={val} onChange={e=>set(e.target.value)} placeholder={ph} className="fi"/>
                </div>
              ))}
              <div>
                <div style={{ fontSize:9.5, fontWeight:700, color:C.muted, marginBottom:3 }}>CLASSIFICATION</div>
                <select value={fClass} onChange={e=>setFClass(e.target.value)} className="fs">
                  <option value="">All</option>
                  {Object.keys(CLS_COLORS).map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:9.5, fontWeight:700, color:C.muted, marginBottom:3 }}>STATUS</div>
                <select value={fStatus} onChange={e=>setFStatus(e.target.value)} className="fs">
                  <option value="">All</option>
                  {["draft","sent","received","approved"].map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:9.5, fontWeight:700, color:C.muted, marginBottom:3 }}>WORKFLOW</div>
                <select value={fWf} onChange={e=>setFWf(e.target.value)} className="fs">
                  <option value="">All</option>
                  {WORKFLOWS.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:9.5, fontWeight:700, color:C.muted, marginBottom:3 }}>DATE FROM</div>
                <input type="date" value={fFrom} onChange={e=>setFFrom(e.target.value)} className="fi"/>
              </div>
              <div>
                <div style={{ fontSize:9.5, fontWeight:700, color:C.muted, marginBottom:3 }}>DATE TO</div>
                <input type="date" value={fTo} onChange={e=>setFTo(e.target.value)} className="fi"/>
              </div>
              <div style={{ gridColumn:"1/-1", display:"flex", justifyContent:"flex-end" }}>
                <button onClick={clearF} style={{ fontSize:11, color:C.muted, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>✕ Clear all</button>
              </div>
            </div>
          </div>
        )}

        <div style={{ padding:"5px 13px", fontSize:10.5, color:C.muted, borderBottom:`1px solid ${C.border}` }}>
          {filtered.length} thread{filtered.length!==1?"s":""}{activeFC>0?" (filtered)":""}
        </div>

        {/* List */}
        <div style={{ flex:1, overflowY:"auto" }}>
          {filtered.length===0
            ? <div style={{ padding:22, textAlign:"center", color:C.muted, fontSize:12 }}>No threads match</div>
            : filtered.map(th=>{
              const hasDraft = isThreadDraft(th);
              const dirs = [...new Set(th.messages.map(m=>m.direction))];
              return (
                <div key={th.id} className={`tr${selectedThread?.id===th.id?" sel":""}`}
                  onClick={()=>setSelectedThread(th)}
                  style={{ padding:"10px 12px", borderBottom:`1px solid ${C.bg}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                      {th.unread&&<span style={{ width:5,height:5,background:C.secondary,borderRadius:"50%",display:"inline-block",flexShrink:0 }}></span>}
                      <span style={{ fontSize:11, fontWeight:th.unread?700:500, color:C.primary, maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {th.messages[0].direction==="Inbound" ? th.messages[0].from.split("@")[0] : (th.messages[0].to?.split("@")[0]||"Outbound")}
                      </span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                      {th.messages.length>1&&<span style={{ background:C.bg, color:C.muted, fontSize:9.5, fontWeight:600, padding:"1px 5px", borderRadius:8 }}>🔗{th.messages.length}</span>}
                      <span style={{ fontSize:10, color:C.muted }}>{th.lastTime}</span>
                    </div>
                  </div>
                  <div style={{ fontSize:11.5, fontWeight:th.unread?600:400, color:C.neutral, marginBottom:5, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {th.subject}
                  </div>
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                    {dirs.map(d=><DirBadge key={d} d={d} small/>)}
                    <ClassBadge c={th.classification}/>
                    {hasDraft&&<span style={{ background:"#FFF8E1", color:"#92400e", fontSize:9.5, fontWeight:700, padding:"1px 6px", borderRadius:6 }}>Draft</span>}
                  </div>
                </div>
              );
            })
          }
        </div>
      </div>

      {/* Thread detail */}
      <div style={{ flex:1, background:"white", borderRadius:11, boxShadow:`0 2px 8px rgba(33,58,84,.07)`, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {selectedThread
          ? <ThreadDetail
              thread={selectedThread}
              editingId={editingId} setEditingId={setEditingId}
              editBodies={editBodies} setEditBodies={setEditBodies}
              sentIds={sentIds} onApproveAndSend={handleApproveAndSend}
            />
          : <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:C.muted }}>
              <div style={{ fontSize:36, marginBottom:7 }}>✉</div>
              <div style={{ fontSize:13, fontWeight:500 }}>Select a thread to view the conversation</div>
            </div>
        }
      </div>
    </div>
  );
}

/* ── Thread Detail ────────────────────────────────────── */
function ThreadDetail({ thread, editingId, setEditingId, editBodies, setEditBodies, sentIds, onApproveAndSend }) {
  const [recordApproved, setRecordApproved] = useState(false);
  const needsRecordApproval = !!thread.draftRecord;
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      {/* Header */}
      <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
        <h2 style={{ fontSize:14.5, fontWeight:700, color:C.primary, marginBottom:5 }}>{thread.subject}</h2>
        <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
          <ClassBadge c={thread.classification}/>
          <span style={{ background:C.bg, color:C.muted, fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:6 }}>
            🔗 {thread.messages.length} message{thread.messages.length>1?"s":""}
          </span>
          {[...new Set(thread.messages.map(m=>m.direction))].map(d=><DirBadge key={d} d={d}/>)}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px 18px", display:"flex", flexDirection:"column", gap:16 }}>
        {thread.messages.map((msg, msgIdx)=>{
          const wf      = WORKFLOWS.find(w=>w.id===msg.workflowId);
          const isOut   = msg.direction==="Outbound";
          const isSent  = sentIds[msg.id] || msg.status==="sent" || msg.status==="approved";
          const isEdit  = editingId===msg.id;
          const body    = editBodies[msg.id] ?? msg.body;
          // Insert draft record block between last inbound and first outbound draft
          const showDraftRecord = thread.draftRecord && isOut && msg.status==="draft" && !sentIds[msg.id]
            && msgIdx > 0 && thread.messages[msgIdx-1].direction==="Inbound";

          return (
            <React.Fragment key={msg.id}>
              {showDraftRecord && (
                <DraftRecordBlock
                  record={thread.draftRecord}
                  sentIds={sentIds}
                  threadMsgs={thread.messages}
                  onApprove={()=>setRecordApproved(true)}
                  approved={recordApproved}
                  onFieldsSaved={(updatedFields) => {
                    const outMsg = thread.messages.find(m => m.direction==="Outbound" && m.status==="draft");
                    if (!outMsg) return;
                    const g = (label) => updatedFields.find(f => f.label===label)?.value || "—";
                    const customerName = g("Customer").split("—")[0].trim();
                    const firstName = customerName.split(" ")[0];
                    let newBody = "";
                    if (thread.draftRecord.type === "Job") {
                      newBody =
`Dear ${firstName},

Thank you for contacting us. We have logged your request under job reference DRAFT.

Customer: ${g("Customer")}
Site: ${g("Site")}
Job Type: ${g("Job Type")}
Description: ${g("Job Description")}
Priority: ${g("Priority")}
Category: ${g("Job Category")}
Trade: ${g("Job Primary Trade")}

An engineer will be assigned and you will receive a confirmed visit time shortly. Please ensure safe access to the site is available.

Kind regards,
FSM Operations Team`;
                    } else if (thread.draftRecord.type === "Quote") {
                      newBody =
`Dear ${firstName},

Thank you for your quote request. We have reviewed your requirements and prepared the following draft quote.

Customer: ${g("Customer")}
Site: ${g("Site")}
Title: ${g("Title")}
Description: ${g("Description")}
Job Type: ${g("Job Type")}
Trade: ${g("Quote Trade")}
Category: ${g("Job Category")}
Priority: ${g("Priority")}
Quote Reference: DRAFT

This quote is subject to a site survey, which we will arrange shortly.

Kind regards,
FSM Operations Team`;
                    }
                    if (newBody) setEditBodies(p => ({ ...p, [outMsg.id]: newBody }));
                  }}
                />
              )}
              <div style={{ display:"flex", flexDirection:"column", alignItems:isOut?"flex-end":"flex-start" }}>              {/* Avatar + sender */}
              <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5, flexDirection:isOut?"row-reverse":"row" }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:isOut?C.secondary:C.primary, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:isOut?C.onYellow:"white", flexShrink:0 }}>
                  {isOut?"AI":msg.from.charAt(0).toUpperCase()}
                </div>
                <div style={{ textAlign:isOut?"right":"left" }}>
                  <div style={{ fontSize:11.5, fontWeight:600, color:C.primary }}>
                    {isOut ? "AI Agent" : msg.from}
                  </div>
                  <div style={{ fontSize:10, color:C.muted }}>
                    {msg.time} · {isOut?(isSent?"Sent ✓":"Awaiting Approval"):"Received"}
                  </div>
                </div>
              </div>

              {/* Bubble */}
              <div style={{ maxWidth:"88%", width:"100%" }}>
                {isEdit
                  ? <textarea value={body} onChange={e=>setEditBodies(p=>({...p,[msg.id]:e.target.value}))}
                      style={{ width:"100%", minHeight:160, border:`1.5px solid ${C.tertiary}`, borderRadius:10, padding:"13px 15px", fontSize:13, lineHeight:1.75, color:C.neutral, resize:"vertical", outline:"none", fontFamily:"inherit", background:"#EEF6FF" }}/>
                  : <div className="mb" style={{ background:isOut?(isSent?"#f0fdf4":"#FFFBEB"):C.bg, border:`1px solid ${isOut?(isSent?"#bbf7d0":"#fde68a"):C.border}` }}>
                      <LinkifiedBody text={body} isDraft={!isSent && msg.status==="draft"} />
                    </div>
                }

                {/* Workflow bar */}
                {wf&&(
                  <div style={{ marginTop:7, background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, padding:"7px 11px", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    <span style={{ fontSize:10, color:C.muted }}>⚡ <b style={{ color:C.primary }}>{wf.name}</b></span>
                    <DirBadge d={msg.direction} small/>
                    {msg.aiGenerated&&<span style={{ background:"#ede9fe", color:"#6d28d9", fontSize:9.5, fontWeight:700, padding:"1px 7px", borderRadius:6 }}>✦ AI Generated</span>}
                    {isOut&&!isSent&&<span style={{ background:"#FFF8E1", color:"#92400e", fontSize:9.5, fontWeight:600, padding:"1px 7px", borderRadius:6 }}>⏳ Pending Approval</span>}
                    {isSent&&<span style={{ background:"#d1fae5", color:"#065f46", fontSize:9.5, fontWeight:600, padding:"1px 7px", borderRadius:6 }}>✓ Sent</span>}
                  </div>
                )}

                {/* Actions — outbound drafts only */}
                {isOut&&!isSent&&(
                  <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end" }}>
                    {needsRecordApproval && !recordApproved && (
                      <div style={{ display:"flex", alignItems:"center", gap:6, background:"#FFF8E1", border:"1px solid #fde68a", borderRadius:7, padding:"6px 11px", fontSize:11, color:"#92400e", fontWeight:500 }}>
                        <span>⚠</span>
                        <span>You must approve the draft {thread.draftRecord.type} record above before sending this email.</span>
                      </div>
                    )}
                    <div style={{ display:"flex", gap:7 }}>
                      {isEdit
                        ? <button className="bg" onClick={()=>setEditingId(null)}>✕ Cancel</button>
                        : <button className="bg" onClick={()=>setEditingId(msg.id)}>✏ Edit Draft</button>
                      }
                      <button
                        className="bp"
                        onClick={()=>{ if(!needsRecordApproval || recordApproved) onApproveAndSend(msg.id); }}
                        title={needsRecordApproval && !recordApproved ? `Approve the ${thread.draftRecord.type} record first` : ""}
                        style={{ opacity: needsRecordApproval && !recordApproved ? 0.4 : 1, cursor: needsRecordApproval && !recordApproved ? "not-allowed" : "pointer" }}>
                        ✓ Approve &amp; Send
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            </React.Fragment>
          );
        })}

        {/* Pending AI response placeholder */}
        {(()=>{
          const last = thread.messages[thread.messages.length-1];
          if (last.direction==="Inbound" && !thread.messages.some(m=>m.direction==="Outbound")) {
            const wf = WORKFLOWS.find(w=>w.id===last.workflowId);
            return (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end" }}>
                <div style={{ background:C.bg, border:`2px dashed ${C.border}`, borderRadius:10, padding:"14px 16px", maxWidth:"88%", width:"100%", textAlign:"center" }}>
                  <div style={{ fontSize:12, color:C.muted, fontWeight:500, marginBottom:3 }}>
                    ⏳ AI is preparing a response via <b style={{ color:C.primary }}>{wf?.name||"workflow"}</b>…
                  </div>
                  <div style={{ fontSize:11, color:"#CBD5E1" }}>Draft will appear here for your approval</div>
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
function WorkflowsView({ wfStates, toggleWf, toggleConfirm, toggleAck }) {
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [fName,setFName]=useState("");
  const [fTrig,setFTrig]=useState("");
  const [fDir,setFDir]=useState("");
  const [fStat,setFStat]=useState("");

  const activeFC=[fName,fTrig,fDir,fStat].filter(Boolean).length;
  const clearF=()=>{setFName("");setFTrig("");setFDir("");setFStat("");};

  const filtered=WORKFLOWS.filter(wf=>{
    if(fName&&!wf.name.toLowerCase().includes(fName.toLowerCase())) return false;
    if(fTrig&&wf.trigger!==fTrig) return false;
    if(fDir&&wf.direction!==fDir) return false;
    if(fStat==="active"&&!wfStates[wf.id].active) return false;
    if(fStat==="inactive"&&wfStates[wf.id].active) return false;
    return true;
  });

  return (
    <div>
      <div style={{ marginBottom:16 }}>
        <h2 style={{ fontSize:15, fontWeight:700, color:C.primary }}>Workflow Management</h2>
        <p style={{ fontSize:12, color:C.muted, marginTop:2 }}>Configure automated actions triggered by email classifications</p>
      </div>

      {/* Filter bar */}
      <div style={{ background:"white", borderRadius:10, marginBottom:14, boxShadow:`0 2px 8px rgba(33,58,84,.05)`, overflow:"hidden" }}>
        <div style={{ padding:"9px 13px", display:"flex", alignItems:"center", gap:8 }}>
          <input value={fName} onChange={e=>setFName(e.target.value)} placeholder="Search workflows…" className="fi" style={{ maxWidth:230 }}/>
          <button onClick={()=>setFiltersOpen(!filtersOpen)}
            style={{ background:filtersOpen||activeFC>0?"#FFF8E1":C.bg, border:`1.5px solid ${activeFC>0?C.secondary:C.border}`, borderRadius:6, padding:"6px 12px", cursor:"pointer", display:"flex", alignItems:"center", gap:5, fontSize:12, fontWeight:600, color:activeFC>0?C.onYellow:C.muted, fontFamily:"inherit" }}>
            ⚙ Filters {activeFC>0&&<span style={{ background:C.secondary, color:C.onYellow, borderRadius:10, padding:"0 5px", fontSize:10 }}>{activeFC}</span>}
          </button>
          {activeFC>0&&<button onClick={clearF} style={{ fontSize:11.5, color:C.muted, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>✕ Clear</button>}
          <span style={{ marginLeft:"auto", fontSize:11.5, color:C.muted }}>{filtered.length} of {WORKFLOWS.length}</span>
        </div>
        {filtersOpen&&(
          <div style={{ padding:"10px 13px 13px", borderTop:`1px solid ${C.border}`, background:C.bg, display:"flex", gap:10, flexWrap:"wrap" }}>
            {[["TRIGGER",fTrig,setFTrig,"Classification"],["DIRECTION",fDir,setFDir,"Direction"]].map(([lbl,val,set,type])=>(
              <div key={lbl} style={{ minWidth:170 }}>
                <div style={{ fontSize:9.5, fontWeight:700, color:C.muted, marginBottom:4 }}>{lbl}</div>
                <select value={val} onChange={e=>set(e.target.value)} className="fs">
                  <option value="">All {type}s</option>
                  {lbl==="TRIGGER"?Object.keys(CLS_COLORS).map(c=><option key={c}>{c}</option>):<><option>Inbound</option><option>Outbound</option></>}
                </select>
              </div>
            ))}
            <div style={{ minWidth:130 }}>
              <div style={{ fontSize:9.5, fontWeight:700, color:C.muted, marginBottom:4 }}>STATUS</div>
              <select value={fStat} onChange={e=>setFStat(e.target.value)} className="fs">
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div style={{ display:"grid", gap:12 }}>
        {filtered.map(wf=>{
          const st=wfStates[wf.id];
          return (
            <div key={wf.id} style={{ background:"white", borderRadius:11, boxShadow:`0 2px 8px rgba(33,58,84,.06)`, borderLeft:`4px solid ${st.active?CLS_COLORS[wf.trigger]?.bg||C.primary:C.border}`, overflow:"hidden" }}>
              <div style={{ padding:"16px 20px", display:"flex", alignItems:"flex-start", gap:14 }}>
                {/* Left: info */}
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:6 }}>
                    <span style={{ fontSize:14, fontWeight:700, color:C.primary }}>{wf.name}</span>
                    <ClassBadge c={wf.trigger}/>
                    <DirBadge d={wf.direction} small/>
                    {/* Gear icon */}
                    <button title="Configure workflow"
                      style={{ marginLeft:"auto", background:C.bg, border:`1.5px solid ${C.border}`, borderRadius:7, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:C.primary, fontSize:16, transition:"all .18s", flexShrink:0 }}>
                      ⚙
                    </button>
                  </div>
                  <p style={{ fontSize:12.5, color:"#555E6A", lineHeight:1.65, marginBottom:10 }}>{wf.description}</p>
                  <div style={{ display:"flex", gap:14, fontSize:11, color:C.muted }}>
                    <span>⚡ <b style={{ color:C.primary }}>{wf.runs}</b> total runs</span>
                    <span>🕐 Last: <b style={{ color:C.primary }}>{wf.lastRun}</b></span>
                  </div>
                </div>

                {/* Right: toggles */}
                <div style={{ display:"flex", flexDirection:"column", gap:9, flexShrink:0, minWidth:190 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, fontWeight:600, color:C.neutral }}>Workflow</div>
                      <div style={{ fontSize:10, color:C.muted }}>{st.active?"Running":"Paused"}</div>
                    </div>
                    <span style={{ fontSize:11, color:st.active?"#16a34a":C.muted, fontWeight:600 }}>{st.active?"On":"Off"}</span>
                    <label className="ts"><input type="checkbox" checked={st.active} onChange={()=>toggleWf(wf.id)}/><span className="sl"></span></label>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, background:st.requireConfirm?"#FFF8E1":C.bg, border:`1px solid ${st.requireConfirm?"#fde68a":C.border}`, borderRadius:8, padding:"8px 12px" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, fontWeight:600, color:C.neutral }}>Human in the Loop</div>
                      <div style={{ fontSize:10, color:C.muted }}>{st.requireConfirm?"Confirm before send":"Fully automated"}</div>
                    </div>
                    <label className="ts"><input type="checkbox" checked={st.requireConfirm} onChange={()=>toggleConfirm(wf.id)}/><span className="sl"></span></label>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, background:st.generalAck?"#f0fdf4":C.bg, border:`1px solid ${st.generalAck?"#bbf7d0":C.border}`, borderRadius:8, padding:"8px 12px" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, fontWeight:600, color:C.neutral }}>General Acknowledgment</div>
                      <div style={{ fontSize:10, color:C.muted }}>{st.generalAck?"Auto-acknowledge receipt":"No auto-acknowledgment"}</div>
                    </div>
                    <label className="ts"><input type="checkbox" checked={st.generalAck} onChange={()=>toggleAck(wf.id)}/><span className="sl"></span></label>
                  </div>
                </div>
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
const DEFAULT_ACK_TEMPLATES = WORKFLOWS.reduce((acc, wf) => {
  const triggerLine = {
    Job:         "We have received your job request and our team is reviewing the details.",
    Quote:       "We have received your quote request and will prepare a detailed proposal shortly.",
    PPM:         "We have received your planned maintenance schedule and are loading it into our system.",
    Invoice:     "We have received your invoice query and our accounts team will review it promptly.",
    Combination: "We have received your message and are handling each request separately.",
    Other:       "We have received your email and a member of our team will review it shortly.",
  };
  acc[wf.id] =
`Dear {{customer_name}},

Thank you for contacting us regarding your {{workflow_name}} request.

${triggerLine[wf.trigger] || "We have received your message and will be in touch shortly."}

Reference: {{reference_number}}
Received: {{received_date}}

We will be in touch shortly.

Kind regards,
FSM Operations Team`;
  return acc;
}, {});

function PersonalizationView() {
  const [tone,           setTone]           = useState("professional");
  const [signature,      setSignature]      = useState("Best regards,\nFSM Email AI Agent");
  const [customTemplate, setCustomTemplate] = useState("Dear {{name}},\n\nThank you for your email.\n\n{{body}}\n\nKind regards,\n{{sender}}\n");
  const [font,           setFont]           = useState("DM Sans");
  const [fs,             setFs]             = useState("14");
  const [lh,             setLh]             = useState("1.6");
  const [ew,             setEw]             = useState("640");
  const [ackTemplates,   setAckTemplates]   = useState(DEFAULT_ACK_TEMPLATES);
  const [ackWfId,        setAckWfId]        = useState(WORKFLOWS[0].id);
  const [ackSaved,       setAckSaved]       = useState({});

  const selectedWf = WORKFLOWS.find(w => w.id === ackWfId);
  const ackBody    = ackTemplates[ackWfId] ?? "";

  const handleAckSave = () => {
    setAckSaved(p => ({ ...p, [ackWfId]: true }));
    setTimeout(() => setAckSaved(p => ({ ...p, [ackWfId]: false })), 2000);
  };

  const previewStyle = {
    fontFamily: font, fontSize:`${fs}px`, lineHeight:lh, color:C.neutral,
    maxWidth:`${ew}px`, padding:"22px 26px", background:"white", borderRadius:10, border:`1px solid ${C.border}`,
  };

  return (
    <div style={{ maxWidth:860 }}>
      <div style={{ marginBottom:16 }}>
        <h2 style={{ fontSize:15, fontWeight:700, color:C.primary }}>Personalization & Settings</h2>
        <p style={{ fontSize:12, color:C.muted, marginTop:2 }}>Configure how the AI agent behaves and communicates</p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, alignItems:"start" }}>
        {/* LEFT */}
        <div style={{ display:"grid", gap:13 }}>

          {/* Stationery */}
          <div style={{ background:"white", borderRadius:11, padding:19, boxShadow:`0 2px 8px rgba(33,58,84,.06)` }}>
            <h3 style={{ fontSize:13, fontWeight:700, color:C.primary, marginBottom:14 }}>Email Stationery</h3>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.muted, display:"block", marginBottom:5, textTransform:"uppercase" }}>Font Family</label>
              <select value={font} onChange={e=>setFont(e.target.value)} className="fs">
                {FONTS.map(f=><option key={f} value={f} style={{ fontFamily:f }}>{f}</option>)}
              </select>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:C.muted, display:"block", marginBottom:5, textTransform:"uppercase" }}>Font Size (px)</label>
                <select value={fs} onChange={e=>setFs(e.target.value)} className="fs">
                  {["12","13","14","15","16"].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:C.muted, display:"block", marginBottom:5, textTransform:"uppercase" }}>Line Height</label>
                <select value={lh} onChange={e=>setLh(e.target.value)} className="fs">
                  {["1.4","1.5","1.6","1.7","1.8"].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:C.muted, display:"block", marginBottom:5, textTransform:"uppercase" }}>Email Width (px)</label>
              <select value={ew} onChange={e=>setEw(e.target.value)} className="fs">
                {["560","600","640","700","760"].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* AI Behaviour */}
          <div style={{ background:"white", borderRadius:11, padding:19, boxShadow:`0 2px 8px rgba(33,58,84,.06)` }}>
            <h3 style={{ fontSize:13, fontWeight:700, color:C.primary, marginBottom:13 }}>AI Behaviour</h3>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.muted, display:"block", marginBottom:6, textTransform:"uppercase" }}>Response Tone</label>
              <div style={{ display:"flex", gap:7 }}>
                {["professional","friendly","concise"].map(t=>(
                  <button key={t} onClick={()=>setTone(t)}
                    style={{ padding:"6px 14px", border:`2px solid ${tone===t?C.tertiary:C.border}`, background:tone===t?"#EEF6FF":"white", color:tone===t?C.tertiary:C.neutral, borderRadius:6, fontSize:12, fontWeight:tone===t?600:400, cursor:"pointer", textTransform:"capitalize", transition:"all .2s", fontFamily:"inherit" }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            {/* (AI Behaviour toggles removed per request) */}
            {/* Empty block retained by design */}
          </div>

          {/* Custom Email Template */}
          <div style={{ background:"white", borderRadius:11, padding:19, boxShadow:`0 2px 8px rgba(33,58,84,.06)` }}>
            <h3 style={{ fontSize:13, fontWeight:700, color:C.primary, marginBottom:13 }}>Custom Email Template</h3>
            <textarea value={customTemplate} onChange={e=>setCustomTemplate(e.target.value)} rows={8}
              style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 11px", fontSize:12, color:C.neutral, resize:"vertical", outline:"none", fontFamily:"inherit" }}/>
            <div style={{ marginTop:8, fontSize:11, color:C.muted }}>
              Use placeholders: <code>{'{{name}}'}</code>, <code>{'{{body}}'}</code>, <code>{'{{sender}}'}</code>
            </div>
          </div>

          {/* Acknowledgement Templates */}
          <div style={{ background:"white", borderRadius:11, padding:19, boxShadow:`0 2px 8px rgba(33,58,84,.06)` }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <h3 style={{ fontSize:13, fontWeight:700, color:C.primary }}>Acknowledgement Templates</h3>
              <span style={{ background:"#ede9fe", color:"#6d28d9", fontSize:9.5, fontWeight:700, padding:"2px 8px", borderRadius:10 }}>Per Workflow</span>
            </div>
            <p style={{ fontSize:11, color:C.muted, marginBottom:13 }}>
              Customise the auto-acknowledgement message sent to customers when each workflow is triggered.
            </p>

            {/* Workflow selector */}
            <div style={{ marginBottom:11 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.muted, display:"block", marginBottom:5, textTransform:"uppercase" }}>Workflow</label>
              <select value={ackWfId} onChange={e=>setAckWfId(Number(e.target.value))} className="fs">
                {WORKFLOWS.map(wf=>(
                  <option key={wf.id} value={wf.id}>{wf.name} — {wf.trigger} ({wf.direction})</option>
                ))}
              </select>
            </div>

            {/* Context strip */}
            {selectedWf && (
              <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:11, background:C.bg, borderRadius:8, padding:"8px 11px", border:`1px solid ${C.border}` }}>
                <ClassBadge c={selectedWf.trigger}/>
                <DirBadge d={selectedWf.direction} small/>
                <span style={{ fontSize:11, color:C.muted, marginLeft:2 }}>{selectedWf.description.slice(0,80)}…</span>
              </div>
            )}

            {/* Template editor */}
            <textarea
              value={ackBody}
              onChange={e => setAckTemplates(p => ({ ...p, [ackWfId]: e.target.value }))}
              rows={9}
              style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 11px", fontSize:12, color:C.neutral, resize:"vertical", outline:"none", fontFamily:"inherit" }}
            />

            {/* Placeholders */}
            <div style={{ marginTop:7, marginBottom:11, fontSize:11, color:C.muted, lineHeight:1.7 }}>
              Dynamic placeholders:{" "}
              {[
                ["{{customer_name}}","Customer's name"],
                ["{{workflow_name}}","Triggered workflow"],
                ["{{reference_number}}","Auto-generated ref"],
                ["{{received_date}}","Date email received"],
              ].map(([ph, tip]) => (
                <span key={ph} title={tip} style={{ display:"inline-block", background:"#f3f4f6", color:C.tertiary, fontFamily:"monospace", fontSize:10.5, padding:"1px 6px", borderRadius:4, marginRight:5, cursor:"default", border:`1px solid ${C.border}` }}>
                  {ph}
                </span>
              ))}
            </div>

            <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
              <button className="bg" onClick={() => setAckTemplates(p => ({ ...p, [ackWfId]: DEFAULT_ACK_TEMPLATES[ackWfId] }))}>
                ↺ Reset
              </button>
              <button className="bt" onClick={handleAckSave}>
                {ackSaved[ackWfId] ? "✓ Saved" : "Save Template"}
              </button>
            </div>
          </div>

          {/* Signature */}
          <div style={{ background:"white", borderRadius:11, padding:19, boxShadow:`0 2px 8px rgba(33,58,84,.06)` }}>
            <h3 style={{ fontSize:13, fontWeight:700, color:C.primary, marginBottom:9 }}>Email Signature</h3>
            <textarea value={signature} onChange={e=>setSignature(e.target.value)} rows={4}
              style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 11px", fontSize:13, color:C.neutral, resize:"vertical", outline:"none", fontFamily:"inherit" }}/>
          </div>

          {/* Notifications */}
          <div style={{ background:"white", borderRadius:11, padding:19, boxShadow:`0 2px 8px rgba(33,58,84,.06)` }}>
            <h3 style={{ fontSize:13, fontWeight:700, color:C.primary, marginBottom:11 }}>Notifications</h3>
            {[
              ["Email classified",      "Notify when an email is classified by the AI", true],
              ["Workflow completed",    "Notify when a workflow finishes running",       true],
              ["Draft created",         "Notify when a draft is created for approval",  true],
              ["Classification failed", "Notify when AI cannot classify an email",      false],
            ].map(([lbl,desc,def])=>(
              <div key={lbl} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderTop:`1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:C.neutral }}>{lbl}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{desc}</div>
                </div>
                <label className="ts"><input type="checkbox" defaultChecked={def}/><span className="sl"></span></label>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — live preview */}
        <div style={{ position:"sticky", top:0 }}>
          <div style={{ background:"white", borderRadius:11, padding:19, boxShadow:`0 2px 8px rgba(33,58,84,.06)`, marginBottom:13 }}>
            <h3 style={{ fontSize:13, fontWeight:700, color:C.primary, marginBottom:2 }}>Live Preview</h3>
            <p style={{ fontSize:11, color:C.muted, marginBottom:14 }}>Sample outbound email with your stationery applied</p>
            <div style={{ background:C.bg, borderRadius:8, padding:12, overflow:"auto" }}>
              <div style={previewStyle}>
                <div style={{ height:4, background:C.secondary, borderRadius:3, marginBottom:18 }}></div>
                <p style={{ marginBottom:13 }}>Dear John Smith,</p>
                <p style={{ marginBottom:13 }}>Thank you for contacting us. We have logged your request for the AC unit fault at Site B under job reference <b>JOB-2026-0441</b>.</p>
                <p style={{ marginBottom:13 }}>An engineer has been provisionally scheduled and you will receive a confirmed visit time within the next 2 hours.</p>
                <p style={{ marginBottom:16 }}>Kind regards,</p>
                <p style={{ fontSize:`${Math.max(11,Number(fs)-1)}px`, color:C.muted, whiteSpace:"pre-line" }}>{signature}</p>
                <div style={{ height:3, background:C.primary, borderRadius:3, marginTop:18, opacity:0.15 }}></div>
              </div>
            </div>
          </div>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:9 }}>
            <button className="bg">Discard</button>
            <button className="bp">Save Settings</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Draft Record Block ───────────────────────────────── */
function DraftRecordBlock({ record, sentIds, threadMsgs, onApprove, approved }) {
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState(record.fields);
  const col = CLS_COLORS[record.type] || { bg:"#374151", light:"#f3f4f6", text:"#374151" };
  const outboundMsg = threadMsgs.find(m => m.direction==="Outbound" && m.status==="draft");
  if (!outboundMsg || sentIds[outboundMsg.id]) return null;

  const updateField = (i, val) => setFields(p => p.map((f,idx) => idx===i ? {...f, value:val} : f));

  const badge = (f) => {
    if (f.mandatory) return <span style={{ color:"#dc2626", fontSize:9, fontWeight:700, marginLeft:2 }}>*</span>;
    if (f.system)    return <span style={{ background:"#EEF2F6", color:C.muted, fontSize:8.5, fontWeight:700, padding:"0 5px", borderRadius:4, marginLeft:4 }}>AUTO</span>;
    return <span style={{ background:"#f3f4f6", color:"#9ca3af", fontSize:8.5, fontWeight:600, padding:"0 5px", borderRadius:4, marginLeft:4 }}>OPT</span>;
  };

  return (
    <div style={{ border:`2px solid ${col.bg}`, borderRadius:11, margin:"4px 0" }}>
      {/* Header */}
      <div style={{ background:col.bg, padding:"10px 16px", display:"flex", alignItems:"center", gap:8, borderRadius:"9px 9px 0 0" }}>
        <span style={{ color:"white", fontSize:11.5, fontWeight:700 }}>✦ AI Generated Draft {record.type}</span>
        <span style={{ background:"rgba(255,255,255,.2)", color:"white", fontSize:10, fontWeight:700, padding:"2px 9px", borderRadius:10 }}>⏳ Pending Human Approval</span>
        <span style={{ marginLeft:"auto", color:"rgba(255,255,255,.65)", fontSize:10 }}>Ref: {record.ref}</span>
      </div>

      {/* Legend */}
      <div style={{ background:col.bg, borderTop:"1px solid rgba(255,255,255,.15)", padding:"5px 16px", display:"flex", gap:14 }}>
        <span style={{ fontSize:9.5, color:"rgba(255,255,255,.8)" }}><span style={{ color:"#fca5a5", fontWeight:700 }}>*</span> Mandatory</span>
        <span style={{ fontSize:9.5, color:"rgba(255,255,255,.8)" }}><span style={{ background:"rgba(255,255,255,.2)", padding:"0 4px", borderRadius:3, fontSize:8.5, fontWeight:700 }}>AUTO</span> System-generated</span>
        <span style={{ fontSize:9.5, color:"rgba(255,255,255,.8)" }}><span style={{ background:"rgba(255,255,255,.15)", padding:"0 4px", borderRadius:3, fontSize:8.5, fontWeight:600 }}>OPT</span> Optional</span>
      </div>

      {/* Fields */}
      <div style={{ background:"white", padding:"14px 16px", borderRadius:"0 0 9px 9px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 20px" }}>
          {fields.map((f, i) => (
            <div key={i} style={{ display:"flex", flexDirection:"column", gap:3 }}>
              <div style={{ display:"flex", alignItems:"center" }}>
                <span style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.4 }}>{f.label}</span>
                {badge(f)}
              </div>
              {editing && !f.system
                ? <input value={f.value} onChange={e=>updateField(i, e.target.value)}
                    style={{ fontSize:12, color:C.neutral, background:"white", border:`1.5px solid ${col.bg}`, borderRadius:6, padding:"5px 9px", outline:"none", fontFamily:"inherit" }}/>
                : <span style={{ fontSize:12.5, color: f.system ? C.muted : C.neutral, fontWeight: f.mandatory ? 600 : 400,
                    background: f.system ? C.bg : "transparent",
                    padding: f.system ? "3px 8px" : "0",
                    borderRadius: f.system ? 5 : 0,
                    fontStyle: f.value==="—" ? "italic" : "normal" }}>
                    {f.value}
                  </span>
              }
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display:"flex", gap:7, marginTop:14, paddingTop:12, borderTop:`1px solid ${C.border}`, alignItems:"center" }}>
          {editing
            ? <>
                <button className="bg" style={{ fontSize:11 }} onClick={()=>setEditing(false)}>✕ Cancel</button>
                <button className="bt" style={{ fontSize:11 }} onClick={()=>setEditing(false)}>✓ Save Changes</button>
              </>
            : <button className="bg" style={{ fontSize:11 }} onClick={()=>setEditing(true)}>✏ Edit Record</button>
          }
          <span style={{ fontSize:10.5, color:C.muted, marginLeft:"auto" }}>Review all fields before approving</span>
          {approved
            ? <span style={{ background:"#d1fae5", color:"#065f46", fontSize:11, fontWeight:700, padding:"6px 14px", borderRadius:6 }}>✓ {record.type} Approved</span>
            : <button className="bp" style={{ fontSize:11 }} onClick={onApprove}>✓ Approve {record.type}</button>
          }
        </div>
      </div>
    </div>
  );
}

/* ── Micro-components ─────────────────────────────────── */
function LinkifiedBody({ text, isDraft }) {
  // Match common FSM reference patterns: JOB-, QT-, INV-, PPM-, PO-
  const parts = text.split(/((?:JOB|QT|INV|PPM|PO)-[\w-]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^(JOB|QT|INV|PPM|PO)-/.test(part)
          ? <a key={i} href="#" onClick={e=>e.preventDefault()}
              style={{ color:C.tertiary, fontWeight:700, textDecoration:"none", borderBottom:`1.5px solid ${C.tertiary}`, paddingBottom:1 }}
              onMouseEnter={e=>e.target.style.color="#004999"}
              onMouseLeave={e=>e.target.style.color=C.tertiary}>
              {isDraft ? <b>DRAFT</b> : part}
            </a>
          : part
      )}
    </>
  );
}
function ClassBadge({ c }) {
  const col = CLS_COLORS[c]||{ light:"#f3f4f6", text:"#374151" };
  return <span style={{ background:col.light, color:col.text, fontSize:9.5, fontWeight:700, padding:"1px 7px", borderRadius:7 }}>{c}</span>;
}
function StatusBadge({ s }) {
  const m = { approved:["#d1fae5","#065f46"], draft:["#FFF8E1","#92400e"], pending:["#EEF2F6","#64748b"], received:["#EEF2F6",C.neutral], sent:["#d1fae5","#065f46"] };
  const [bg,text] = m[s]||["#EEF2F6","#64748b"];
  return <span style={{ background:bg, color:text, fontSize:9.5, fontWeight:600, padding:"1px 7px", borderRadius:7, textTransform:"capitalize" }}>{s}</span>;
}
function DirBadge({ d, small }) {
  const inb = d==="Inbound";
  return <span style={{ background:inb?"#dbeafe":"#FFF8E1", color:inb?C.tertiary:"#92400e", fontSize:small?9:10, fontWeight:700, padding:"1px 6px", borderRadius:6 }}>{inb?"⬇ Inbound":"⬆ Outbound"}</span>;
}
