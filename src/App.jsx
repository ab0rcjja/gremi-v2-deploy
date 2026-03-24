import { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";

const SB_URL = "https://ojzqehgvmsftdztdtxrj.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qenFlaGd2bXNmdGR6dGR0eHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDA1OTUsImV4cCI6MjA4ODMxNjU5NX0.Oh99nXmVlPVaAOk1URvy0880x7-zwU3mmZYQWpzbuaw";
const AI_PROXY = `${SB_URL}/functions/v1/ai-proxy`;

const sbFetch = async (path, opts = {}) => {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json", "Prefer": opts.prefer ?? "return=representation", ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  const t = await res.text(); return t ? JSON.parse(t) : [];
};
const dbGet   = (t, q="")     => sbFetch(`${t}?${q}`,    { method:"GET", prefer:"" });
const dbPost  = (t, b)        => sbFetch(t,               { method:"POST", body:JSON.stringify(b) });
const dbPatch = (t, match, b) => sbFetch(`${t}?${match}`, { method:"PATCH", body:JSON.stringify(b) });
const dbDel   = (t, match)    => sbFetch(`${t}?${match}`, { method:"DELETE", prefer:"return=minimal", headers:{} });

const aiCall = async (system, userMsg, maxTok=1500) => {
  try {
    const res = await fetch(AI_PROXY, {
      method:"POST", headers:{"Content-Type":"application/json","Authorization":`Bearer ${SB_KEY}`},
      body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:maxTok,system,messages:[{role:"user",content:userMsg}]}),
    });
    const d = await res.json(); return d.content?.[0]?.text || "";
  } catch(e) { return ""; }
};

const hqToDb  = ({id,isHQ,_type,...h}) => ({
  company:h.company, industry:h.industry, notes:h.notes||"", address:h.address||"", website:h.website||"",
  central_contact:h.centralContact||"", central_role:h.centralRole||"",
  central_phone:h.centralPhone||"", central_email:h.centralEmail||"",
  annual_turnover:h.annualTurnover||"", employees:h.employees||"",
  seasonality:h.seasonality||"", lead_source:h.leadSource||"", intelligence:h.intelligence||"",
  pre_call_checklist:JSON.stringify(h.preCallChecklist||{}),
});
const hqFromDb = (r) => ({
  id:r.id, isHQ:true, company:r.company||"", industry:r.industry||"",
  centralContact:r.central_contact||"", centralRole:r.central_role||"",
  centralPhone:r.central_phone||"", centralEmail:r.central_email||"",
  address:r.address||"", website:r.website||"", notes:r.notes||"",
  annualTurnover:r.annual_turnover||"", employees:r.employees||"",
  seasonality:r.seasonality||"", leadSource:r.lead_source||"", intelligence:r.intelligence||"",
  preCallChecklist:typeof r.pre_call_checklist==="string"?JSON.parse(r.pre_call_checklist||"{}"):r.pre_call_checklist||{},
});
const locToDb = ({id,isHQ,_type,...l}) => ({
  parent_id:l.parentId||null, company:l.company||"", location:l.location||"",
  address:l.address||"", contact:l.contact||"", role:l.role||"",
  phone:l.phone||"", email:l.email||"", county:l.county||"",
  industry:l.industry||"", employees:l.employees||"", stage:l.stage||"New",
  temp:l.temp||"❄️ Cold", workers:l.workers||"", worker_type:l.workerType||"",
  last_contact:l.lastContact||"", source:l.source||"", service:l.service||"",
  company_name:l.companyName||"", sales_id:l.salesId||null, notes:l.notes||"",
  activities:JSON.stringify(l.activities||[]),
  spin:JSON.stringify({...l.spin,phase:l.spin?.phase||"pre"}||{s:"",p:"",i:"",n:"",painSummary:"",phase:"pre"}),
  decision_process:l.decisionProcess||"", champion:l.champion||"",
  economic_buyer:l.economicBuyer||"", decision_criteria:l.decisionCriteria||"",
  current_supplier:l.currentSupplier||"",
  pain_score:l.painScore||null, next_step:l.nextStep||"", next_step_date:l.nextStepDate||"",
  won_date:l.wonDate||null, start_date:l.startDate||null, lost_date:l.lostDate||null,
  lost_lesson:l.lostLesson||"", lost_description:l.lostDescription||"", won_notes:l.wonNotes||"",
  lost_reason:l.lostReason||"",
  spin_real:JSON.stringify(l.spinReal||{}),
});
const locFromDb = (r) => ({
  id:r.id, isHQ:false, parentId:r.parent_id||null, company:r.company||"",
  location:r.location||"", address:r.address||"", contact:r.contact||"",
  role:r.role||"", phone:r.phone||"", email:r.email||"", county:r.county||"",
  industry:r.industry||"", employees:r.employees||"", stage:r.stage||"New",
  temp:r.temp||"❄️ Cold", workers:r.workers||"", workerType:r.worker_type||"",
  lastContact:r.last_contact||"", source:r.source||"", service:r.service||"",
  companyName:r.company_name||"", salesId:r.sales_id||null, notes:r.notes||"",
  activities:typeof r.activities==="string"?JSON.parse(r.activities||"[]"):r.activities||[],
  spin:typeof r.spin==="string"?JSON.parse(r.spin||"{}"):r.spin||{s:"",p:"",i:"",n:"",painSummary:""},
  decisionProcess:r.decision_process||"", champion:r.champion||"",
  economicBuyer:r.economic_buyer||"", decisionCriteria:r.decision_criteria||"",
  currentSupplier:r.current_supplier||"",
  lostReason:r.lost_reason||"",
  painScore:r.pain_score||null, nextStep:r.next_step||"", nextStepDate:r.next_step_date||"",
  wonDate:r.won_date||"", startDate:r.start_date||"", lostDate:r.lost_date||"",
  lostLesson:r.lost_lesson||"", lostDescription:r.lost_description||"", wonNotes:r.won_notes||"",
  spinReal:typeof r.spin_real==="string"?JSON.parse(r.spin_real||"{}"):r.spin_real||{},
});

const THEME_GROUPS = {
  "Dark Classic":["navy","graphite","obsidian","steel","slate"],
  "Dark Accent":["espresso","midnight","emerald"],
  "Light":["corporate","ivory","nordic","sand"],
};
const THEMES = {
  navy:{name:"Navy",bg0:"#060d18",bg1:"#0b1525",bg2:"#101e30",bg3:"#152540",bg4:"#1a2d4a",border:"#1e3554",border2:"#2a4a6e",txt:"#dce8f8",txt2:"#7a9fc4",txt3:"#435e7a",blue:"#2f7fd4",blue2:"#5299e8",indigo:"#5b5fef",teal:"#0fa896",green:"#0ea572",amber:"#e8960a",orange:"#f07020",red:"#e03c3c",purple:"#9b7cf8",pink:"#e86ca0"},
  graphite:{name:"Graphite",bg0:"#101014",bg1:"#18181c",bg2:"#212126",bg3:"#2a2a30",bg4:"#34343c",border:"#3c3c44",border2:"#52525e",txt:"#ececf0",txt2:"#9898a8",txt3:"#5c5c6e",blue:"#5088e0",blue2:"#6ca0f0",indigo:"#6e6ef0",teal:"#18b8a0",green:"#20c070",amber:"#e8a020",orange:"#e87838",red:"#e84848",purple:"#a080f8",pink:"#e870a0"},
  obsidian:{name:"Obsidian",bg0:"#0a0a0a",bg1:"#111111",bg2:"#191919",bg3:"#222222",bg4:"#2b2b2b",border:"#333333",border2:"#444444",txt:"#f0f0f0",txt2:"#a0a0a0",txt3:"#606060",blue:"#3b9af5",blue2:"#5cb0ff",indigo:"#7070ff",teal:"#00d4aa",green:"#00cc66",amber:"#ffaa00",orange:"#ff7733",red:"#ff4444",purple:"#b088ff",pink:"#ff6699"},
  espresso:{name:"Espresso",bg0:"#0e0b08",bg1:"#171210",bg2:"#201a16",bg3:"#2a2220",bg4:"#342c28",border:"#3e3430",border2:"#544840",txt:"#f0e8e0",txt2:"#b8a090",txt3:"#6e5e50",blue:"#4890d0",blue2:"#60a8e8",indigo:"#7068e0",teal:"#18b090",green:"#20a868",amber:"#d89818",orange:"#d87030",red:"#d84040",purple:"#9878d8",pink:"#d06888"},
  midnight:{name:"Midnight Blue",bg0:"#080810",bg1:"#0e0e1a",bg2:"#151524",bg3:"#1c1c30",bg4:"#24243c",border:"#2e2e4a",border2:"#404060",txt:"#e0e0f8",txt2:"#8888b8",txt3:"#505078",blue:"#4488e0",blue2:"#60a0f8",indigo:"#6060f0",teal:"#10c0a0",green:"#18b870",amber:"#e0a020",orange:"#e07830",red:"#e04848",purple:"#9070f0",pink:"#e060a0"},
  corporate:{name:"Corporate Light",bg0:"#e4e8ee",bg1:"#edf0f5",bg2:"#ffffff",bg3:"#f6f8fb",bg4:"#e8ecf2",border:"#cdd4de",border2:"#b0bac8",txt:"#1a2030",txt2:"#4a5670",txt3:"#8090a8",blue:"#2060c0",blue2:"#3078e0",indigo:"#4840c8",teal:"#0e8880",green:"#0e8850",amber:"#c88810",orange:"#d06818",red:"#cc2828",purple:"#6838b8",pink:"#c82868"},
  ivory:{name:"Executive Ivory",bg0:"#e2ddd6",bg1:"#f0ece6",bg2:"#faf8f5",bg3:"#f5f2ee",bg4:"#eae6e0",border:"#d0cac0",border2:"#b8b0a4",txt:"#28201a",txt2:"#605040",txt3:"#908070",blue:"#2860a8",blue2:"#3878c8",indigo:"#4840b0",teal:"#108878",green:"#18804a",amber:"#b87808",orange:"#c06018",red:"#b82828",purple:"#6030a8",pink:"#b02058"},
  steel:{name:"Steel Blue",bg0:"#0c1018",bg1:"#121822",bg2:"#1a222e",bg3:"#222c3a",bg4:"#2a3648",border:"#344058",border2:"#445878",txt:"#d8e4f0",txt2:"#8098b8",txt3:"#506880",blue:"#3888d8",blue2:"#50a0f0",indigo:"#5868e8",teal:"#10b8a0",green:"#10b070",amber:"#e09818",orange:"#e07028",red:"#e04040",purple:"#9078f0",pink:"#e06898"},
  slate:{name:"Slate",bg0:"#0f1318",bg1:"#161b22",bg2:"#1e242c",bg3:"#262e38",bg4:"#303a46",border:"#38424e",border2:"#4a5668",txt:"#e0e6ee",txt2:"#8898ac",txt3:"#566478",blue:"#4090d8",blue2:"#58a8f0",indigo:"#6068e8",teal:"#14b8a0",green:"#18b070",amber:"#e0a018",orange:"#e07828",red:"#e04444",purple:"#9478f0",pink:"#e06898"},
  nordic:{name:"Nordic Frost",bg0:"#e8edf2",bg1:"#f0f4f8",bg2:"#fafbfd",bg3:"#f4f6f9",bg4:"#e6ecf2",border:"#cad4e0",border2:"#aab8ca",txt:"#1a2840",txt2:"#486088",txt3:"#7890b0",blue:"#2870c8",blue2:"#3888e0",indigo:"#4848d0",teal:"#0e9088",green:"#0e8858",amber:"#c08808",orange:"#d06818",red:"#cc2828",purple:"#6838c0",pink:"#c02868"},
  emerald:{name:"Emerald Dark",bg0:"#060e0c",bg1:"#0a1814",bg2:"#10221c",bg3:"#162c26",bg4:"#1c3830",border:"#244838",border2:"#346050",txt:"#d8f0e8",txt2:"#78b8a0",txt3:"#488068",blue:"#3898d0",blue2:"#50b0e8",indigo:"#5878e8",teal:"#10d0a8",green:"#18c878",amber:"#d8a018",orange:"#d87828",red:"#d84848",purple:"#8878e8",pink:"#d86890"},
  sand:{name:"Sand",bg0:"#e0d8ce",bg1:"#ece6dc",bg2:"#f8f4ee",bg3:"#f2ede6",bg4:"#e6e0d6",border:"#cec4b6",border2:"#b0a694",txt:"#2a221a",txt2:"#665848",txt3:"#9a8a78",blue:"#2c6cb0",blue2:"#3c84cc",indigo:"#4c44b8",teal:"#108880",green:"#148850",amber:"#b87808",orange:"#c06018",red:"#c03030",purple:"#6838b8",pink:"#b82860"},
};
let C = THEMES.navy;

const STAGES    = ["New","Contacted","Interested","Meeting Scheduled","Meeting Done","Proposal Sent","Negotiation","Closed Won","Closed Lost","No Answer"];
const TEMPS     = ["🔥 Hot","🟡 Warm","❄️ Cold"];
const SOURCES   = ["PL Client Referral","RO Client Referral","PL Sales Team","Cold Call","Cold Email","LinkedIn Outreach","Industry Event","Website Inquiry","Job Portal (eJobs/OLX)","ANOFM Database","Partner Agency","Personal Network","Inbound Request","Other"];
const INDUSTRIES= ["Auto Parts","Textile","Food Production","Metal Fabrication","Electronics","Logistics","Construction","Pharma","Retail","Agriculture","Other"];
const COUNTIES  = ["Alba","Arad","Argeș","Bacău","Bihor","Bistrița-Năsăud","Botoșani","Brăila","Brașov","București","Buzău","Călărași","Caraș-Severin","Cluj","Constanța","Covasna","Dâmbovița","Dolj","Galați","Giurgiu","Gorj","Harghita","Hunedoara","Ialomița","Iași","Ilfov","Maramureș","Mehedinți","Mureș","Neamț","Olt","Prahova","Sălaj","Satu Mare","Sibiu","Suceava","Teleorman","Timiș","Tulcea","Vaslui","Vâlcea","Vrancea"];
const WORKER_TYPES = ["UA Ukrainian","Asian","Latin American","African","MD Moldovan","UA+Asian Mix","Other"];
const LEAD_SOURCES = ["LinkedIn","ANOFM","Cold Call","Own Research","Client Referral","Polish Team","Industry Event","Inbound","Partner","Other"];
const DEF_SERVICES = ["Outsourcing","Leasing","Permanent Recruitment"];
const DEF_ENTITIES = ["Gremi Personal SRL","Antforce SRL"];

const getSC = () => ({
  "New":C.txt3,"Contacted":C.blue,"Interested":C.indigo,
  "Meeting Scheduled":C.amber,"Meeting Done":C.orange,"Proposal Sent":C.teal,
  "Negotiation":C.pink,"Closed Won":C.green,"Closed Lost":C.red,"No Answer":C.txt3,
});

// ─── HEALTH SCORE ────────────────────────────────────────────────
function calcHealth(loc) {
  if(["Closed Won","Closed Lost"].includes(loc.stage)) return null;
  let score = 100;
  const today = new Date();
  const lastC = loc.lastContact ? Math.ceil((today - new Date(loc.lastContact))/86400000) : 999;
  const stageDate = loc.activities?.length
    ? Math.ceil((today - new Date(loc.activities[0].date))/86400000)
    : 30;
  const sp = loc.spin||{};
  const spinCount = [sp.s,sp.p,sp.i,sp.n].filter(Boolean).length;

  if(lastC > 14) score -= 30;
  else if(lastC > 7) score -= 15;
  if(!loc.nextStep || !loc.nextStepDate) score -= 25;
  else {
    const nextD = new Date(loc.nextStepDate);
    if(nextD < today) score -= 20;
  }
  if(spinCount === 0) score -= 20;
  else if(spinCount < 2) score -= 10;
  if(!loc.painScore) score -= 10;
  else if(loc.painScore < 3) score -= 5;
  if((loc.activities||[]).length === 0) score -= 15;

  score = Math.max(0, Math.min(100, score));
  if(score >= 70) return {score, color:"green", label:"Healthy"};
  if(score >= 40) return {score, color:"amber", label:"At Risk"};
  return {score, color:"red", label:"Critical"};
}

function HealthDot({loc, size=8}) {
  const h = calcHealth(loc);
  if(!h) return null;
  const c = C[h.color]||C.txt3;
  return (
    <div title={`Health: ${h.label} (${h.score})`}
      style={{width:size,height:size,borderRadius:"50%",background:c,flexShrink:0,
        boxShadow:h.color==="red"?`0 0 4px ${c}`:h.color==="green"?`0 0 4px ${c}`:undefined}} />
  );
}

function SpinDots({spin}) {
  const sp = spin||{};
  return (
    <div style={{display:"flex",gap:2,alignItems:"center"}}>
      {["s","p","i","n"].map(k=>(
        <div key={k} style={{width:5,height:5,borderRadius:1,background:sp[k]?C.blue:C.border2}}
          title={k.toUpperCase()+" — "+(sp[k]?"filled":"empty")}/>
      ))}
    </div>
  );
}

function DaysAgo({date, warn=7, danger=14}) {
  if(!date) return <span style={{fontSize:10,color:C.txt3}}>—</span>;
  const days = Math.ceil((new Date()-new Date(date))/86400000);
  const c = days > danger ? C.red : days > warn ? C.amber : C.txt3;
  const txt = days===0?"today":days===1?"1d ago":`${days}d ago`;
  return <span style={{fontSize:10,color:c,fontWeight:days>danger?600:400}}>{days>danger?"⚠ ":""}{txt}</span>;
}

function DaysInStage({loc}) {
  const acts = loc.activities||[];
  let stageDate = null;
  for(const a of acts) {
    if(a.note?.includes("Stage →") || a.note?.includes("stage →")) { stageDate = a.date; break; }
  }
  if(!stageDate && acts.length > 0) stageDate = acts[acts.length-1]?.date;
  if(!stageDate) return null;
  const days = Math.ceil((new Date()-new Date(stageDate))/86400000);
  if(days < 2) return null;
  const c = days > 14 ? C.red : days > 7 ? C.amber : C.txt3;
  return <span style={{fontSize:10,color:c,fontWeight:days>14?600:400}}>{days}d in stage</span>;
}


// ─── HELPERS ─────────────────────────────────────────────────────
const fmtDate  = d => { if(!d) return "—"; try { return new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short"}); } catch(e){ return "—"; }};
const isOD     = (d,s) => { if(!d||s==="Closed Won"||s==="Closed Lost") return false; try { return new Date(d)<new Date(); } catch(e){ return false; }};
const daysLeft = d => { if(!d) return null; try { return Math.ceil((new Date(d)-new Date())/86400000); } catch(e){ return null; }};
const mapsUrl  = a => a ? "https://www.google.com/maps/search/"+encodeURIComponent(a) : null;
const webUrl   = w => { if(!w) return null; return w.startsWith("http")?w:"https://"+w; };

// ─── CSS ─────────────────────────────────────────────────────────
const getCSS = () => `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:${C.bg1};color:${C.txt};direction:ltr;}
  ::-webkit-scrollbar{width:8px;height:8px;}
  ::-webkit-scrollbar-track{background:${C.bg0};}
  ::-webkit-scrollbar-thumb{background:${C.border2};border-radius:4px;}
  input,select,textarea,button{font-family:'Inter',sans-serif;}
  .fi{width:100%;background:${C.bg4};border:1.5px solid ${C.border};color:${C.txt};padding:10px 12px;font-size:13px;outline:none;border-radius:8px;transition:border 0.15s;direction:ltr;text-align:left;}
  .fi:focus{border-color:${C.blue};}
  .fi::placeholder{color:${C.txt3};}
  select.fi{appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%237a9fc4' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:28px;}
  .btn{border:none;cursor:pointer;font-family:'Inter',sans-serif;font-weight:600;transition:all 0.15s;}
  .btn:active{transform:scale(0.97);}
  .card{background:${C.bg2};border:1px solid ${C.border};border-radius:12px;transition:all 0.15s;}
  .card:hover{border-color:${C.border2};background:${C.bg3};}
  .pill{display:inline-flex;align-items:center;padding:2px 7px;border-radius:20px;font-size:10px;font-weight:600;}
  @keyframes pulse{0%,80%,100%{opacity:0.2}40%{opacity:1}}
  @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideDown{from{opacity:0;max-height:0}to{opacity:1;max-height:600px}}
  .anim-in{animation:fadeIn 0.2s ease-out forwards;}
  .tab{flex:1;padding:11px 4px;font-size:10px;font-weight:600;letter-spacing:0.07em;border:none;cursor:pointer;transition:all 0.15s;font-family:'Inter',sans-serif;border-bottom:2px solid transparent;white-space:nowrap;}
  .modal{position:fixed;inset:0;z-index:100;display:flex;flex-direction:column;background:${C.bg1};}
  .mh{background:${C.bg0};padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;border-bottom:1px solid ${C.border};}
  .ms{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:12px;}
  .mf{padding:14px 16px;border-top:1px solid ${C.border};background:${C.bg0};flex-shrink:0;}
  .lbl{font-size:9px;color:${C.txt3};letter-spacing:0.12em;font-weight:700;margin-bottom:4px;display:block;text-transform:uppercase;}
  .kv{background:${C.bg4};border:1px solid ${C.border};border-radius:8px;padding:9px 11px;}
  .xb{background:transparent;border:none;cursor:pointer;color:${C.txt2};font-size:22px;line-height:1;padding:4px 8px;border-radius:6px;}
  .chip{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:6px;font-size:11px;font-weight:500;cursor:pointer;border:1.5px solid;transition:all 0.15s;white-space:nowrap;}
  .row-hover{transition:background 0.1s;cursor:pointer;}
  .row-hover:hover{background:${C.bg3};}
  textarea.fi{min-height:40px;overflow:hidden;transition:height 0.1s;resize:none;display:block;}
  .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:200;display:flex;align-items:flex-end;justify-content:center;}
  .sheet{background:${C.bg1};border-radius:16px 16px 0 0;width:100%;max-height:90vh;display:flex;flex-direction:column;}
`;

// ─── DATA MODEL ──────────────────────────────────────────────────
const EMPTY_LOC = {id:null,isHQ:false,parentId:null,company:"",location:"",address:"",contact:"",role:"",phone:"",email:"",county:"",industry:"",employees:"",stage:"New",temp:"❄️ Cold",workers:"",workerType:"",nextAction:"",lastContact:"",source:"",service:"Outsourcing",companyName:"Gremi Personal SRL",salesId:null,notes:"",activities:[],spin:{s:"",p:"",i:"",n:"",painSummary:"",phase:"pre"},decisionProcess:"",economicBuyer:"",decisionCriteria:"",champion:"",painScore:null,nextStep:"",nextStepDate:"",lostReason:"",currentSupplier:""};
const EMPTY_HQ  = {id:null,isHQ:true,company:"",industry:"",centralContact:"",centralRole:"",centralPhone:"",centralEmail:"",address:"",website:"",notes:"",annualTurnover:"",employees:"",seasonality:"",leadSource:"",intelligence:"",preCallChecklist:{}};


// ─── PLAYBOOK DATA ───────────────────────────────────────────────
const INIT_PLAYBOOK = {
  stages:[
    {id:"new",quick:["Research on Termene.ro + eJobs BEFORE calling — how many open positions, how long?","Find a SPECIFIC person: HR Director, Plant Manager, or Ops Director — not just company","Write your pain hypothesis in SPIN-P before first contact","DO NOT move to Contacted without: name + role + contact method + SPIN-P hypothesis"],stage:"New",icon:"1",title:"Lead Qualification & Contact Discovery",target:"Complete research within 24h of lead entry. Do NOT move to Contacted without a specific person.",tasks:`PREREQUISITE: You have a company name. Your job now is to find the person who feels the pain.
(Challenger Sale: you cannot teach or tailor without knowing who you're talking to)

━━━ STEP 1: COMPANY RESEARCH ━━━

WHERE TO LOOK:
— Termene.ro / ListaFirme.ro: revenue trend, employee count, CUI, registered address, administrators
— Company website: products, clients, locations, management page ("Echipa" / "Management")
— eJobs / BestJobs / OLX Jobs: how many open positions? Which profiles? How long posted?
— LinkedIn company page: recent posts, hiring activity, company size changes
— Google News: "[Company name] Romania" — any expansions, new contracts, changes

WHAT YOU'RE LOOKING FOR:
— Is the company growing or shrinking? (Growing = more workers needed)
— How many vacancies, how long open? (Long-open = frustrated HR, high pain)
— Do they work with agencies already? (Check job postings — "via [agency name]")
— Who are their clients? (Gives you leverage: "I work with other suppliers to [their client]")

Write findings in HQ → INTELLIGENCE field. This is your pre-call brief.

━━━ STEP 2: FIND THE DECISION MAKER ━━━
(Challenger: find the Mobilizer — the person who challenges the status quo internally)

WHO TO FIND (priority order):
1. HR Director / HR Manager — feels compliance and recruitment pain daily
2. Plant Manager / Production Manager — feels capacity and reliability pain daily
3. Operations Director — feels total cost and scalability pain
4. Owner / GM — feels everything when it's bad enough

HOW TO FIND THEM:
— LinkedIn: search "[Company] Romania" → filter People → HR Director / Plant Manager
— Company website: "Echipa" page — names and roles often listed
— Google: "[Company name] director HR Romania" or "[Company] manager productie"
— Termene.ro: shows administrators (often the owner/GM)
— Cold call the switchboard: "With whom does your HR Director / Plant Manager discuss staffing suppliers?"

━━━ STEP 3: HYPOTHESIZE THE PAIN ━━━
(Rackham — SPIN Selling: top performers hypothesize the problem before first contact)

Write ONE sentence in SPIN-P before calling:
→ "They have 8 open operator positions on eJobs for 10 weeks — peak season in April. Pain: can't staff up in time."
→ "They expanded last year, headcount up 40% — likely overwhelmed HR with local recruitment."
If you cannot write this sentence: you need more research. Go back to Step 1.

━━━ STEP 4: CRM ENTRY CHECKLIST ━━━
Before moving to Contacted:
☐ HQ record created: company, industry, address, website
☐ HQ Intelligence filled with research findings
☐ Location record created with county and estimated workers needed
☐ Worker type hypothesis noted (UA / Asian / Mix)
☐ SPIN-P hypothesis written
☐ Specific person identified with name, role, and contact method

DO NOT move to "Contacted" until all 6 are checked.`},

    {id:"contacted",quick:["Day 1: Call + Email same day. Day 3: Call different time + LinkedIn. Day 7: Follow-up email","NEVER leave voicemail — give them no reason not to answer next call","Voss: 'Is it a bad idea altogether, or just bad timing?' invites honest reply","After 3 attempts no reply → No Answer. Never 4th/5th attempt same week"],stage:"Contacted",icon:"2",title:"First Contact Sequence",target:"3 contact attempts across 3 channels within 7 business days.",tasks:`SOURCE: Never Split the Difference (Voss) — multi-touch sequencing
PREREQUISITE: You have a specific person's NAME + ROLE + at least one contact method.

━━━ THE MULTI-TOUCH SEQUENCE ━━━
Why multi-channel: each person has a preferred channel. You don't know which one yet.
Never repeat the same channel twice in a row — vary timing and medium.

DAY 1 — FIRST TOUCH
Morning (9:00–11:00) or afternoon (14:00–16:00) — never lunchtime.
→ CALL the direct number. Use your Cold Call Opener (see Reference Cards).
→ SAME DAY: send introductory email (use First Contact Email template in Scripts).
Do not wait for the call to land before sending the email. Both go Day 1.

DAY 3 — SECOND TOUCH
→ CALL again at a DIFFERENT time than Day 1 (if you called morning, call afternoon now)
→ If no answer on call: send LinkedIn connection request with short note (see LinkedIn Outreach in Scripts)
→ Do NOT leave voicemails. They give the prospect a reason not to answer.

DAY 7 — THIRD TOUCH
→ Follow-up EMAIL — different angle than Day 1 (use Follow-up template in Scripts)
→ If LinkedIn accepted: send first LinkedIn message (see LinkedIn Outreach in Scripts)

━━━ VOSS: INVITE A SAFE 'NO' ━━━
If you reach them and they say "we're not interested":
→ "Is it a bad idea altogether, or just bad timing?"
A "no" is more useful than silence. It tells you where you stand.
(Voss: people who say "no" feel safe. People who say nothing are avoiding you.)

━━━ IF NO RESPONSE AFTER 3 ATTEMPTS ━━━
→ Move to "No Answer"
→ Set follow-up reminder for 30 days
→ Do NOT make a 4th, 5th, 6th attempt in the same week. You will be blocked.

━━━ WHAT "INTERESTED" LOOKS LIKE ━━━
They pick up and ask you a question.
They reply to your email with anything other than "not interested."
They accept your LinkedIn request AND reply to your message.
One positive signal = move to "Interested." Do not wait for enthusiasm.`},

    {id:"interested",quick:["Open with Commercial Insight (Challenger) — teach before you ask","SPIN order: Situation → Problem → Implication → Need-Payoff. Never skip steps","IMPLICATION questions are the engine — make the cost of inaction visible","Write their EXACT words in each SPIN field — do not paraphrase","Close for next step: specific date + specific action, not 'I'll send something'"],stage:"Interested",icon:"3",title:"Discovery & Meeting Preparation",target:"Meeting scheduled within 5 business days of prospect showing interest.",tasks:`SOURCE: SPIN Selling (Rackham) + The Challenger Sale (Dixon & Adamson)
This stage has one goal: understand their pain deeply enough to propose a specific solution.
Do NOT send a proposal yet. Do NOT pitch a solution yet. Discover first.

━━━ THE CHALLENGER COMMERCIAL INSIGHT ━━━
Before discovery, open with one insight they probably don't know:
→ "Companies in your industry that switched to outsourced foreign workers reduced their HR overhead by an average of 30%. I want to understand if that's relevant for you."
→ "The average cost of a direct hire for a production operator in Romania — including onboarding and first-year turnover — is 3–4x the monthly salary. Most companies don't calculate it that way."
This positions you as an expert, not a vendor. It makes them curious about their own situation.
(Challenger: Teach before you Ask. Insight before offer.)

━━━ SPIN DISCOVERY — ALL FOUR FIELDS REQUIRED ━━━
(Rackham: you cannot close without completing all four. Skipping any one = weak proposal.)

S — SITUATION (facts, use sparingly — don't interrogate)
→ "How many production workers do you have currently?"
→ "Are you working with any staffing agency now?"
→ "How many open positions are you carrying right now, and how long have they been open?"
Write exact answers in SPIN-S.

P — PROBLEM (expose dissatisfaction — this is where most salespeople stop)
→ "What's the main challenge when it comes to filling those roles?"
→ "When a line is understaffed — what does that look like operationally?"
→ "Have you had situations where a worker leaves in the first month?"
Write their exact words in SPIN-P. Do NOT paraphrase.

I — IMPLICATION (connect problem to consequences — this is the engine)
→ "If the line runs short by 10 workers — what does that cost per shift?"
→ "Has this affected any delivery commitments to your clients?"
→ "How much time does your HR team spend on recruitment vs. strategic work?"
→ "What happens to this situation in April when your peak starts?"
Write financial and operational impact in SPIN-I.
(Rackham: Implication Questions separate top performers from average performers)

N — NEED-PAYOFF (let them articulate the value — one question, then wait)
→ "If you had 25 reliable operators starting in 3 weeks — what would that change for you?"
Write their exact answer in SPIN-N. This becomes your proposal language.
(Rackham: Never say the value for them. Ask. Wait. They sell themselves.)

━━━ BOOKING THE MEETING ━━━
After discovery — propose a physical meeting at their site:
→ "Based on what you've told me — it would make sense for me to come to your plant. I want to see the setup properly before proposing something specific. Would [day] or [day] work?"
Physical meeting = stronger commitment. Ask for it directly.

━━━ MINIMUM TO MOVE FORWARD ━━━
Before moving to Meeting Scheduled:
☐ All 4 SPIN fields filled with real answers (not hypotheses)
☐ Pain Score ≥ 3
☐ Meeting date and time confirmed in writing
☐ Contact person confirmed (name, role, phone)`},

    {id:"meeting",quick:["Confirm 24h before — unconfirmed meetings cancel 3x more often","Prepare ONE Commercial Insight specific to their industry + size","Structure: Rapport → Teach → Tailor → Present → Pain Summary → Next Step","Get 'That's right' (Voss) before any close attempt — not 'you're right'","Leave immediately after commitment — do not linger"],stage:"Meeting Scheduled",icon:"4",title:"Meeting Execution",target:"Zero no-shows. Always confirm 24h before. Leave with a specific next step committed.",tasks:`SOURCE: The Challenger Sale (Dixon & Adamson) — Teach-Tailor-Take Control
PREREQUISITE: Discovery Call done, SPIN filled, Commercial Insight prepared.
This is NOT a discovery call. You have already done discovery. This is a presentation and advance.

━━━ 24H BEFORE — CONFIRMATION ━━━
Send confirmation email (use Meeting Confirmation template in Scripts).
Subject: "Confirmare intalnire maine — [ORA] — Walery / Gremi Personal"
Include: time, location, proposed agenda (30 min), your phone number.
If no reply by evening: call to confirm. A meeting without confirmation is a coin flip.

━━━ PREPARATION — day before ━━━
(Challenger: top performers prepare a specific Commercial Insight for this client's industry and size)

Prepare:
— ONE Commercial Insight: a fact or reframe specific to their industry + size
— 3 Implication Questions based on their SPIN-P (go deeper than Discovery Call)
— Your specific proposal: workers count, profile, entity, timeline, rate range
— One case study from same industry or same county (real numbers)

Re-read SPIN-P from CRM. Their exact words = your opening.

━━━ MEETING STRUCTURE — 30–40 MINUTES ━━━

[0–3 min] ENTRY — rapport, NOT pitch
Compliment something specific: their facility, a news item about the company, their LinkedIn post.
DO NOT start with "Let me tell you about Gremi Personal."

[3–6 min] SET THE AGENDA
"I'd like to spend about 30 minutes. I want to share a few observations about staffing in your industry — then go deeper on your situation — and if it makes sense, we'll talk about what we could do together. Works for you?"
(Challenger: setting the agenda signals professionalism and gives you control)

[6–12 min] TEACH — Commercial Insight
Deliver your prepared insight. Specific to their industry and size.
Show data. Challenge an assumption they hold.
DO NOT present your solution yet. Insight comes first.

[12–22 min] TAILOR — go deeper on SPIN
Ask prepared Implication questions. Verify and deepen what you learned in Discovery Call.
→ "You mentioned you were short [X] workers last peak. What did that cost operationally?"
→ "What does April look like this year — are you expecting higher demand?"
Listen. Take notes. Update SPIN.

[22–30 min] PRESENT — specific solution
Only now present.
"Based on everything you've told me: [X] UA operators, outsourcing via Gremi Personal SRL, delivery by [date]. All-inclusive rate in the range of [X–Y] RON per worker per month."

[30–33 min] PAIN SUMMARY — verify alignment (Voss: get "That's right")
"Let me confirm I understood correctly. You need [X] operators by [date], your current setup can't deliver that, and each week of delay costs roughly [Z RON]. Is that right?"
Wait for "That's right." That's your green light to close for next step.

[33–36 min] NEXT STEP — specific and committed
Never: "I'll send you something."
Always: "I'll prepare the full proposal and send it by [date]. Can we do 20 minutes on [day] at [time] to walk through it together?"
Get YES with a date. Confirm email address.

[36 min] EXIT
Leave immediately after the commitment. Do not linger.

━━━ AFTER THE MEETING — same day ━━━
— Update SPIN-S, P, I, N with real answers from the meeting
— Set Next Step date in CRM
— Log Activity entry with key quotes
— Send thank-you email with summary of what you heard (use Post-Meeting template)`},

    {id:"done",quick:["Send proposal within 24h — include Pain Summary using THEIR exact words","Section 2 = Economic Value Calculation (Nagle) — show cost of their alternative BEFORE price","NEVER send without a scheduled follow-up call — proposals without next steps die","UA = 2-4 weeks delivery. Asian = 4-6 MONTHS. State this clearly in proposal"],stage:"Meeting Done",icon:"5",title:"Proposal Preparation & Delivery",target:"Proposal sent within 24h of meeting. Follow-up call booked before sending.",tasks:`SOURCE: The Strategy and Tactics of Pricing (Nagle) — Economic Value to Customer
RULE: Never send a proposal without a scheduled follow-up call. A proposal without a next step is a document that sits in someone's inbox.

━━━ IMMEDIATELY AFTER THE MEETING ━━━
Before you write the proposal:
— Update all SPIN fields with real answers from the meeting
— Set Next Step date
— Log Activity entry
— Send thank-you email same day (see Post-Meeting template in Scripts)
  → Summary of what you heard (their words, not yours)
  → Confirm what you agreed to prepare
  → Confirm the follow-up call date and time

━━━ PROPOSAL STRUCTURE (Nagle: EVC framework) ━━━

SECTION 1 — PAIN SUMMARY (their words, not yours)
Mirror back exactly what they told you in SPIN-P and SPIN-I.
"Based on our conversation: your Cluj location needs 15 operators for April peak. You have posted these roles for 10 weeks without success. Each week of delay costs approximately [X RON] in overtime and gaps."
Effect: they read this and think "he understood me." Trust increases before they see the price.

SECTION 2 — ECONOMIC VALUE CALCULATION (required)
Show the full cost of their alternative, not just your price.
Build this comparison:
— Direct hire: recruitment + onboarding + first-year turnover × salary
— HR admin hours: [Y hours/month] × internal HR cost
— Overtime during vacancy periods: [Z hours × rate]
— ITM compliance risk exposure
— Management time spent on staffing
Total cost of NOT using us = [X RON/month for their workers]
Our all-inclusive rate = [Y RON/month]
Gap = their value gained

SECTION 3 — SOLUTION (specific)
Not "foreign workers." Specific:
— [X] operators, [UA/Asian] profile
— Start date: [DATE] (check realistic timeline: UA = 2–4 weeks)
— Legal entity: Gremi Personal SRL or Antforce SRL (and why this one)
— Included: permits, ITM documentation, coordinator, replacement guarantee

SECTION 4 — PROCESS
Signing → IGI → selection → onboarding → Day 1 coordinator on site

SECTION 5 — PROOF
One case study from same industry or county. Real numbers only.

SECTION 6 — NEXT STEP
A specific call booked, not "call me if you have questions."
→ "I'll walk you through this on [day] at [time]. I've already blocked 20 minutes."

━━━ WHAT TO AVOID IN A PROPOSAL ━━━
— Company history paragraphs (they don't care)
— Long service lists (irrelevant to their situation)
— Generic guarantees ("we guarantee quality")
— Price before value calculation
— Sending without a booked follow-up`},

    {id:"proposal",quick:["Day 3: Call — walk through proposal together. This is where deals close","Day 7: Value email — new insight for their industry, NOT 'just checking in'","Day 14: Breakup message — Voss: permission to say no often triggers response","'We need more time' = something unresolved. Ask: what specifically?"],stage:"Proposal Sent",icon:"6",title:"Follow-up Sequence",target:"Decision within 14 days. After 14 days without response: close or drop.",tasks:`SOURCE: Never Split the Difference (Voss) + The Challenger Sale (Dixon & Adamson)
RULE: The proposal is not the close. The follow-up call IS where deals close.
Most deals are won or lost in the 72 hours after the proposal is sent.

━━━ THE FOLLOW-UP SEQUENCE ━━━

DAY OF SENDING — confirm receipt
Send proposal. Within 2 hours: WhatsApp or SMS.
→ "Am trimis propunerea pe email. Confirmati ca ati primit-o?"
Simple. Fast. Starts a conversation thread.

DAY 3 — THE CRITICAL CALL
Call the decision maker directly. This is your most important action in this stage.
Objective: walk through the proposal together, surface objections, advance.
→ "Am trimis propunerea acum 3 zile — voiam sa o parcurgem impreuna. Aveti 20 de minute?"
If they haven't read it: "Nici o problema — o deschidem impreuna acum."
If they push back on price: go to Negotiation Techniques (Reference Cards).
(Challenger: take control — do not wait for them to call you)

DAY 7 — VALUE EMAIL
Do NOT send "just checking in." Bring something new.
Options:
→ A relevant case study from their industry with real numbers
→ A market insight: "Am vazut ca cererea de operatori in [judet] a crescut cu 20% in ultimele 6 saptamani."
→ An update: "Am disponibilitate pentru [X] muncitori din profilul dvs. in urmatoarele 3 saptamani."
(Challenger: every touch should teach something, even in follow-up)

DAY 14 — BREAKUP MESSAGE
If no response after 14 days of trying: send the breakup message (see Scripts).
Tone: respectful, not passive-aggressive. Leave the door open.
→ Subject: "Ultima incercare — [COMPANIA]"
→ "Am incercat sa va contactez de cateva ori fara succes. Inchid dosarul din sistemul nostru. Daca situatia se schimba — sunt disponibil."
(Voss: a clear "no" is better than a false "maybe." The breakup message often gets a response.)

━━━ WHAT TO DO IF THEY SAY "WE NEED MORE TIME" ━━━
→ "Of course. What specifically is giving you pause?"
→ Find the real objection. "More time" = something unresolved.
Options: budget not approved, another stakeholder involved, comparing with competitor.
Each has a specific response — see Objection Handler in Reference Cards.

━━━ WHEN TO MOVE TO NEGOTIATION ━━━
They engage but push back on price or terms → move to Negotiation stage.

━━━ WHEN TO CLOSE AS LOST OR NO ANSWER ━━━
After 14 days and breakup message with no response: No Answer.
After breakup message and they confirm they chose someone else: Closed Lost.
Fill in Lost Reason immediately. This data improves the whole team.`},

    {id:"negotiation",quick:["Label emotion FIRST before any logic: 'It seems like budget pressure is real right now'","Never defend price — ask: 'How am I supposed to make this work at that number?'","Every concession = something in return. Never give freely","Ackerman: moves decrease in size. Final number = precise non-round (5,840 not 5,800)",">5% discount / >50 workers / non-standard terms → escalate to Walery immediately"],stage:"Negotiation",icon:"7",title:"Terms Discussion & Closing",target:"Close or escalate within 10 days. Never negotiate against yourself.",tasks:`SOURCE: Never Split the Difference (Voss) + Thinking Strategically (Dixit & Nalebuff)
You are here because they want to buy but are pushing back on something.
That is a good position. Do not destroy it by making unilateral concessions.

━━━ BEFORE THE NEGOTIATION CALL ━━━
Know your walk-away number before you dial. Write it down.
Know what you can trade (volume commitment, contract length, payment terms).
Know your escalation trigger (>5% discount, >50 workers, non-standard terms → call Walery).

━━━ VOSS: TACTICAL EMPATHY FIRST ━━━
Whatever they push back on — label it before defending.
→ "It seems like the budget constraint is real right now."
→ "It sounds like you're comparing us against another quote."
→ "It looks like there's pressure internally to get a lower number."
They need to feel understood before they can agree to anything.
(Voss: you cannot persuade someone who feels misunderstood)

━━━ CALIBRATED QUESTIONS (not defenses) ━━━
When they push on price:
→ "How am I supposed to make this work at that number?"
→ "What would make this feel fair to both sides?"
→ "If we solved [specific concern] — would that change things?"
These invite them to solve the problem WITH you, not against you.

━━━ NEVER CONCEDE WITHOUT TRADING ━━━
Every concession = something in return.
→ "I can look at the rate — if we confirm volume and contract length."
→ "I can do a pilot — if we agree now: successful pilot = full contract signed immediately."
→ "I can extend payment terms — if you commit to a 6-month minimum."
A concession given freely signals that your price was wrong to begin with. (Nagle)

━━━ CLOSING TECHNIQUES (see Reference Cards for full detail) ━━━
Assumptive: "Cand va este mai convenabil sa incepem — inceputul sau mijlocul lunii?"
Summary: "Am convenit: [X workers], [rate], [start date]. Semnam?"
Trial: "Daca rezolvam [last concern] — sunteti pregatiti sa mergeti mai departe?"
Escalation: "Lasati-ma sa aduc directorul nostru — are mai multa flexibilitate pe termeni."

━━━ ESCALATION RULES — involve Walery NOW when: ━━━
— Discount > 5%
— Non-standard contract terms
— Order volume > 50 workers
— Client requests exclusivity
— Payment terms beyond 30 days
Escalation is not weakness. It is a strategic move that signals seriousness.`},

    {id:"won",quick:["Brief Operations within 24h — not 3 days, not 'when you get around to it'","Introduce dedicated coordinator to client by NAME and PHONE same day","UA = 2-4 weeks. Asian = MINIMUM 4-6 months. Never promise otherwise","Month 1 check-in: ask '1-10 satisfaction? What would make it 10?'","After month 1: ask for referral — most clients will, most salespeople never ask"],stage:"Closed Won",icon:"✓",title:"Handover & Account Development",target:"Operations briefed within 24h. First check-in call within 1 week of workers starting.",tasks:`SOURCE: High Output Management (Grove) — process discipline at handover
Congratulations. Now the real work begins. Most client relationships are won or lost in the first 30 days.

━━━ WITHIN 24 HOURS OF SIGNING ━━━
(Grove: the handover is a production process — it must be standardized)

— Update ALL CRM fields: workers count, rate, service, entity, start date, Won Date
— Brief Operations team: client specs, location address, shift pattern, special requirements
— Introduce the dedicated Coordinator to the client by name and phone number
— Send thank-you + next steps email to client contact
— Set first check-in call: 3 days after signing

━━━ TIMELINE — what you can promise ━━━
UA workers: 2–4 weeks from signing to first workers on site
Asian workers: 4–6 MONTHS minimum
NEVER promise Asian workers in less than 4 months. Doing so destroys the relationship permanently.

━━━ FIRST 30 DAYS — your responsibility ━━━
Week 1: Coordinator on site Day 1. Any issue resolved within 24 hours.
Week 2: Call with client contact — "How are the workers settling in?"
Month 1: Formal check-in — satisfaction, performance, any upcoming changes.
Ask directly: "On a scale of 1–10, how satisfied are you? What would make it a 10?"

━━━ ACCOUNT DEVELOPMENT — start Month 2 ━━━
Watch for upsell signals (see Account Development card in Reference Cards):
— "We're opening a new line" → new location deal
— "My colleague at [company] has the same problem" → referral → act immediately
— "Peak season is coming earlier" → volume increase

━━━ REFERRAL REQUEST — after Month 1 ━━━
"We're really proud of how this has gone. Do you know other companies — suppliers, partners — who might benefit from the same model?"
Most satisfied clients will refer. Most salespeople never ask.`},

    {id:"lost",quick:["Fill Lost Reason in CRM within 24h — zero value if not captured","Price lost = EVC not shown. Competitor won = showed up too late. No decision = pain too low","Set re-entry date: competitor clients = 6 months. Timing = next season","One sentence: what would you do differently next time?"],stage:"Closed Lost",icon:"✕",title:"Post-Mortem & Re-entry Plan",target:"Lost Reason filled within 24h. Re-entry date set. Every loss teaches something.",tasks:`SOURCE: High Output Management (Grove) — process failures as learning inputs
A lost deal is data. It has no value unless it is captured, analyzed, and used to improve the process.
(Grove: "The output of a post-mortem is a process change. Not regret.")

━━━ IMMEDIATELY AFTER LOSING — required ━━━
Fill in CRM within 24 hours:
— Lost Reason (required): Price / Competitor Won / No Budget / No Decision / Legal Concerns / Timing / Other
— Lost Description: what exactly happened, in your own words
— What to do differently: one specific thing you would change
— Lost Date
— SPIN fields updated with real information (not hypotheses)

If you do not fill these fields: the loss has zero value to the team.

━━━ LOST REASON ANALYSIS — what each reason means ━━━

PRICE → You did not show the Economic Value Calculation (Nagle) convincingly.
Fix: rehearse the EVC presentation. Make the cost of their alternative visible before price comes up.

COMPETITOR WON → You showed up in Stage 3 (client already shopping). You lost before the meeting.
Fix: build pipeline earlier. Show up in Stage 1 and 2. (Challenger: insights win before the RFP)

NO BUDGET → Wrong economic buyer. The person you sold to couldn't approve the spend.
Fix: identify and involve the Economic Buyer earlier. (Challenger: map the organization)

NO DECISION → Pain Score was too low, or urgency was not real.
Fix: Implication Questions not strong enough. Pain was not made visible. (Rackham: Implication Questions)

TIMING → You rushed. The client was not ready.
Fix: match your pace to their buying cycle. Do not push to close before the conditions are met.

━━━ RE-ENTRY PLAN ━━━
Lost to competitor → Check back in 6 months. Competitors fail. Be there when they do.
→ Set follow-up date in CRM. Send a value email in 6 months. Do not pitch — share an insight.

Lost due to timing → Set follow-up for next season peak.
→ "Am notat sa revin in [luna] — inainte de sezon. Va fi ok daca va contactez atunci?"

Lost due to price → Note their budget ceiling in Intelligence.
→ They may become a prospect again when their situation changes or your model evolves.

Lost due to legal concerns → This is a knowledge gap, not a real objection.
→ Prepare a one-page ITM/compliance FAQ. Send it as a follow-up. Their concern may dissolve.`},

    {id:"noanswer",quick:["Max 4 attempts, different channel each time, 3-4 days apart","NEVER leave voicemail. NEVER call 4 times in one week — you will be blocked","Attempt 4: breakup message — 'closing file, available if situation changes'","60-day soft reminder: company situations change. Your timing may have been wrong"],stage:"No Answer",icon:"—",title:"Re-engagement Protocol",target:"4 attempts across 4 channels before archiving. No more than one attempt per 3–4 days.",tasks:`SOURCE: Never Split the Difference (Voss) — silence is not rejection
"No Answer" does not mean "not interested." It means they are busy, distracted, or avoiding.
Your job: give them a frictionless way to re-engage — or to say no clearly.
(Voss: a clear "no" is more useful than silence. Invite it.)

━━━ THE 4-ATTEMPT PROTOCOL ━━━

ATTEMPT 1 — Day 1: Call, no voicemail
Call at your normal time. If no answer: hang up. No voicemail.
Log attempt in Activity.

ATTEMPT 2 — Day 3: Call + LinkedIn message
Call at a DIFFERENT time than Attempt 1 (if morning before, try afternoon now).
Same day: LinkedIn message (different angle from any previous contact).
Use the format: hook (specific observation) + one question. No pitch.

ATTEMPT 3 — Day 7: Call + Email
Call again. Leave if no answer.
Same day: follow-up email with a new angle — not a repeat of previous messages.
Bring a relevant insight or a short case study. Give them a reason to reply.

ATTEMPT 4 — Day 14: Final call + Breakup message
Last call.
If no answer: send the Breakup Message (see Scripts → Follow-up category).
Tone: respectful, professional, leaves the door open.
→ "Am incercat sa va contactez de cateva ori. Inchid dosarul din sistemul nostru. Daca situatia se schimba — sunt disponibil."

━━━ AFTER 4 ATTEMPTS WITH NO RESPONSE ━━━
→ Pain Score → 1
→ Keep in HQ / company record for future reference
→ Set soft follow-up reminder for 60 days: "Revisit — seasonal peak coming?"
→ Do NOT delete. Company situations change. Your timing may simply have been wrong.

━━━ VOSS: INVITE THE SAFE 'NO' ━━━
On Attempt 3 or 4, consider:
→ "Daca nu mai este relevant pentru dvs. — nici o problema, puteti spune direct."
Paradoxically, giving them permission to say no often gets a response.
People are uncomfortable ignoring — but comfortable declining.`},
  ],  extras:[
    {id:"discoveryCall",quick:["Open with Challenger reframe — teach before you ask, not pitch","SPIN order: S(facts) → P(pain) → I(cost of pain) → N(value of solving)","Implication questions: 'If line runs short — what does that cost per shift?'","ONE Need-Payoff question, then wait. Do not fill the silence","Voss: get 'That's right' before closing for next step"],stageGroup:"Interested",title:"Discovery Call Script (Phone)",color:"teal",text:`WHEN TO USE THIS
After first contact → prospect is 'Interested'. This is a 15–20 min PHONE call.
NOT the physical meeting. NOT a pitch. A diagnostic conversation.
Goal: understand their situation deeply, fill SPIN fields, book the next step.

━━━ CHALLENGER SALE: SET THE FRAME FIRST ━━━
Before asking questions, open with a reframe — teach them something they don't know.
→ "Most companies I talk to in [industry] think their staffing challenge is about finding workers. What we've found is the real cost is actually in the compliance and turnover management. I want to understand if that's true for you."
This positions you as an expert, not a vendor. It makes them curious.
(Dixon & Adamson — The Challenger Sale: Teach before you Ask)

━━━ SPIN DISCOVERY STRUCTURE ━━━
(Rackham — SPIN Selling: do not pitch until you've completed all four)

[0–3 min] SITUATION — establish facts, use sparingly
→ "How many production workers do you have currently?"
→ "Are you working with any staffing agency now?"
→ "How many open positions are you carrying right now?"
→ "How long have those roles been open?"
Write answers in SPIN-S. These are facts, not pain.

[3–8 min] PROBLEM — expose the dissatisfaction
→ "What's the main challenge when it comes to filling those roles?"
→ "When a line is understaffed — what does that look like operationally?"
→ "Have you had situations where a worker leaves in the first 2 weeks?"
Do NOT answer these. Ask and wait. Write exact words in SPIN-P.
(Rackham: Problem Questions are where most salespeople stop — that's the mistake)

[8–14 min] IMPLICATION — connect problem to consequences
This is the engine. Make the cost of inaction visible.
→ "If that line runs short by 10 workers — what does that cost per shift?"
→ "Has this affected any delivery commitments to your clients?"
→ "How much time does your HR team spend on this monthly?"
→ "What happens to that situation in April when your peak starts?"
Write the financial and operational impact in SPIN-I.
(Rackham: Implication Questions are what separates top performers from average ones)

[14–18 min] NEED-PAYOFF — let them articulate the value
Ask ONE question and wait for the full answer.
→ "If you had 25 reliable operators starting in 3 weeks — what would that change for you?"
Write their exact answer in SPIN-N. This becomes your proposal language.
(Rackham: The client sells themselves. Never say it for them.)

━━━ VOSS: HANDLE THE EMOTIONAL LAYER ━━━
Before closing for next step — label what you've heard:
→ "It sounds like this has been a recurring problem, not just a one-off."
→ "It seems like the agency you're using now isn't giving you the reliability you need."
Wait. Let them confirm. If they say "that's right" — you understand them.
(Voss — Never Split the Difference: "That's right" = real alignment. "You're right" = they want to end the call.)

━━━ CLOSE FOR NEXT STEP — be specific ━━━
Never: "I'll send you something and we'll see."
Always: specific date, specific action.
→ "Based on what you've told me — can we do 30 minutes next [day] at [time]? I'll prepare a specific proposal for [X workers] in [county]."
→ "Would it make sense for me to come to the plant — so I can understand the setup properly?"
Get a YES with a date. Or find out what's blocking.

AFTER THE CALL — update CRM same day:
— Fill S, P, I, N with their actual words
— Update Last Contact and Next Step + Date
— Activity Log: key quotes and commitments`},

    {id:"dm",quick:["Find MOBILIZER — person who challenges status quo internally","HR Director: compliance + ITM risk. Plant Manager: reliability + speed. Owner: cost + risk","Talker = friendly but can't decide. Blocker = has something to lose. Find around them","LinkedIn → Termene.ro → company website → cold call switchboard"],stageGroup:"New",title:"Decision Maker Mapping",color:"indigo",text:`DO NOT CONTACT RANDOMLY — map before you call.
(Challenger Sale: organizations have Mobilizers, Blockers, and Talkers. Most salespeople call the wrong person.)

━━━ THREE TYPES OF CONTACTS ━━━

MOBILIZER — who you want
Challenges the status quo internally. Can drive a decision through the organization.
Signs: asks hard questions, challenges your assumptions, engages seriously.
→ Build your relationship here. This person creates your Champion.

TALKER — waste of time
Friendly, gives you a lot of information, tells you "this looks interesting."
Never buys. Never has authority. Makes you feel progress is happening.
→ Politely extract information, then find the Mobilizer.

BLOCKER — manage carefully
Has something to lose if you win. Often the current supplier or someone whose process you'd disrupt.
→ Do not confront. Find who they report to. Build around them.

━━━ DECISION MAKER ROLES — what each person cares about ━━━
(Challenger Sale: Tailor your message to each stakeholder)

HR DIRECTOR / HR MANAGER
Pain: recruitment time, ITM compliance exposure, documentation, turnover
What they fear: a worker without proper papers = ITM fine on their watch
Your message: "We are the employer of record. If ITM shows up — they come to us, not to you."
Voss personality type: usually Analytical. Use data and process, not emotion.

PLANT MANAGER / PRODUCTION DIRECTOR
Pain: line capacity, schedule reliability, speed of replacement
What they fear: a line stopping because a worker didn't show up
Your message: "We have a replacement guarantee — if someone doesn't show, we fill within 72h."
Voss personality type: usually Assertive. Be direct, specific, respect their time.

OPERATIONS DIRECTOR / CFO
Pain: total cost of workforce, variable vs. fixed cost structure, compliance risk
What they care about: the all-in cost vs. direct hire with hidden costs
Your message: build the Economic Value to Customer calculation (Nagle)
— Direct hire cost: recruitment + turnover + HR admin + overtime + compliance
— Our cost: one all-inclusive rate per worker per month. No surprises.
Voss personality type: Analytical. Bring numbers.

OWNER / GENERAL MANAGER
Pain: business risk, strategic partnership, long-term reliability
What they fear: being dependent on one supplier who fails in peak season
Your message: "We work with [X] companies in [industry]. We have never missed a delivery commitment."
Voss personality type: Assertive. Get to the point. Show track record.

━━━ HOW TO FIND THE RIGHT PERSON ━━━
1. LinkedIn: search "[Company] + Romania" → filter by HR, Operations, Director
2. Company website: "Echipa" or "Management" page
3. Google: "[Company] director HR Romania"
4. Termene.ro → administrators → often the owner/GM
5. Cold call gatekeeper: "Am trimis un email dl-ului [NAME] referitor la personal operational. Puteti sa ma transferati?"

━━━ RULE: DO NOT MOVE TO CONTACTED UNTIL ━━━
You have: a SPECIFIC NAME + ROLE + CONTACT METHOD.
Company name alone = New stage. Person = Contacted stage.`},

    {id:"daily",quick:["15 outreach actions / 3 DM conversations / 1 next step booked — minimum floors not ceilings","Grove: manage LEADING indicators (calls, meetings booked), not lagging (deals closed)","Ratio: <1 meeting per 5 qualified calls = pitch or targeting broken","Friday: which deals haven't moved in 7 days? Action or drop"],stageGroup:"Always",title:"Daily Activity Standard",color:"amber",text:`SOURCE: High Output Management (Andy Grove) + Challenger Sale activity benchmarks

━━━ GROVE'S PRINCIPLE ━━━
"A manager's output = the output of their organization + the output of neighboring organizations under their influence."
For a salesperson: YOUR output = number of qualified next steps generated per week.
Everything else is input. Only closed deals and booked meetings are output.

━━━ LEADING vs. LAGGING INDICATORS ━━━
(Grove: manage leading indicators — they predict future output)

LAGGING (result — you can't change it):
— Closed Won deals
— Revenue placed
— Workers on site

LEADING (activity — you control it today):
— Calls made
— Decision makers reached
— Meetings booked
— Proposals sent with a confirmed follow-up call

Manage your leading indicators DAILY. Lagging indicators take care of themselves.

━━━ MINIMUM DAILY TARGETS ━━━
These are floors, not ceilings:
— 15 outreach actions (calls + emails + LinkedIn combined)
— 3 meaningful conversations with decision makers (not gatekeepers)
— 1 specific next step booked (meeting, call, or proposal with confirmed follow-up)

━━━ WEEKLY PIPELINE HEALTH CHECK ━━━
Every Friday — 15 minutes:
— How many leads moved forward this week?
— Which deals have not moved in 7+ days? → action or drop
— Am I building pipeline for next month, not just closing this month?
(Challenger Sale: top performers spend 40% of time on pipeline building, not just current deals)

━━━ THE GROVE RATIO ━━━
If you are not booking 1 meeting per 5 qualified calls → your pitch or targeting is broken.
If you are not converting 30%+ of first meetings to proposals → your discovery is broken.
Fix the ratio before adding volume.

━━━ WHAT NOT TO DO ━━━
— Spending 3 hours on CRM updates = input theater, not output
— "Warming up" leads with no next step booked = not sales activity
— Sending a proposal without a scheduled follow-up call = giving the deal away`},

    {id:"principles",quick:["Rackham: features kill complex deals. Ask until THEY articulate the need","Challenger: relationship builders underperform. Teach + Tailor + Take Control","Voss: Never split the difference. Tactical empathy before logic. Silence is a tool","Grove: output = booked next steps, not 'I called 30 people'","If it's not in CRM — it didn't happen"],stageGroup:"Always",title:"Core Selling Principles",color:"txt",text:`These are not rules. They are the output of decades of research on what actually works in complex B2B sales.

━━━ FROM SPIN SELLING (Rackham — 35,000 sales calls studied) ━━━

1. FEATURES AND BENEFITS KILL DEALS IN COMPLEX SALES
In small sales, talking about benefits works. In complex B2B: the more you pitch, the more objections you generate.
Instead: ask questions until the client articulates the need themselves.
The client's own words are more persuasive to them than yours.

2. THE IMPLICATION QUESTION IS THE MOST IMPORTANT SKILL
Most salespeople ask Situation and Problem questions. Only top performers systematically ask Implication questions.
"What happens to your production schedule when you're 10 workers short?"
That question is worth more than any brochure.

3. NEVER CLOSE BEFORE THE CLIENT FEELS THE PAIN
Closing before the pain is visible = pushing. Closing after the pain is visible = helping.
Pain Score < 3 → do not close. Keep discovering.

━━━ FROM THE CHALLENGER SALE (Dixon & Adamson) ━━━

4. RELATIONSHIP BUILDERS ARE THE WORST PERFORMERS IN DIFFICULT MARKETS
Counterintuitive but proven: salespeople who focus on relationship-building and avoiding tension underperform Challengers.
Challengers teach, tailor, and take control. They are comfortable with productive tension.

5. TEACH SOMETHING THEY DON'T KNOW — BEFORE YOU SELL
Your first job is to change how the client sees their own situation.
→ "Most production companies think their staffing cost is the hourly rate. The real cost is turnover, admin, and compliance. Here's what that actually looks like..."
(This is called a Commercial Insight. It should make them think, not just nod.)

6. TAILOR FOR EACH STAKEHOLDER
The same solution means different things to HR, Operations, and the GM.
HR wants compliance protection. Operations wants reliability. GM wants cost predictability.
Never give the same pitch to different roles.

━━━ FROM NEVER SPLIT THE DIFFERENCE (Voss) ━━━

7. NEVER SPLIT THE DIFFERENCE
Compromise leaves both parties dissatisfied. Instead: understand what they ACTUALLY want underneath their stated position.
"The rate is too high" → is it the monthly total? The structure? The commitment length? Find out.

8. TACTICAL EMPATHY BEFORE LOGIC
You cannot persuade someone who feels misunderstood. Label their emotion first.
"It sounds like you've been let down by agencies before."
Then they open up. Then you present logic.

9. SILENCE IS THE MOST UNDERUSED TOOL
After asking an important question: stop talking. Wait.
Most salespeople are afraid of silence and fill it with their own answers.
Let the client fill the silence. They always reveal more.

━━━ FROM HIGH OUTPUT MANAGEMENT (Grove) ━━━

10. YOUR JOB IS TO GENERATE OUTPUT, NOT ACTIVITY
"I called 30 people today" is activity. "I booked 3 meetings" is output.
Measure output. Manage the inputs that create output. Never confuse the two.

━━━ THE ONE RULE THAT OVERRIDES ALL OTHERS ━━━
If it is not in the CRM, it did not happen.
Every call, every meeting, every "they said they'll think about it."
Log it. Date it. Set a next step. Without this, you are not managing a pipeline — you are managing hope.`},

    {id:"objectionHandler",quick:["Label → Calibrated question → Respond. NEVER defend immediately","'Already have agency' → 'How well are they meeting your needs?' Then find the gap","'Too expensive' → Build EVC: show total cost of their alternative first","'Send email' → 'Before I do — two quick questions?' Then attach a call to the email","'Not right time' → 'What specifically isn't clear?' Find the real blocker"],stageGroup:"Negotiation",title:"Objection Handler",color:"red",text:`SOURCE: Never Split the Difference (Voss) + Challenger Sale (Dixon & Adamson)
Key principle: An objection is not a "no." It is a signal that they are still thinking — but something is blocking them. Your job is to find and remove that block.

━━━ THE VOSS FRAMEWORK FOR ANY OBJECTION ━━━

Step 1 — LABEL the emotion behind the objection
Step 2 — ASK a calibrated question to understand the real concern
Step 3 — PRESENT your response only after they feel understood

NEVER defend immediately. Immediate defense = escalation.

━━━ TOP OBJECTIONS WITH FULL SCRIPTS ━━━

OBJECTION 1: "WE ALREADY HAVE AN AGENCY"
Wrong response: "We're better than them." (unverifiable, confrontational)
Right approach:
→ Label: "It sounds like you have a system that's working — and I respect that."
→ Calibrated question: "How well is the current agency meeting your needs in terms of volume and reliability?"
→ Then wait. Let them talk. In 80% of cases, they'll reveal a gap.
→ If they say "it's fine": "What would need to change for you to consider a second supplier as backup?"
(Challenger: most clients use multiple agencies — position as complement, not replacement)

OBJECTION 2: "IT'S TOO EXPENSIVE / CHEAPER ELSEWHERE"
Wrong response: "Let me offer you a discount." (kills your margin and signals weakness)
Right approach:
→ Label: "It seems like the investment feels higher than what you expected."
→ Calibrated question: "What did their quote include exactly? Did it cover ITM documentation, housing coordination, replacement guarantee?"
→ Then: "Let me show you what happens to that number when you add what we include."
Build the Nagle Economic Value calculation:
— Recruitment cost saved: [X RON/hire × turnover rate]
— HR admin hours freed: [Y hours/month × internal cost]
— ITM compliance risk avoided: [fine exposure reduced to zero]
— Overtime eliminated: [Z hours × rate]
→ "When you add those together — our all-inclusive rate is actually cheaper. Here's the math."
(Nagle — Pricing: the client compares your price to alternatives, not to value. Your job is to reframe to value.)

OBJECTION 3: "FOREIGN WORKERS ARE TOO COMPLICATED LEGALLY"
Right approach:
→ Label: "It sounds like you're worried about the legal complexity — and rightly so."
→ Then: "That's exactly why our clients choose us instead of handling it themselves. We are the employer of record. Permits, ITM, contracts, housing registration — we manage 100% of it. You don't touch any of it."
→ Accusation audit (Voss): "You're probably thinking 'what if something goes wrong?' Fair. Here's what our contract says about that: [specific guarantee clause]."

OBJECTION 4: "NOT THE RIGHT SEASON"
Right approach:
→ "That's exactly why I'm calling now. Our clients who start the process in [month] get workers on site by [peak month]. The ones who start in [peak month] wait 6 more weeks."
→ Calibrated question: "When does your production peak start?"
→ Then show the timeline backward from their answer.
(Dixit & Nalebuff — Thinking Strategically: first-mover advantage in seasonal markets. The ones who commit early get the best workers.)

OBJECTION 5: "SEND IT BY EMAIL"
This is the most dangerous objection — it ends the conversation.
Right approach:
→ "Of course. Before I do — so I send something specific, not a generic brochure — can I ask two quick questions?"
→ Ask: volume needed + timeline
→ Then: "I'll prepare something specific for your situation and send it within [time]. Can we schedule 20 minutes to walk through it together? Otherwise a PDF just sits in your inbox."
Goal: get a scheduled follow-up call attached to the proposal.

OBJECTION 6: "WE NEED TO THINK ABOUT IT"
This is a soft "no" — or a sign something is unresolved.
Right approach:
→ "Of course. What specifically is giving you pause?"
→ If they say "nothing specific": "Is it the investment? The process? Or something about the profile of workers?"
→ If they still deflect: "Is this a bad idea altogether, or just bad timing?" (Voss: invite the safe 'no')
→ Getting a real "no" is better than a false "maybe" that disappears.`},

    {id:"firstMeetingAgenda",quick:["Prepare ONE Commercial Insight specific to their industry before walking in","0-6min: rapport + set agenda. 6-12min: Teach (insight). 12-22min: Tailor (SPIN deeper)","22-30min: Present. 30-33min: Pain summary — get 'That's right'. 33-36min: Next step","Never 'I'll send something' — book the next call before you leave","Leave immediately after commitment. Professional exit = professional impression"],stageGroup:"Meeting Scheduled",title:"First Meeting Agenda (On-Site)",color:"green",text:`SOURCE: The Challenger Sale (Dixon & Adamson) — Teach-Tailor-Take Control structure
This is the PHYSICAL on-site meeting. You have already done the Discovery Call. You are here to present and advance, not to discover from scratch.

━━━ PRE-MEETING PREPARATION (day before) ━━━
(Challenger Sale: top performers prepare a Commercial Insight specific to this client's industry and size)

Prepare ONE insight the client doesn't know:
→ "Companies in [their industry] with [their headcount] that switch to outsourcing reduce their HR overhead by an average of [X%]."
→ "The average cost of a direct hire in Romania in [their county] including onboarding and first-year turnover is [X RON]. Here's how that compares to our all-inclusive rate."
This insight should challenge a comfortable assumption they hold.

Also prepare:
— 3 Implication questions based on what they told you in the Discovery Call
— Their exact SPIN-P from the CRM (their pain in their own words)
— Your proposed solution (workers count, type, timeline, entity)

━━━ MEETING STRUCTURE — 30–40 MINUTES ━━━

[0–3 min] ENTRY — rapport, not pitch
Compliment something specific you noticed: their facility, a news article about their company, something from their LinkedIn.
DO NOT start with "Let me tell you about Gremi Personal."

[3–6 min] AGENDA — set the frame
"I'd like to spend about 30 minutes. I want to share a few things we've seen in your industry — then I want to understand your situation better — and if it makes sense, we'll talk about what we could do together. Does that work?"
(Challenger: setting the agenda signals professionalism and gives you control of the meeting)

[6–12 min] TEACH — the Commercial Insight
Deliver your prepared insight. Make it specific to their industry and size.
→ Show data. Show cost comparisons. Show timelines.
→ "Most companies I work with in [industry] initially think the main problem is finding workers. What we consistently find is that the actual cost driver is..."
DO NOT present your solution yet. The insight comes first.
(Challenger: Teach before you Tailor. Insight before offer.)

[12–22 min] TAILOR — deep discovery
Now ask your prepared Implication questions. Go deeper on what they told you before.
→ "You mentioned you were short [X workers] last season. What did that cost you operationally?"
→ "What does your April look like this year?"
→ "If we could solve this before peak — what would that be worth to you?"
Listen. Take notes. Update SPIN fields in your head. Write them up immediately after.

[22–30 min] TAKE CONTROL — present and propose
Now — and only now — present your solution.
Keep it specific: exactly how many workers, which profile, which entity, which timeline.
→ "Based on what you've told me, I'd propose [X] Ukrainian operators, outsourcing model via Gremi Personal SRL, delivery by [date]. The all-inclusive rate would be [range] per worker per month."
(Challenger: take control of the close — do not leave it ambiguous)

[30–33 min] PAIN SUMMARY — verify you understood
"Let me check I understood correctly. You have [X] open positions, it takes [Y] weeks to fill them, and each week costs roughly [Z RON]. Is that right?"
If they confirm: you have your proposal language. This is their SPIN-N.

[33–36 min] NEXT STEP — be specific and committal
Never: "I'll send you something."
Always: "I'll prepare the specific proposal and send it by [date]. Can we do 20 minutes on [day] at [time] to walk through it?"
Get a YES with a date. Get their email confirmed. No vague "yes, send it."

[36 min] EXIT
Leave immediately after the commitment. Do not linger. Professional exit = professional impression.

━━━ AFTER THE MEETING — same day ━━━
— Update SPIN-S, P, I, N with real answers
— Set Next Step date in CRM
— Log Activity with key quotes
— Send confirmation email with summary of what you heard and confirmed next step`},

    {id:"preDiscoveryPrep",quick:["Write your pain hypothesis (SPIN-P) BEFORE dialing — one sentence","Prepare 3 Implication questions specific to THIS client's industry + size","Know your ONE call goal — what specific next step do you want?","If you can't write the pain hypothesis — you're not ready to call"],stageGroup:"Contacted",title:"Pre-Call Preparation",color:"blue",text:`SOURCE: SPIN Selling (Rackham) + The Challenger Sale (Dixon & Adamson)
Do this 15–20 minutes before any call. Not the day before — right before.

━━━ STEP 1: REVIEW INTELLIGENCE ━━━
Re-read HQ Intelligence. Revenue, dynamics, vacancies, DM LinkedIn.
If you have not written intelligence — go back and find it first. Do not call blind.
(Challenger: you must know more about their business than they expect you to)

Check:
— How many open positions on eJobs/BestJobs right now?
— Any recent company news? (expansion, new contracts, production changes)
— What did you discuss last time? What did they say?

━━━ STEP 2: BUILD YOUR PAIN HYPOTHESIS ━━━
Write one sentence — what is most likely hurting this client right now?
Write it in SPIN-P BEFORE the call. This is your starting assumption.
Examples:
→ "They've been posting 8 vacancies for 10 weeks and can't fill them — peak season is coming."
→ "Their current agency can't deliver Asian workers fast enough for their expansion."
→ "They had ITM issues last year and HR is scared of the compliance risk."
If you cannot write the pain hypothesis — you are not ready to call.
(Rackham: top performers hypothesize the problem before the call. Average performers discover it reactively.)

━━━ STEP 3: PREPARE 3 IMPLICATION QUESTIONS ━━━
Write them specifically for this client, this industry, this size.
Examples for an automotive parts manufacturer:
→ "If the line is not full in April — what happens to your Q2 delivery plan for Renault?"
→ "With a 40% annual turnover, how much does your HR team spend on recruitment vs. strategic work?"
→ "What's the worst-case scenario if your current agency can't scale in peak?"
(Rackham: Implication Questions must be prepared, not improvised. The difference between average and top performers.)

━━━ STEP 4: SET YOUR CALL GOAL ━━━
One specific next step you want from this call. Know it before you dial.
Options:
— Book a physical meeting at their plant
— Get intro to the Economic Buyer (the person who signs contracts)
— Get agreement to receive a specific proposal
→ Write it down. "After this call I want: [X]."

━━━ STEP 5: PREPARE YOUR COMMERCIAL INSIGHT ━━━
One fact or reframe they probably don't know about their situation.
(Challenger: every call should teach something)
→ "Did you know that companies in your industry that outsource production staff reduce their HR overhead by 30%? I want to show you how that works."

━━━ STEP 6: KNOW YOUR OFFER ━━━
Which entity: Gremi Personal SRL (outsourcing) or Antforce SRL (leasing)?
Which worker profile: UA or Asian?
Realistic delivery timeline: UA = 2–4 weeks. Asian = 4–6 MONTHS. Know this before you promise.
Do not make commitments you cannot keep. Your reputation is on every promise.`},

    {id:"coldCallOpener",quick:["3 sentences: who you are → specific observation about THEM → one question","NEVER 'Is this a bad time?' NEVER pitch in first 20 seconds","'Send email' → 'Before I do — two quick questions?' Goal: attach a call","Gatekeeper: 'Re: email about operational staffing — can you transfer?'"],stageGroup:"Contacted",title:"Cold Call Opener",color:"blue",text:`SOURCE: Never Split the Difference (Voss) + The Challenger Sale (Dixon & Adamson)
The first 20 seconds determine whether they stay on the line. Everything after that is execution.

━━━ WHAT DOES NOT WORK ━━━
"Buna ziua, suntem o agentie de personal si oferim muncitori pentru productie..."
Why it fails: starts with "we," pitches before asking, gives them no reason to listen.
Result: "Trimiteti un email" within 10 seconds.

"Is this a bad time?" (Voss: NEVER say this)
Why it fails: invites immediate "yes, it's always a bad time."
Instead: "Did I catch you at a bad time?" — which produces "no, what do you want?"

━━━ THE STRUCTURE THAT WORKS ━━━
(Challenger: lead with a specific observation about THEM, not about you)

3 sentences:
1. Who you are + company (5 seconds)
2. Why you are calling THEM specifically — one concrete fact about their business (5 seconds)
3. A question that opens the conversation (5 seconds)

EXAMPLE SCRIPTS:

For a company posting vacancies:
"Buna ziua, ma numesc Walery, sunt Directorul de Dezvoltare la Gremi Personal. Am vazut ca aveti [X] pozitii de operatori deschise pe eJobs de [Y] saptamani — pare ca recrutarea locala e dificila. Voiam sa va intreb — care e principala provocare acum?"

For a company you know from research:
"Buna ziua, ma numesc Walery de la Gremi Personal. Am vazut ca [COMPANIA] s-a extins semnificativ — felicitari. De obicei expansiunile aduc si provocari cu staffingul. Ati intampinat asta?"

For a referral:
"Buna ziua, ma numesc Walery de la Gremi Personal. [REFERRAL NAME] mi-a recomandat sa va contactez — a mentionat ca aveti nevoie de personal suplimentar. Ii multumesc pentru recomandare — pot sa va intreb care e situatia?"

━━━ IF THEY SAY "SEND AN EMAIL" ━━━
(Voss: invite a safe 'no' to stay in the conversation)
→ "Desigur. Inainte sa fac asta — ca sa trimit ceva relevant, nu un email generic — ar fi o problema sa va pun doua intrebari rapide?"
Most people say no to "is it a problem?" and then answer your questions.

━━━ IF GATEKEEPER ━━━
→ "Am trimis un email dl-ului [NAME] referitor la personal operational. Puteti sa ma transferati, va rog?"
If they don't know the name:
→ "Cu cine vorbeste directorul de productie / directorul HR de obicei despre furnizori de personal?"

━━━ VOICEMAIL ━━━
Do NOT leave a voicemail. It gives them a reason not to answer the next call.
Call again at a different time of day. Different day of week.`},

    {id:"linkedinOutreach",quick:["First message: Hook (their news) + Insight (useful to them) + ONE question. No pitch","Never mention your company in first message","No reply 7 days: one follow-up with DIFFERENT angle. Still nothing: call","They reply: move immediately to booking a 15-min call"],stageGroup:"Contacted",title:"LinkedIn Outreach",color:"blue",text:`SOURCE: The Challenger Sale (Dixon & Adamson) + Never Split the Difference (Voss)
LinkedIn is not for pitching. It is for opening a conversation with someone who would otherwise never take your call.

━━━ THE CHALLENGER PRINCIPLE ━━━
Your first message must deliver value or insight — not ask for something.
"We help companies like yours with staffing" = worthless noise.
"I noticed something about your hiring pattern that might be relevant" = curiosity.

━━━ MESSAGE STRUCTURE ━━━
3 elements:
1. Hook — specific observation about them (their post, company news, something concrete)
2. Insight — one useful thing they can take away, not about you
3. One question — not a pitch, not a request for a meeting

RULE: Never mention your company in the first message.
RULE: Never pitch in the first message.
RULE: One question only.

━━━ EXAMPLES BY ROLE ━━━

HR DIRECTOR:
"Am vazut ca recrutati operatori de linie de cateva luni — am urmarit si postarile voastre pe eJobs. Companiile din productie cu care lucrez au redus timpul de recrutare cu 60% trecand la outsourcing — nu prin agentii clasice, ci prin un model diferit. Va intreb direct: cat timp aloca echipa HR lunar pentru aceasta problema?"

PLANT MANAGER / PRODUCTION DIRECTOR:
"Felicitari pentru extinderea liniei de productie — am vazut anuntul. Din experienta cu producatori similari din [judet] — cel mai mare risc in primele 3 luni este stabilitatea echipei, nu capacitatea. Cum gestionati asta momentan?"

OWNER / GENERAL MANAGER:
"Am vazut ca [COMPANIA] lucreaza deja cu clienti importanti din [industrie]. La scale-ul la care va aflati, cel mai frecvent punct de tensiune e asigurarea personalului in sezon. V-ati gandit la un model de personal mai predictibil?"

━━━ FOLLOW-UP (if no reply after 7 days) ━━━
Send one follow-up with a DIFFERENT angle — not the same message again.
→ New hook (different observation), same structure.

━━━ IF THEY REPLY ━━━
Move immediately to Discovery Call request. Do not pitch in chat.
→ "Multumesc pentru raspuns. Ar fi ok sa facem un apel scurt de 15 minute — sa inteleg mai bine situatia dvs. inainte sa spun orice?"

━━━ IF NO REPLY AFTER SECOND MESSAGE ━━━
Move to Cold Call. LinkedIn silence ≠ rejection. Different channel.`},

    {id:"proposalStructure",quick:["Section 1: Pain Summary — their exact words back to them (builds trust)","Section 2: EVC — cost of their alternative BEFORE your price (Nagle)","Section 3: Specific solution — workers count, profile, entity, date","Section 6: Booked follow-up call — proposals without next steps die"],stageGroup:"Proposal Sent",title:"Proposal Structure",color:"teal",text:`SOURCE: The Strategy and Tactics of Pricing (Nagle) — Economic Value to Customer framework
A proposal is not a brochure. It is a structured argument for why investing in your solution creates more value than it costs.

━━━ NAGLE'S CORE PRINCIPLE ━━━
"Price is what you charge. Value is what the client gets. Your job is to make the gap visible."
A proposal that lists your services without quantifying the value of solving the problem will always be compared to price, not to value.
You must show: (Cost of their problem) > (Your price). That's the only argument that works.

━━━ PROPOSAL STRUCTURE — 6 SECTIONS ━━━

1. PAIN SUMMARY — mirror their words back
This is the most important section. Repeat what they told you in the Discovery Call.
Use their exact words from SPIN-P and SPIN-I.
Example:
"Based on our conversation: your Cluj location needs 15 operators for April peak. You have posted these roles for 10 weeks without success through local agencies. Each week of delay costs approximately [X RON] in overtime and production gaps."
Effect: they read this and think "he understood me." Trust increases before you've said anything about your solution.
(Voss: "That's right" moment in written form)

2. ECONOMIC VALUE CALCULATION — Nagle's EVC
Show the full cost of their alternative, not just your price.
Build this table:
— Direct hire cost per worker: recruitment + onboarding + turnover × rate
— HR admin hours per worker per year × internal cost
— Overtime cost during vacancy periods
— ITM compliance risk (fines avoided)
— Management time spent on staffing vs. operations
Total cost of NOT using us = [X RON/month for Y workers]
Our all-inclusive rate = [Z RON/month]
Delta = [their savings/value gained]
(Nagle: Economic Value to Customer = (Competitor price) + (value of your differentiation). Show this math.)

3. SOLUTION — specific, not generic
Not "we provide foreign workers." Specific:
— [X] operators, [UA/Asian] profile
— Start date: [DATE]
— Legal entity: Gremi Personal SRL or Antforce SRL (and why)
— What's included: permits, ITM documentation, coordinator, replacement guarantee

4. PROCESS — how it works
Signing → IGI submission → worker selection → onboarding → on-site coordinator
Timelines: UA = 2–4 weeks. Asian = 4–6 MONTHS (never promise otherwise).
Replacement guarantee: worker leaves in first [X] weeks → replaced within 72h, no charge.

5. PROOF — one case study, same industry
Real numbers only. Vague references don't count.
"Cris-Tim Ilfov: 42 workers placed in 3 weeks, contract extended 6 months later."
"Dacia Parts Pitești: 35 operators delivered in 18 days, currently in month 4."

6. NEXT STEP — a specific ask
"I propose a 20-minute call on [DATE] at [TIME] to walk through this together."
NEVER end a proposal without a booked follow-up. A proposal without a next step is a document that sits in someone's inbox.
(Challenger: take control of the advance)

━━━ WHAT NOT TO PUT IN A PROPOSAL ━━━
— Company history and "about us" paragraphs (they don't care)
— Long lists of services you offer (irrelevant to their situation)
— Generic guarantees without specifics ("we guarantee quality")
— Your pricing before you've shown the EVC calculation`},

    {id:"closingTechniques",quick:["Close only when: Pain ≥4 + Economic Buyer present + proposal discussed + no open objections","Get 'That's right' first — not 'you're right'","Assumptive: 'When is better — start of April or mid-month?' (assumes yes, asks timing)","Summary: 'We agreed: X workers, Y date, Z price. Sign?'","Escalation: 'Let me bring in our director — he can authorize what I can't'"],stageGroup:"Negotiation",title:"Closing Techniques",color:"green",text:`SOURCE: Never Split the Difference (Voss) + The Challenger Sale (Dixon & Adamson)

━━━ WHEN TO CLOSE ━━━
Close only when all four conditions are true:
1. Pain Score ≥ 4 — they've confirmed the problem is urgent and costly
2. Economic Buyer is identified and involved — the person who signs
3. Proposal has been SENT and DISCUSSED — not just emailed
4. No unresolved objections — all concerns have been surfaced and addressed

Closing too early = pushback and stalling. Closing after all four = natural progression.
(Challenger: "The close is the natural end of a well-managed conversation, not a technique applied at the end.")

━━━ THE VOSS PRINCIPLE: SEEK "THAT'S RIGHT" BEFORE CLOSING ━━━
Before any close attempt, summarize their situation back:
"So if I understand correctly — you need 25 operators by April 1st, your current agency can't deliver, and each week of delay is costing you roughly [X RON]. Is that right?"
Wait for "that's right." If you get it — proceed to close.
If you get "you're right" (different!) — they want to end the conversation. You haven't earned the close yet.

━━━ FOUR CLOSING TECHNIQUES ━━━

1. ASSUMPTIVE CLOSE (use when pain is confirmed and EVC has been shown)
"Cand va este mai convenabil sa incepem — la inceputul lui aprilie sau la mijlocul lunii?"
Assumes yes. Asks only about timing. Works when alignment is real.
(Voss: calibrated question that advances without confrontation)

2. SUMMARY CLOSE (use when all terms have been discussed)
"Am convenit: 25 de persoane, profil UA, start 1 aprilie, Gremi Personal SRL, pret [X] RON/luna per persoana. Semnam?"
Removes all ambiguity. Forces a clear yes or no. Respects their time.

3. TRIAL CLOSE (use to test readiness before full commitment)
"Daca rezolvam problema cu [specific remaining concern] — sunteti pregatiti sa mergem mai departe?"
Tests whether that concern is the last blocker or not.
If they say yes → resolve it → close immediately.
If they reveal another concern → address it → trial close again.

4. ESCALATION CLOSE (use when they want to "think about it")
"Inteleg. Lasati-ma sa aduc directorul nostru intr-un apel scurt — are mai multa flexibilitate pe termeni decat mine."
Signals seriousness. Creates scarcity of your attention. Often accelerates decisions.
(Challenger: take control — escalation is not weakness, it is a strategic move)

━━━ AFTER EVERY CLOSE ATTEMPT ━━━
They say YES → confirm in writing immediately. Same day.
They say NOT YET → "Ce anume lipseste pentru a lua decizia?" Find the real blocker.
They say NO → "Ce s-a schimbat fata de ultima noastra conversatie?" Update Lost Reason in CRM.`},

    {id:"negotiationTechniques",quick:["Label emotion first: 'It seems budget pressure is real right now'","Calibrated: 'How am I supposed to make this work?' — makes them solve it with you","Ackerman: 65%→85%→95%→100%. Final = precise non-round number","Never concede without trading: 'I can do X — if you confirm Y'",">5% / >50 workers / non-standard terms → call Walery NOW"],stageGroup:"Negotiation",title:"Negotiation Techniques",color:"orange",text:`SOURCE: Never Split the Difference (Voss) + The Strategy and Tactics of Pricing (Nagle) + Thinking Strategically (Dixit & Nalebuff)

━━━ ENTER NEGOTIATION ONLY AFTER ATTEMPTING TO CLOSE ━━━
If they said yes → confirm and sign. Do NOT negotiate against yourself.
If they pushed back → now use what follows.
(Dixit & Nalebuff: in game theory, first-mover advantage is real. The one who makes the first concession loses leverage.)

━━━ PART 1: MINDSET (Voss) ━━━

NEVER SPLIT THE DIFFERENCE
Compromise = both sides lose something. Instead: find what they ACTUALLY need beneath their stated position.
"The rate is too high" → is it the monthly total? The structure? The commitment length?
Ask before you move.

TACTICAL EMPATHY BEFORE LOGIC
You cannot persuade someone who feels misunderstood.
Label their emotion first:
→ "It seems like the budget pressure is real right now."
→ "It sounds like you've been disappointed by agencies before."
Then — and only then — present your argument.

CALIBRATED QUESTIONS (not attacks)
Instead of defending, ask open questions that make them solve the problem:
→ "How am I supposed to make this work at that rate?"
→ "What would make this feel fair to you?"
→ "If we could solve [specific concern] — would that change things?"
These shift the dynamic from adversarial to collaborative.

EMBRACE 'NO'
"No" is not rejection. It means they feel safe enough to be honest.
Ask questions that invite a safe no:
→ "Is it a bad idea to explore this together?"
→ "Would it be ridiculous to do a pilot first?"
A "no" keeps them in the conversation. A false "yes" disappears.

━━━ PART 2: THE ACKERMAN METHOD (structured price moves) ━━━
When you must negotiate price — do it with structure, not emotion.

1. Set your walk-away number BEFORE the call. Know it. Do not cross it.
2. First counter-offer: anchor far from your target (65% of target)
3. Move in decreasing increments: → 85% → 95% → 100%
4. Each move SMALLER than the last — signals you're approaching your limit
5. Final number: use a precise, non-round number (e.g., 5,840 RON not 5,800)
   → Precise numbers feel calculated, not arbitrary. They signal a real limit.
6. On your final number: add a small non-monetary item to signal nothing is left
   → "I can do 5,840 — and I'll throw in the first month of coordinator support at no charge."

━━━ PART 3: NAGLE — DEFEND VALUE, NOT PRICE ━━━
When they push on price, never defend the number. Defend the value.
→ "What does their quote include exactly? Does it cover ITM documentation, housing coordination, 72-hour replacement guarantee?"
→ Build the Economic Value to Customer calculation on the call if needed.
→ "Let me show you what our all-inclusive rate covers vs. what you'd pay managing it in-house."

NEVER concede without trading:
→ "I can look at the rate — if we can confirm the volume and contract length."
→ "I can do the pilot — if we agree now that a successful pilot leads directly to the full contract."
→ "I can extend payment terms — if you can commit to a 6-month minimum."
(Nagle: price concessions given freely signal that your price was wrong to begin with)

━━━ PART 4: DIXIT & NALEBUFF — STRATEGIC COMMITMENTS ━━━
Credible commitments change the negotiation dynamic.
→ "This rate is valid until [specific date]. After that our capacity for [county] is allocated."
Not a bluff — only say it if it's true. False urgency is spotted and destroys trust.
→ "Our team lead has approved this package specifically. Any discount above 5% needs to go to our director."
Escalation rules as strategic moves — not signs of weakness.

━━━ ESCALATION RULES — involve Walery when: ━━━
— Discount requested > 5%
— Non-standard contract terms
— Order volume > 50 workers
— Client requests exclusivity
— Payment terms beyond 30 days
Escalation is a closing tool: "Let me bring in our director — he can authorize what I cannot."`},

    {id:"competitorComparison",quick:["Porter: differentiate on specialization, speed, legal expertise — not price","'We already have Adecco' → 'We complement, not replace — they do local, we do foreign'","Our strongest: 2-4 week UA delivery (documented). No agency matches this","Legal: we are employer of record. ITM comes to us, not to client","Reframe: 'What criteria matter most to you in choosing a foreign worker supplier?'"],stageGroup:"Negotiation",title:"Competitive Positioning",color:"purple",text:`SOURCE: Competitive Strategy (Porter) + The Challenger Sale (Dixon & Adamson)
Porter: sustainable competitive advantage comes from either lower cost OR differentiation. Not both. Not neither.
Gremi/Antforce: we do not compete on price. We compete on differentiation — specialization, speed, legal expertise.

━━━ PORTER'S FIVE FORCES — how this market looks ━━━

Threat of new entrants: HIGH — low capital requirements, many small agencies.
Buyer power: MODERATE — large manufacturers have multiple options.
Supplier power: MODERATE — worker supply from UA/Asia is not infinite.
Substitutes: HIGH — direct hiring is always an option (but expensive).
Rivalry: HIGH — Adecco, Manpower, Lugera, Trenkwalder, dozens of local agencies.

Strategic conclusion: Do NOT try to compete across all segments. Choose a niche and dominate it.
Our niche: FOREIGN WORKERS FOR MANUFACTURING. No one else does this with our speed and legal depth.

━━━ YOUR DIFFERENTIATION vs. LARGE AGENCIES ━━━
(Challenger: teach the client how to evaluate suppliers on criteria where you win)

SPECIALIZATION
Large agencies: white collar + blue collar + all industries. General practitioners.
Gremi/Antforce: one thing — foreign workers for manufacturing.
→ "They handle everything. We handle foreign workers for production better than anyone."
→ Reframe the evaluation: "Who has placed more UA workers in Romanian automotive in the last 12 months?"

SPEED — this is your strongest differentiator
Large agencies: internal process, multiple approval layers, 4–8 week timelines typical.
Gremi/Antforce: direct recruitment channels, 2–4 weeks UA (documented track record).
→ "We delivered 35 workers to [client name] in 18 days. Show me another agency in Romania that can document that."

LEGAL EXPERTISE — unique value in this market
Large agencies: standard HR compliance. Not specialists in foreign worker documentation.
Gremi/Antforce: full IGI support, work permits, ITM documentation for foreign workers. We are the employer of record.
→ "ITM comes to us. Not to you. That is a structural protection for your company."

FLEXIBILITY — important for first-time clients
Large agencies: minimum volumes, long-term contracts, standard packages.
Gremi/Antforce: pilot batches possible, no minimum commitment on first engagement.
→ "Start with 5 workers. Prove the model. Scale when it works for you."

━━━ WHEN CLIENT SAYS "WE ALREADY WORK WITH ADECCO/MANPOWER/LUGERA" ━━━
Wrong response: attack the competitor. (creates defensiveness, damages trust)
Right approach (Challenger: reframe the evaluation):
→ "I understand — they're a solid agency for local staff."
→ "Our niche is foreign workers for production. That's all we do. They can't match our speed or legal expertise in this specific area."
→ "Many of our best clients use both — them for local roles, us for foreign worker programs. No conflict. Do you have a foreign worker program currently?"
Reframe from replacement to complement.

━━━ THE CHALLENGER REFRAME ON COMPETITION ━━━
Don't ask "why are we better than Lugera?"
Ask: "What criteria matter most to you in choosing a foreign worker supplier?"
Then show how those criteria favor you — specifics, not generalities.
(If they say price: go to Nagle's EVC. If they say reliability: go to your track record.)`},

    {id:"postDealOnboarding",quick:["Brief Ops within 24h. Introduce coordinator by name + phone same day","UA: 2-4 weeks. Asian: 4-6 MONTHS minimum. NEVER promise Asian in 4 weeks","Day 1 on site: coordinator present. Any issue resolved within 24h","Month 1 formal check-in: satisfaction score + upcoming needs"],stageGroup:"Closed Won",title:"Post-Deal Onboarding",color:"green",text:`SOURCE: High Output Management (Grove) — process standardization as a management tool
"A well-defined process is the foundation of consistent output." — Grove

━━━ THE FIRST 48 HOURS ━━━
This is when trust is won or lost. The client has just signed. They are nervous.
Your job: eliminate uncertainty immediately.

— Send confirmation email with summary of what was agreed (workers, timeline, contact)
— Introduce the Operations contact and Coordinator by name and phone number
— Send the onboarding checklist to the client contact
— Brief Ops team: client specs, location, shift pattern, specific requirements
— Set first check-in call: 3 days after signing

━━━ TIMELINE — what you can promise and when ━━━
(Never deviate from these. Your reputation is built on predictability.)

UA WORKERS: 2–4 weeks from signing to first workers on site
Asian workers: 4–6 MONTHS minimum from signing
Mixed UA+Asian programs: UA starts fast, Asian pipeline runs parallel

NEVER promise Asian workers in under 4 weeks. Not possible. Saying so destroys trust permanently.

━━━ STANDARD PROCESS — DAY BY DAY ━━━
(Grove: process must be documented and followed consistently to scale)

DAY 1–3: Signing + Handover
Who: Salesperson + Operations
— Signed contract, all client specs collected
— Client introduced to dedicated coordinator (by name, by phone)
— Internal briefing complete

DAY 3–7: IGI Submission + Recruitment
Who: Operations
— Worker documentation submitted to IGI (for non-UA profiles)
— Worker selection started from existing database OR recruitment launched
— Start date confirmed with client in writing

DAY 7–21: Worker Processing
Who: Operations + Coordinator
— Medical checks, contract signing with workers, safety briefing
— Housing and transport arranged (if part of scope)
— Client receives worker profiles for review/approval

DAY 21–30: First Workers On Site
Who: Coordinator
— Coordinator present on Day 1 at the client site
— Onboarding checklist completed with client
— Any Day-1 issues resolved within 24 hours

DAY 30+: Account Management Begins
Who: Salesperson
— Formal check-in call: satisfaction, performance, any issues
— Update CRM: Last Contact, next check-in date
— Begin looking for expansion signals

━━━ GROVE'S PRINCIPLE: LEVERAGE THROUGH PROCESS ━━━
Document what works on each client. Every successful onboarding teaches you something.
The goal: make the 10th onboarding as smooth as the 1st — through process, not heroics.`},

    {id:"accountManagementUpsell",quick:["Week 1 → Week 2 → Month 1 → Month 3 check-ins. Minimum monthly contact","Upsell triggers: 'new line', 'night shift', 'peak earlier', 'other plant'","Referral ask after Month 1 — most clients will refer, most salespeople never ask","Keeping client costs 5-7x less than finding new one (Nagle)"],stageGroup:"Closed Won",title:"Account Development & Upsell",color:"green",text:`SOURCE: The Challenger Sale (Dixon & Adamson) + High Output Management (Grove)
"The relationship starts at signing — it does not end there." (Challenger Sale)

━━━ WHY THIS MATTERS — THE ECONOMICS ━━━
(Nagle — Pricing: acquiring a new customer costs 5–7x more than expanding an existing one)
Every Closed Won client is your highest-value asset. They already trust you. The cost of expansion is minimal.
A client with 25 workers who becomes a client with 50 workers = doubled revenue, near-zero sales cost.

━━━ CHECK-IN SCHEDULE ━━━
(Grove: consistent contact is a management discipline, not a social nicety)

Week 1: Coordinator on site Day 1. Any issue resolved within 24 hours.
Week 2: Call with client contact — "How are the workers settling in?"
Month 1: Formal check-in — satisfaction, performance, any upcoming changes
Month 3: Strategic review — what's working, what can improve, what's coming
Ongoing: minimum monthly contact. No exceptions.

━━━ WHAT TO TRACK PER CLIENT ━━━
— Worker retention rate on their site (benchmark: >80% past 3 months)
— Number of client complaints (and speed of resolution — this builds trust)
— Client satisfaction score: ask directly: "On a scale of 1–10, how satisfied are you? What would make it a 10?"
— Open positions not yet filled by us (expansion opportunity)

━━━ CHALLENGER: BRING INSIGHTS TO ONGOING CLIENTS ━━━
Don't just check in — bring something valuable.
→ "I wanted to share something we're seeing in other automotive suppliers in your region — there's a spike in demand for Asian workers coming. You might want to start the pipeline now before capacity tightens."
→ "We just completed a compliance review for 3 clients in Prahova — I noticed [specific pattern]. Relevant for you?"
(Challenger: keep teaching even after the deal. That's what builds loyalty and expansion.)

━━━ UPSELL TRIGGERS — listen for these ━━━
→ "We are opening a new production line" → new location deal
→ "We are adding a night shift" → more workers, same location
→ "Peak season is coming earlier this year" → volume increase
→ "Our [other plant] has the same problem" → new HQ + location
→ "My colleague at [Company X] asked me about this" → referral lead (act immediately)

━━━ HOW TO ASK FOR A REFERRAL ━━━
Timing: after Month 1, when you have delivered results.
Script:
"We're really proud of how this has gone. Do you know other companies — suppliers, partners, or industry contacts — who might benefit from the same model?"
Most satisfied clients are happy to refer. Most salespeople never ask.

━━━ GROVE: THE OUTPUT OF ACCOUNT MANAGEMENT ━━━
Your account management output = retention rate + expansion revenue + referrals generated.
Measure it. If retention is below 90% — something in your onboarding or quality is broken. Fix the process, not the symptom.`},

    {id:"meetingConfirmation",quick:["Send 24h before — not 5min, not 2 days","Subject + agenda + duration + your phone. No pitch in confirmation","No reply by evening: call to confirm. Unconfirmed = coin flip","If they reschedule: propose 2 specific alternatives immediately"],stageGroup:"Meeting Scheduled",title:"Meeting Confirmation",color:"green",text:`SOURCE: High Output Management (Grove) — confirmed next steps as process discipline
Rule: an unconfirmed meeting is a coin flip. A confirmed meeting is a commitment.

━━━ WHEN TO SEND ━━━
24 hours before — not 5 minutes before, not 48 hours before.
24 hours = enough time for them to reschedule if needed, close enough that they've committed mentally.

━━━ EMAIL TEMPLATE ━━━

Subject: Confirmare intalnire maine — [ORA] — Walery / Gremi Personal

"Buna ziua [PRENUME],

Confirm intalnirea noastra de maine, [DATA] la ora [ORA] la sediul dvs. din [ADRESA].

Agenda propusa — ~30 minute:
— [5 min] Cateva observatii despre tendintele de staffing in [industria lor]
— [15 min] Sa inteleg mai bine situatia dvs. si provocarile cu personalul
— [10 min] Daca are sens, sa discutam ce am putea face impreuna

Daca apare ceva neprevazut, va rog sa ma anuntati la [TELEFON]. Va multumesc pentru timp.

Ne vedem maine.
Cu stima, Walery"

━━━ RULES ━━━
— No pitch in the confirmation. Just the agenda.
— State the duration — they plan their day around it.
— Include your phone number — makes rescheduling easy for them (and keeps the relationship alive if they need to change)
— For online meeting: include Zoom/Teams link directly. Do not make them ask.
— If no reply by that evening: call to confirm. Do not assume.

━━━ IF THEY NEED TO RESCHEDULE ━━━
→ "Of course — when works for you?"
→ Propose two specific alternatives immediately: "Tuesday at 10 or Wednesday at 14?"
→ Never: "Whenever you're free." You are a professional with a schedule. Act like one.

━━━ GROVE: WHY THIS MATTERS ━━━
A confirmed meeting is 3x less likely to be cancelled.
Your calendar is your production schedule. Every no-show = lost output.
Confirmation is not bureaucracy. It is the last step of the booking process.`},
  ],
};

const INIT_USERS = [
  {id:1,name:"Walery",username:"walery",password:"admin123",role:"admin",active:true,protected:true},
  {id:2,name:"Ana",   username:"ana",   password:"ana123",  role:"user", active:true,protected:false},
];
const INIT_HQS = [
  {id:100,isHQ:true,company:"Autoliv Romania",industry:"Auto Parts",centralContact:"Ion Popescu",centralRole:"HR Director",centralPhone:"+40 721 000 001",centralEmail:"i.popescu@autoliv.ro",address:"Bd. Pipera 42, Voluntari, Ilfov",website:"www.autoliv.com",notes:"",annualTurnover:"",employees:"",seasonality:"",leadSource:"",intelligence:""},
  {id:101,isHQ:true,company:"Dacia Parts",industry:"Auto Parts",centralContact:"Andrei Marin",centralRole:"Production Director",centralPhone:"+40 723 000 003",centralEmail:"a.marin@daciaparts.ro",address:"Str. Industriilor 5, Pitesti, Arges",website:"",notes:""},
  {id:102,isHQ:true,company:"Mondostar Textiles",industry:"Textile",centralContact:"Elena Dumitrescu",centralRole:"HR Manager",centralPhone:"",centralEmail:"",address:"",website:"www.mondostar.ro",notes:"Posted 15 jobs on eJobs."},
  {id:103,isHQ:true,company:"Cris-Tim",industry:"Food Production",centralContact:"Bogdan Stancu",centralRole:"General Manager",centralPhone:"+40 724 000 005",centralEmail:"b.stancu@cristim.ro",address:"Sos. Bucuresti-Ploiesti 42, Ilfov",website:"www.cristim.ro",notes:""},
];
const INIT_LOCS = [
  {id:1,isHQ:false,parentId:100,company:"Autoliv Romania",location:"Plant Ploiești",address:"Str. Fabricii 12, Ploiesti, Prahova",contact:"Mihai Dinu",role:"Plant Manager",county:"Prahova",employees:"220",stage:"Contacted",temp:"🟡 Warm",workers:"8",workerType:"UA Ukrainian",nextAction:"2026-03-08",lastContact:"2026-03-02",source:"ANOFM Database",service:"Outsourcing",companyName:"Gremi Personal SRL",salesId:1,phone:"",email:"",activities:[],spin:{s:"",p:"",i:"",n:""},notes:"Seat components line. Needs 8 operators."},
  {id:2,isHQ:false,parentId:100,company:"Autoliv Romania",location:"Warehouse Ilfov",address:"Sos. Afumati 88, Voluntari, Ilfov",contact:"Radu Popa",role:"Logistics Manager",county:"Ilfov",employees:"80",stage:"Meeting Scheduled",temp:"🔥 Hot",workers:"12",workerType:"UA Ukrainian",nextAction:"2026-03-10",lastContact:"2026-03-05",source:"ANOFM Database",service:"Outsourcing",companyName:"Gremi Personal SRL",salesId:1,phone:"",email:"",activities:[],spin:{s:"",p:"",i:"",n:""},notes:"New warehouse, ramp-up in April."},
  {id:3,isHQ:false,parentId:101,company:"Dacia Parts",location:"Factory Pitești",address:"Str. Industriilor 5, Pitesti, Arges",contact:"Andrei Marin",role:"Production Director",county:"Argeș",employees:"320",stage:"Proposal Sent",temp:"🔥 Hot",workers:"35",workerType:"UA Ukrainian",nextAction:"2026-03-12",lastContact:"2026-03-04",source:"LinkedIn Outreach",service:"Outsourcing",companyName:"Antforce SRL",salesId:2,phone:"",email:"",activities:[],spin:{s:"",p:"",i:"",n:""},notes:"35 workers @ 6200 RON. Awaiting sign."},
  {id:4,isHQ:false,parentId:102,company:"Mondostar Textiles",location:"Factory Cluj",address:"Str. Fabricii 20, Cluj-Napoca",contact:"Elena Dumitrescu",role:"HR Manager",county:"Cluj",employees:"250",stage:"New",temp:"❄️ Cold",workers:"15",workerType:"Asian",nextAction:"2026-03-15",lastContact:"",source:"Job Portal (eJobs/OLX)",service:"Leasing",companyName:"Gremi Personal SRL",salesId:2,phone:"",email:"",activities:[],spin:{s:"",p:"",i:"",n:""},notes:"Posted 15 jobs on eJobs."},
  {id:5,isHQ:false,parentId:103,company:"Cris-Tim",location:"Plant Ilfov",address:"Sos. Bucuresti-Ploiesti 42, Ilfov",contact:"Bogdan Stancu",role:"General Manager",county:"Ilfov",employees:"600",stage:"Closed Won",temp:"🔥 Hot",workers:"42",workerType:"UA Ukrainian",nextAction:"",lastContact:"2026-02-28",source:"RO Client Referral",service:"Outsourcing",companyName:"Gremi Personal SRL",salesId:1,phone:"",email:"",activities:[],spin:{s:"",p:"",i:"",n:""},notes:"Contract signed. 42 workers Apr 1."},
  {id:6,isHQ:false,parentId:103,company:"Cris-Tim",location:"Warehouse Prahova",address:"",contact:"Florin Negru",role:"Ops Manager",county:"Prahova",employees:"120",stage:"Interested",temp:"🟡 Warm",workers:"10",workerType:"UA Ukrainian",nextAction:"2026-03-18",lastContact:"2026-03-01",source:"RO Client Referral",service:"Outsourcing",companyName:"Gremi Personal SRL",salesId:1,phone:"",email:"",activities:[],spin:{s:"",p:"",i:"",n:""},notes:"Interested after Ilfov contract."},
];


// ─── LOGIN SCREEN ────────────────────────────────────────────────
function LoginScreen({onLogin}) {
  const [u,setU]=useState(""); const [p,setP]=useState(""); const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);
  const go=async()=>{
    setLoading(true);setErr("");
    try{
      let user=null;
      try{
        const rows=await dbGet("crm_users",`username=eq.${encodeURIComponent(u.toLowerCase().trim())}&limit=1`);
        if(rows.length>0) user=rows[0];
      }catch(dbErr){}
      // Fallback to built-in users if DB empty or unreachable
      if(!user){
        user=INIT_USERS.find(x=>x.username===u.toLowerCase().trim());
      }
      if(!user||user.password!==p){setErr("Incorrect username or password.");setLoading(false);return;}
      if(!user.active){setErr("Account blocked. Contact your administrator.");setLoading(false);return;}
      onLogin(user);
    }catch(e){setErr("Connection error — check internet.");}
    setLoading(false);
  };
  const navy = THEMES.navy;
  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${navy.bg0} 0%,#0a1628 40%,${navy.bg1} 100%)`,display:"flex",alignItems:"center",justifyContent:"center",padding:20,position:"relative",overflow:"hidden"}}>
      {/* Decorative blobs */}
      <div style={{position:"absolute",top:"10%",left:"5%",width:300,height:300,borderRadius:"50%",background:`${navy.blue}10`,filter:"blur(80px)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:"10%",right:"5%",width:400,height:400,borderRadius:"50%",background:`${navy.indigo}10`,filter:"blur(100px)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:600,height:600,borderRadius:"50%",background:`${navy.teal}06`,filter:"blur(120px)",pointerEvents:"none"}}/>

      <div style={{width:"100%",maxWidth:420,position:"relative",zIndex:1}}>
        {/* Logo + branding */}
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{display:"inline-flex",flexDirection:"column",alignItems:"center",gap:14}}>
            <div style={{width:64,height:64,background:`linear-gradient(135deg,${navy.blue},${navy.indigo})`,borderRadius:18,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Space Grotesk',sans-serif",fontWeight:800,fontSize:28,color:"#fff",boxShadow:`0 8px 32px ${navy.blue}50,0 0 0 1px ${navy.blue}30`}}>G</div>
            <div>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:26,color:"#fff",letterSpacing:"-0.02em",lineHeight:1}}>Sales Team CRM</div>
              <div style={{fontSize:11,color:navy.txt3,letterSpacing:"0.16em",marginTop:5,textTransform:"uppercase"}}>Gremi Personal · Romania</div>
            </div>
          </div>
        </div>

        {/* Glass card */}
        <div style={{background:"rgba(11,21,37,0.7)",border:`1px solid ${navy.border}`,borderRadius:20,padding:32,backdropFilter:"blur(20px)",boxShadow:`0 24px 64px rgba(0,0,0,0.5),0 0 0 1px ${navy.border}`}}>
          <div style={{marginBottom:24}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:22,color:"#fff",marginBottom:4}}>Welcome back</div>
            <div style={{fontSize:13,color:navy.txt3}}>Sign in to your pipeline</div>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div>
              <div style={{fontSize:10,color:navy.txt3,letterSpacing:"0.12em",fontWeight:700,marginBottom:6,textTransform:"uppercase"}}>Username</div>
              <input type="text" value={u} onChange={e=>setU(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()}
                placeholder="username" autoCapitalize="none" autoCorrect="off"
                style={{width:"100%",background:"rgba(255,255,255,0.06)",border:`1.5px solid ${u?navy.blue:navy.border}`,color:"#fff",padding:"12px 14px",fontSize:14,outline:"none",borderRadius:10,fontFamily:"'Inter',sans-serif",transition:"border 0.2s"}}/>
            </div>
            <div>
              <div style={{fontSize:10,color:navy.txt3,letterSpacing:"0.12em",fontWeight:700,marginBottom:6,textTransform:"uppercase"}}>Password</div>
              <input type="password" value={p} onChange={e=>setP(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()}
                placeholder="••••••••"
                style={{width:"100%",background:"rgba(255,255,255,0.06)",border:`1.5px solid ${p?navy.blue:navy.border}`,color:"#fff",padding:"12px 14px",fontSize:14,outline:"none",borderRadius:10,fontFamily:"'Inter',sans-serif",transition:"border 0.2s"}}/>
            </div>

            {err&&(
              <div style={{background:"rgba(224,60,60,0.12)",border:"1px solid rgba(224,60,60,0.3)",color:"#ff6b6b",padding:"11px 14px",borderRadius:9,fontSize:13,display:"flex",alignItems:"center",gap:8}}>
                <span>⚠</span>{err}
              </div>
            )}

            <button className="btn" onClick={go} disabled={loading}
              style={{width:"100%",background:loading?`${navy.border}`:`linear-gradient(135deg,${navy.blue},${navy.indigo})`,color:"#fff",padding:"14px",fontSize:15,borderRadius:11,fontWeight:600,marginTop:4,boxShadow:loading?"":`0 4px 20px ${navy.blue}40`,transition:"all 0.2s",opacity:loading?0.7:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {loading?(
                <><div style={{width:14,height:14,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><span>Signing in...</span></>
              ):(
                <span>Sign In →</span>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{textAlign:"center",marginTop:20,fontSize:11,color:navy.txt3}}>
          Gremi Personal SRL · Antforce SRL · Romania
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ─── CHANGE PASSWORD ─────────────────────────────────────────────
function ChangePwdModal({cur,users,setUsers,setCur,isAdmin,onClose}) {
  const [old_,setOld]=useState(""); const [nw,setNw]=useState(""); const [cf,setCf]=useState("");
  const [tid,setTid]=useState(cur.id); const [msg,setMsg]=useState({t:"",ok:false});
  const save=()=>{
    const tgt=users.find(u=>u.id===tid); if(!tgt)return;
    if(tid===cur.id&&tgt.password!==old_){setMsg({t:"Current password incorrect.",ok:false});return;}
    if(nw.length<4){setMsg({t:"Min 4 characters.",ok:false});return;}
    if(nw!==cf){setMsg({t:"Passwords don't match.",ok:false});return;}
    setUsers(users.map(u=>u.id===tid?{...u,password:nw}:u));
    if(tid===cur.id)setCur({...cur,password:nw});
    setMsg({t:"Password updated!",ok:true}); setTimeout(onClose,1200);
  };
  return(
    <div className="modal" style={{zIndex:300}}>
      <div className="mh"><div style={{fontWeight:700,fontSize:16,color:C.txt}}>Change Password</div><button className="xb" onClick={onClose}>×</button></div>
      <div className="ms">
        {isAdmin&&<div><div className="lbl">USER</div><select value={tid} onChange={e=>setTid(Number(e.target.value))} className="fi">{users.map(u=><option key={u.id} value={u.id}>{u.name}{u.id===cur.id?" (me)":""}</option>)}</select></div>}
        {tid===cur.id&&<div><div className="lbl">CURRENT PASSWORD</div><input type="password" value={old_} onChange={e=>setOld(e.target.value)} className="fi"/></div>}
        <div><div className="lbl">NEW PASSWORD</div><input type="password" value={nw} onChange={e=>setNw(e.target.value)} className="fi"/></div>
        <div><div className="lbl">CONFIRM</div><input type="password" value={cf} onChange={e=>setCf(e.target.value)} className="fi" onKeyDown={e=>e.key==="Enter"&&save()}/></div>
        {msg.t&&<div style={{padding:"11px",borderRadius:8,fontSize:13,background:msg.ok?`${C.green}18`:`${C.red}18`,border:`1px solid ${msg.ok?C.green+"44":C.red+"44"}`,color:msg.ok?C.green:C.red}}>{msg.t}</div>}
      </div>
      <div className="mf"><button className="btn" onClick={save} style={{width:"100%",background:`linear-gradient(135deg,${C.blue},${C.indigo})`,color:"#fff",padding:"13px",fontSize:14,borderRadius:10}}>Save Password</button></div>
    </div>
  );
}

// ─── ADMIN PANEL ─────────────────────────────────────────────────
function EditableList({label,items,setItems,color}) {
  const [adding,setAdding]=useState(false); const [val,setVal]=useState("");
  const add=()=>{if(val.trim()&&!items.includes(val.trim())){setItems([...items,val.trim()]);setVal("");setAdding(false);}};
  const remove=(i)=>{if(confirm("Remove \""+items[i]+"\"?"))setItems(items.filter((_,j)=>j!==i));};
  return(
    <div style={{marginBottom:14}}>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:10,fontWeight:600,color:C.txt3,letterSpacing:"0.08em",marginBottom:6}}>{label}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>
        {items.map((it,i)=>(
          <span key={i} style={{display:"inline-flex",alignItems:"center",gap:4,background:`${color||C.blue}18`,color:color||C.blue,border:`1px solid ${color||C.blue}44`,borderRadius:20,padding:"3px 8px 3px 10px",fontSize:11}}>
            {it}
            <button className="btn" onClick={()=>remove(i)} style={{background:"transparent",color:color||C.blue,fontSize:11,padding:"0 2px",lineHeight:1}}>×</button>
          </span>
        ))}
      </div>
      {adding?(
        <div style={{display:"flex",gap:6}}>
          <input className="fi" style={{flex:1,fontSize:12,padding:"7px 10px"}} value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")add();if(e.key==="Escape"){setAdding(false);setVal("");}}} placeholder="Type and press Enter" autoFocus/>
          <button className="btn" onClick={add} style={{background:`${color||C.blue}22`,color:color||C.blue,padding:"7px 14px",borderRadius:7,border:`1px solid ${color||C.blue}44`,fontSize:12}}>Add</button>
          <button className="btn" onClick={()=>{setAdding(false);setVal("");}} style={{background:C.bg4,color:C.txt3,padding:"7px 10px",borderRadius:7,border:`1px solid ${C.border}`,fontSize:12}}>✕</button>
        </div>
      ):(
        <button className="btn" onClick={()=>setAdding(true)} style={{background:"transparent",color:color||C.blue,padding:"6px 12px",fontSize:11,borderRadius:7,border:`1px dashed ${color||C.blue}44`}}>+ Add {label.toLowerCase()}</button>
      )}
    </div>
  );
}

function AdminPanel({users,setUsers,cur,onClose,services,setServices,entities,setEntities}) {
  const [showAdd,setShowAdd]=useState(false); const [nu,setNu]=useState({name:"",username:"",password:"",role:"user"}); const [err,setErr]=useState("");
  const add=()=>{
    if(!nu.name||!nu.username||!nu.password){setErr("All fields required.");return;}
    if(users.find(u=>u.username===nu.username.toLowerCase())){setErr("Username exists.");return;}
    setUsers([...users,{...nu,id:Date.now(),username:nu.username.toLowerCase(),active:true,protected:false}]);
    setNu({name:"",username:"",password:"",role:"user"});setShowAdd(false);setErr("");
  };
  const toggle=(id)=>{
    const u=users.find(x=>x.id===id); if(u?.protected)return;
    setUsers(users.map(x=>x.id===id?{...x,active:!x.active}:x));
  };
  return(
    <div className="modal" style={{zIndex:250}}>
      <div className="mh"><div style={{fontWeight:700,fontSize:16,color:C.txt}}>Admin Panel</div><button className="xb" onClick={onClose}>×</button></div>
      <div className="ms">
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:11,color:C.txt3,letterSpacing:"0.1em"}}>USERS</div>
        {users.map(u=>(
          <div key={u.id} style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:9,background:`linear-gradient(135deg,${C.blue},${C.indigo})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,color:"#fff",flexShrink:0}}>{u.name[0]}</div>
            <div style={{flex:1}}><div style={{fontSize:13,color:C.txt,fontWeight:500}}>{u.name} <span style={{fontSize:10,color:u.role==="admin"?C.purple:u.role==="team_lead"?C.amber:C.txt3}}>{u.role==="admin"?"ADMIN":u.role==="team_lead"?"TL":"USER"}</span></div><div style={{fontSize:11,color:C.txt3}}>@{u.username}</div></div>
            {!u.protected&&<button className="btn" onClick={()=>toggle(u.id)} style={{background:u.active?`${C.green}18`:`${C.red}18`,color:u.active?C.green:C.red,padding:"5px 10px",fontSize:11,borderRadius:7,border:`1px solid ${u.active?C.green+"44":C.red+"44"}`}}>{u.active?"Active":"Blocked"}</button>}
            {u.protected&&<span style={{fontSize:10,color:C.txt3,padding:"5px 10px",border:`1px solid ${C.border}`,borderRadius:7}}>Protected</span>}
          </div>
        ))}
        {showAdd?(
          <div style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,padding:12,display:"flex",flexDirection:"column",gap:10}}>
            {[["NAME","name","text"],["USERNAME","username","text"],["PASSWORD","password","password"]].map(([l,k,t])=>(
              <div key={k}><div className="lbl">{l}</div><input type={t} value={nu[k]} onChange={e=>setNu({...nu,[k]:e.target.value})} className="fi"/></div>
            ))}
            <div><div className="lbl">ROLE</div><select value={nu.role} onChange={e=>setNu({...nu,role:e.target.value})} className="fi"><option value="user">User</option><option value="team_lead">Team Leader</option><option value="admin">Admin</option></select></div>
            {err&&<div style={{padding:"9px",borderRadius:7,fontSize:12,background:`${C.red}18`,border:`1px solid ${C.red}44`,color:C.red}}>{err}</div>}
            <div style={{display:"flex",gap:8}}>
              <button className="btn" onClick={add} style={{flex:1,background:`linear-gradient(135deg,${C.green},${C.teal})`,color:"#fff",borderRadius:8,padding:"10px",fontSize:12}}>Add User</button>
              <button className="btn" onClick={()=>{setShowAdd(false);setErr("");}} style={{flex:1,background:C.bg4,color:C.txt2,borderRadius:8,padding:"10px",fontSize:12,border:`1px solid ${C.border}`}}>Cancel</button>
            </div>
          </div>
        ):(
          <button className="btn" onClick={()=>setShowAdd(true)} style={{width:"100%",background:"transparent",color:C.blue,padding:"13px",fontSize:12,border:`2px dashed ${C.border2}`,borderRadius:10}}>+ Add New User</button>
        )}
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:12}}>
          <EditableList label="SERVICES" items={services} setItems={setServices} color={C.blue}/>
          <EditableList label="ENTITIES" items={entities} setItems={setEntities} color={C.teal}/>
        </div>
      </div>
    </div>
  );
}


// ─── TODAY SCREEN ────────────────────────────────────────────────
function TodayTab({locs, hqs, users, cur, onSelectLoc, isAdmin, isTeamLead}) {
  const [summary,setSummary] = useState("");
  const [summaryLoading,setSummaryLoading] = useState(false);
  const today = new Date();
  const fmtDateShort = d => { if(!d) return null; try { return new Date(d).toLocaleDateString("en-GB",{weekday:"short",day:"2-digit",month:"short"}); } catch(e){ return null; }};
  const uN = id => users.find(u=>u.id===id)?.name||"—";

  const myLocs = (isAdmin||isTeamLead) ? locs : locs.filter(l=>l.salesId===cur.id);
  const active = myLocs.filter(l=>!["Closed Won","Closed Lost"].includes(l.stage));

  const overdue = active.filter(l=>l.nextStepDate&&new Date(l.nextStepDate)<today);
  const noContact7 = active.filter(l=>{
    if(!l.lastContact) return true;
    const d = Math.ceil((today-new Date(l.lastContact))/86400000);
    return d>7 && !overdue.find(o=>o.id===l.id);
  });
  const meetingsToday = active.filter(l=>{
    if(!l.nextStepDate) return false;
    const diff = Math.abs(Math.ceil((new Date(l.nextStepDate)-today)/86400000));
    return diff<=1 && l.stage==="Meeting Scheduled";
  });
  const hotNoStep = active.filter(l=>l.temp==="🔥 Hot"&&!l.nextStep&&!overdue.find(o=>o.id===l.id));
  const newUnqualified = active.filter(l=>l.stage==="New"&&!l.contact);

  const loadSummary = async () => {
    setSummaryLoading(true);
    const ctx = `Pipeline summary for ${cur.name}:
Overdue follow-ups: ${overdue.length} ${overdue.slice(0,3).map(l=>`${l.company} — ${l.location} (${l.workers||"?"} workers, stage: ${l.stage})`).join("; ")}
Meetings today/tomorrow: ${meetingsToday.length} ${meetingsToday.map(l=>`${l.company} — ${l.location}`).join("; ")}
Hot deals without next step: ${hotNoStep.length}
No contact >7 days: ${noContact7.length}
New unqualified leads: ${newUnqualified.length}
Top deals by workers: ${active.filter(l=>parseInt(l.workers)>0).sort((a,b)=>(parseInt(b.workers)||0)-(parseInt(a.workers)||0)).slice(0,3).map(l=>`${l.company} ${l.workers}w ${l.stage}`).join("; ")}`;
    const text = await aiCall(
      "You are a sales AI for Gremi Personal Romania. Write a brief 2-3 sentence morning briefing for the BD director. Be direct, specific, mention the highest-priority deal by name. Include a recommendation. No fluff.",
      ctx, 400
    );
    setSummary(text);
    setSummaryLoading(false);
  };

  useEffect(() => { loadSummary(); }, []);

  const ActionCard = ({icon, title, color, items, emptyMsg}) => {
    if(items.length===0 && emptyMsg) return (
      <div style={{background:`${color}08`,border:`1px solid ${color}22`,borderLeft:`3px solid ${color}`,borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:16}}>{icon}</span>
        <span style={{fontSize:12,color:C.txt3}}>{emptyMsg}</span>
      </div>
    );
    if(items.length===0) return null;
    return (
      <div style={{background:C.bg2,border:`1px solid ${color}33`,borderLeft:`3px solid ${color}`,borderRadius:10,overflow:"hidden"}}>
        <div style={{padding:"9px 14px",background:`${color}10`,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14}}>{icon}</span>
          <span style={{fontSize:11,fontWeight:700,color:color,letterSpacing:"0.06em"}}>{title.toUpperCase()}</span>
          <span style={{marginLeft:"auto",background:`${color}22`,color:color,borderRadius:20,padding:"1px 8px",fontSize:11,fontWeight:700}}>{items.length}</span>
        </div>
        {items.map((l,i)=>{
          const h = calcHealth(l);
          const sc = getSC()[l.stage]||C.txt3;
          return(
            <div key={l.id} className="row-hover" onClick={()=>onSelectLoc(l)}
              style={{padding:"10px 14px",borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10}}>
              <HealthDot loc={l} size={7}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:13,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.company}</div>
                <div style={{fontSize:11,color:C.txt3,marginTop:1}}>📍 {l.location} {l.workers?`· 👷${l.workers}`:""}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,flexShrink:0}}>
                <span className="pill" style={{background:sc+"22",color:sc,border:`1px solid ${sc}44`}}>{l.stage}</span>
                {l.nextStepDate&&<span style={{fontSize:9,color:isOD(l.nextStepDate,l.stage)?C.red:C.txt3}}>{fmtDate(l.nextStepDate)}</span>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{flex:1,overflowY:"auto",padding:12,paddingBottom:72,display:"flex",flexDirection:"column",gap:10}}>
      {/* AI Summary Card */}
      <div style={{background:`linear-gradient(135deg,${C.bg2},${C.bg3})`,border:`1px solid ${C.teal}44`,borderRadius:12,padding:14}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:summaryLoading||summary?10:0}}>
          <div style={{width:26,height:26,borderRadius:7,background:`linear-gradient(135deg,${C.blue},${C.teal})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>🤖</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:11,fontWeight:700,color:C.teal,letterSpacing:"0.06em"}}>AI MORNING BRIEF</div>
            <div style={{fontSize:10,color:C.txt3}}>{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"2-digit",month:"long"})}</div>
          </div>
          <button className="btn" onClick={loadSummary} disabled={summaryLoading}
            style={{background:`${C.teal}18`,color:C.teal,padding:"5px 10px",fontSize:10,borderRadius:6,border:`1px solid ${C.teal}33`}}>
            {summaryLoading?"...":"↻"}
          </button>
        </div>
        {summaryLoading&&(
          <div style={{display:"flex",gap:4,padding:"4px 0"}}>
            {[0,0.2,0.4].map((d,i)=><span key={i} style={{width:6,height:6,background:C.teal,borderRadius:"50%",animation:`pulse 1s infinite ${d}s`}}/>)}
          </div>
        )}
        {summary&&!summaryLoading&&(
          <div style={{fontSize:13,color:C.txt2,lineHeight:1.7}}>{summary}</div>
        )}
      </div>

      {/* Quick Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
        {[
          [overdue.length,"Overdue",C.red,"⚠"],
          [meetingsToday.length,"Meetings",C.amber,"📅"],
          [hotNoStep.length,"Hot / No Step",C.orange,"🔥"],
        ].map(([v,l,c,icon])=>(
          <div key={l} style={{background:C.bg2,border:`1px solid ${v>0?c+"44":C.border}`,borderTop:`3px solid ${v>0?c:C.border2}`,padding:"10px",textAlign:"center",borderRadius:10}}>
            <div style={{fontSize:20,fontWeight:700,color:v>0?c:C.txt3,fontFamily:"'Space Grotesk',sans-serif"}}>{v}</div>
            <div style={{fontSize:9,color:C.txt3,marginTop:2}}>{l.toUpperCase()}</div>
          </div>
        ))}
      </div>

      <ActionCard icon="⚠" title="Overdue Follow-ups" color={C.red} items={overdue}/>
      <ActionCard icon="📅" title="Meetings Today/Tomorrow" color={C.amber} items={meetingsToday}/>
      <ActionCard icon="🔥" title="Hot Deals — No Next Step" color={C.orange} items={hotNoStep}/>
      <ActionCard icon="📭" title="No Contact > 7 days" color={C.blue} items={noContact7}/>
      <ActionCard icon="🆕" title="New Unqualified Leads" color={C.teal} items={newUnqualified}/>

      {overdue.length===0&&meetingsToday.length===0&&hotNoStep.length===0&&(
        <div style={{padding:40,textAlign:"center",color:C.green,fontSize:14}}>
          ✅ Pipeline is clean — no urgent actions
        </div>
      )}
    </div>
  );
}


// ─── CONVERSATIONAL LEAD INPUT ───────────────────────────────────
function ConversationalLeadInput({hqs, locs, users, curId, services, entities, onCreated, forceOpen=false}) {
  const [open, setOpen] = useState(forceOpen);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const taRef = useRef(null);

  const parse = async () => {
    if(!text.trim()) return;
    setLoading(true);
    const sys = `You are a CRM parser for Gremi Personal Romania, a staffing company placing foreign workers in Romanian factories.
Extract lead data from free text (may be in Polish, Romanian, English, Russian) and return ONLY a JSON object.

JSON fields:
{
  "hq_company": "company name",
  "hq_industry": "one of: Auto Parts,Textile,Food Production,Metal Fabrication,Electronics,Logistics,Construction,Pharma,Retail,Agriculture,Other",
  "hq_address": "company address",
  "hq_website": "",
  "hq_central_contact": "decision maker name",
  "hq_central_role": "HR Director / Plant Manager / etc",
  "hq_central_phone": "",
  "hq_central_email": "",
  "hq_employees": "total employee count as number string",
  "hq_annual_turnover": "annual revenue as number string in RON",
  "hq_seasonality": "seasonal pattern if mentioned",
  "hq_intelligence": "everything you know about the company",
  "loc_location": "city/location name",
  "loc_address": "full address",
  "loc_county": "Romanian county name",
  "loc_workers": "number of workers needed",
  "loc_worker_type": "one of: UA Ukrainian, Asian, MD Moldovan, UA+Asian Mix, Other",
  "loc_service": "one of: Outsourcing, Leasing, Permanent Recruitment",
  "loc_contact": "local contact person name if different from HQ",
  "loc_role": "local contact role",
  "loc_phone": "",
  "loc_notes": "anything that does not fit above fields",
  "existing_hq_id": null
}
Return ONLY valid JSON, no explanation.`;
    const raw = await aiCall(sys, text, 800);
    try {
      const clean = raw.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);
      // Check if company already exists
      const existing = hqs.find(h=>h.company.toLowerCase()===parsed.hq_company?.toLowerCase());
      const hqData = existing ? {...existing} : {
        ...EMPTY_HQ,
        company:parsed.hq_company||"",
        industry:parsed.hq_industry||"",
        address:parsed.hq_address||"",
        website:parsed.hq_website||"",
        centralContact:parsed.hq_central_contact||"",
        centralRole:parsed.hq_central_role||"",
        centralPhone:parsed.hq_central_phone||"",
        centralEmail:parsed.hq_central_email||"",
        employees:parsed.hq_employees||"",
        annualTurnover:parsed.hq_annual_turnover||"",
        seasonality:parsed.hq_seasonality||"",
        intelligence:parsed.hq_intelligence||"",
      };
      const locData = {
        ...EMPTY_LOC,
        company:parsed.hq_company||hqData.company||"",
        location:parsed.loc_location||parsed.hq_company||"",
        address:parsed.loc_address||"",
        county:parsed.loc_county||"",
        workers:parsed.loc_workers||"",
        workerType:parsed.loc_worker_type||"",
        service:parsed.loc_service||"Outsourcing",
        companyName:entities[0]||"Gremi Personal SRL",
        contact:parsed.loc_contact||parsed.hq_central_contact||"",
        role:parsed.loc_role||parsed.hq_central_role||"",
        phone:parsed.loc_phone||parsed.hq_central_phone||"",
        notes:parsed.loc_notes||"",
        salesId:curId,
        stage:"New",
        temp:"❄️ Cold",
        existingHqId:existing?.id||null,
        isExistingHq:!!existing,
      };
      setPreview({hq:hqData, loc:locData});
    } catch(e) {
      setPreview({error:"Could not parse. Please try again or create manually."});
    }
    setLoading(false);
  };

  const handleCreate = () => {
    if(preview && !preview.error) onCreated(preview);
  };

  if(!open) return null; // rendered as button in leads header instead

  return (
    <div style={{borderBottom:`2px solid ${C.teal}`,background:C.bg0,flexShrink:0}}>
      <div style={{padding:"10px 12px",display:"flex",gap:8,alignItems:"flex-end"}}>
        <div style={{flex:1}}>
          <div style={{fontSize:10,color:C.teal,fontWeight:700,letterSpacing:"0.08em",marginBottom:6}}>🤖 CONVERSATIONAL LEAD CREATION</div>
          <textarea ref={taRef} value={text} onChange={e=>setText(e.target.value)}
            rows={3} placeholder="Paste Termene.ro data, LinkedIn profile, or write naturally in any language:&#10;'Nowy lead: Ice Dyp Balas, Carpinis Timis, food production, 200 ludzi, rozmawiałem z HR Maria Ionescu +40721000001'"
            style={{width:"100%",background:C.bg4,border:`1.5px solid ${C.teal}44`,color:C.txt,borderRadius:8,padding:"10px 12px",fontSize:12,fontFamily:"'Inter',sans-serif",resize:"none",lineHeight:1.5,outline:"none"}}/>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          <button className="btn" onClick={parse} disabled={loading||!text.trim()}
            style={{background:loading||!text.trim()?C.bg4:`linear-gradient(135deg,${C.teal},${C.blue})`,color:loading||!text.trim()?C.txt3:"#fff",padding:"10px 14px",fontSize:12,borderRadius:8}}>
            {loading?"Parsing...":"→ Parse"}
          </button>
          <button className="btn" onClick={()=>{setOpen(false);setPreview(null);setText("");}}
            style={{background:"transparent",color:C.txt3,padding:"6px 10px",fontSize:11,borderRadius:7,border:`1px solid ${C.border}`}}>Cancel</button>
        </div>
      </div>

      {preview && !preview.error && (
        <div className="anim-in" style={{borderTop:`1px solid ${C.border}`,padding:"12px",display:"flex",flexDirection:"column",gap:8}}>
          <div style={{fontSize:10,fontWeight:700,color:C.teal,letterSpacing:"0.08em"}}>AI PARSED RESULT — REVIEW BEFORE CREATING</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div style={{background:preview.hq.isExistingHq?`${C.amber}10`:C.bg2,border:`1px solid ${preview.hq.isExistingHq?C.amber+"44":C.border}`,borderRadius:9,padding:10}}>
              <div style={{fontSize:10,fontWeight:700,color:preview.hq.isExistingHq?C.amber:C.indigo,marginBottom:6}}>{preview.hq.isExistingHq?"🏢 EXISTING COMPANY":"🏢 NEW COMPANY"}</div>
              {[["Company",preview.loc.company],["Industry",preview.hq.industry],["Contact",preview.hq.centralContact],["Role",preview.hq.centralRole],["Phone",preview.hq.centralPhone],["Employees",preview.hq.employees],["Turnover",preview.hq.annualTurnover]].filter(([,v])=>v).map(([l,v])=>(
                <div key={l} style={{fontSize:11,color:C.txt2,marginBottom:2}}><span style={{color:C.txt3,fontSize:10}}>{l}: </span>{v}</div>
              ))}
            </div>
            <div style={{background:C.bg2,border:`1px solid ${C.teal}33`,borderRadius:9,padding:10}}>
              <div style={{fontSize:10,fontWeight:700,color:C.teal,marginBottom:6}}>📍 NEW DEAL/LOCATION</div>
              {[["Location",preview.loc.location],["County",preview.loc.county],["Workers",preview.loc.workers],["Type",preview.loc.workerType],["Service",preview.loc.service],["Contact",preview.loc.contact]].filter(([,v])=>v).map(([l,v])=>(
                <div key={l} style={{fontSize:11,color:C.txt2,marginBottom:2}}><span style={{color:C.txt3,fontSize:10}}>{l}: </span>{v}</div>
              ))}
              {preview.loc.notes&&<div style={{fontSize:11,color:C.txt3,marginTop:4,fontStyle:"italic"}}>{preview.loc.notes.substring(0,80)}</div>}
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn" onClick={handleCreate}
              style={{flex:1,background:`linear-gradient(135deg,${C.green},${C.teal})`,color:"#fff",padding:"11px",fontSize:13,borderRadius:9}}>
              ✅ Create Lead
            </button>
            <button className="btn" onClick={()=>setPreview(null)}
              style={{background:C.bg3,color:C.txt3,padding:"11px 14px",fontSize:12,borderRadius:9,border:`1px solid ${C.border}`}}>✕ Discard</button>
          </div>
        </div>
      )}
      {preview?.error&&(
        <div style={{padding:"10px 12px",borderTop:`1px solid ${C.border}`,color:C.red,fontSize:12}}>{preview.error}</div>
      )}
    </div>
  );
}


// ─── QUICK SCRIPT MODAL ──────────────────────────────────────────
function QuickScriptModal({loc, hq, onClose}) {
  const SCRIPT_TYPES = [
    {id:"cold_call",   label:"📞 Cold Call",     icon:"📞", desc:"First call to this prospect"},
    {id:"followup",    label:"📧 Follow-up",     icon:"📧", desc:"After no response"},
    {id:"discovery",   label:"🔍 Discovery",     icon:"🔍", desc:"Qualifying call script"},
    {id:"proposal",    label:"📄 Proposal",      icon:"📄", desc:"Walk through the offer"},
    {id:"objection",   label:"⚡ Objection",     icon:"⚡", desc:"Handle pushback"},
    {id:"closing",     label:"🤝 Closing",       icon:"🤝", desc:"Move toward signature"},
    {id:"linkedin",    label:"🔗 LinkedIn",      icon:"🔗", desc:"First LinkedIn message"},
    {id:"breakup",     label:"👋 Breakup",       icon:"👋", desc:"After 3+ attempts, no reply"},
  ];

  const [selType, setSelType] = useState("cold_call");
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const buildContext = () => {
    const spin = loc.spin || {};
    const activities = (loc.activities||[]).slice(0,3);
    return `
CLIENT: ${loc.company}${loc.location&&loc.location!==loc.company?" / "+loc.location:""}
Contact: ${loc.contact||"unknown"} (${loc.role||"?"})
Stage: ${loc.stage} | Temperature: ${loc.temp} | Pain Score: ${loc.painScore||"?"}/5
Workers needed: ${loc.workers||"?"} ${loc.workerType||""}
Service: ${loc.service||"?"}
County: ${loc.county||"?"}

SPIN DATA:
S (Situation): ${spin.s||"not filled"}
P (Problem): ${spin.p||"not filled"}
I (Implication): ${spin.i||"not filled"}
N (Need-Payoff): ${spin.n||"not filled"}
Pain Summary: ${loc.painSummary||loc.painScore||"not filled"}
Current Supplier: ${loc.currentSupplier||"none known"}

COMPANY INTEL: ${hq?.intelligence?.substring(0,300)||"none"}
Employees: ${hq?.employees||"?"} | Industry: ${hq?.industry||"?"}

LAST ACTIVITIES:
${activities.length?activities.map(a=>`[${a.date}] ${a.type}: ${a.note?.substring(0,80)||""}`).join("\n"):"No activity yet"}

Next Step: ${loc.nextStep||"none"} by ${loc.nextStepDate||"?"}
Last Contact: ${loc.lastContact||"never"}`;
  };

  const PROMPTS = {
    cold_call: `Write a cold call script for a staffing salesperson at Gremi Personal Romania.
Apply: Challenger Sale opener (specific observation about their business, not pitch), Voss (no "is this a bad time?"), SPIN opening questions.
Format: 3 short sections — Opening (3 sentences), First Questions (3 SPIN-S/P questions), If They Engage (how to advance). Keep it conversational, in Romanian. Under 200 words total.`,

    followup: `Write a follow-up call/email script for Gremi Personal Romania salesperson.
They have had previous contact but no response for 5+ days.
Apply: Challenger (bring new insight, not "just checking in"), Voss (invite safe no: "if this isn't relevant anymore, just let me know").
Format: Opening (acknowledge gap), Value Add (one specific insight for their industry), Next Step ask. Under 150 words.`,

    discovery: `Write a discovery call script for Gremi Personal Romania.
The prospect is "Interested" — this is a qualifying call, not a pitch.
Apply: SPIN structure (Situation → Problem → Implication → Need-Payoff), Challenger reframe opener.
Format: 4 sections matching SPIN stages. For each: 2-3 specific questions tailored to their industry/situation. Under 250 words.`,

    proposal: `Write a proposal walkthrough script for Gremi Personal Romania salesperson.
They are calling to walk the client through a proposal already sent.
Apply: Nagle EVC (show cost of their alternative), Voss "That's Right" summary before closing, Challenger "Take Control" for next step.
Format: Opening (pain summary back to them), Value (EVC point), Solution summary, Next Step. Under 200 words.`,

    objection: `Write objection handling scripts for Gremi Personal Romania.
Focus on the most likely objections based on their stage and SPIN data.
Apply: Voss (label → calibrated question → respond), Nagle (defend value not price), Challenger (reframe).
Format: 2-3 likely objections for this specific client, each with: Label, Question, Response. Under 300 words.`,

    closing: `Write a closing call script for Gremi Personal Romania salesperson.
The deal is at negotiation/closing stage.
Apply: Voss "That's Right" check before closing, Assumptive Close, Summary Close, escalation if needed.
Format: Pain Summary (get "that's right"), Assumptive Close attempt, If Resistance (2 alternatives), Escalation option. Under 200 words.`,

    linkedin: `Write a LinkedIn first message for Gremi Personal Romania.
Apply: Challenger (hook = specific observation about them, insight = something useful, one question — no pitch), Voss (no pressure).
Format: Single message max 5 sentences. No company pitch in first message. One question at end. In Romanian or English based on context.`,

    breakup: `Write a professional breakup message for Gremi Personal Romania.
After 3+ contact attempts with no response.
Apply: Voss (give permission to say no — creates response), Grove (respect their time).
Format: 3 sentences max. Acknowledge attempts, close file, leave door open. Zero passive-aggression. In Romanian.`,
  };

  const generate = async () => {
    setLoading(true); setScript(""); setCopied(false);
    const sysPrompt = `You are an expert B2B sales script writer for Gremi Personal Romania, a staffing company placing Ukrainian and Asian workers in Romanian manufacturing factories. You write scripts that sound natural and professional, not robotic. Every script must be personalized to the specific client context provided.`;
    const userPrompt = `${PROMPTS[selType]}\n\nCLIENT CONTEXT:\n${buildContext()}\n\nWrite the script now. Use the client's actual name, company, pain points, and SPIN data wherever possible. Make it feel custom-written for this specific client, not generic.`;
    try {
      const res = await fetch(AI_PROXY, {
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${SB_KEY}`},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,system:sysPrompt,messages:[{role:"user",content:userPrompt}]})
      });
      const d = await res.json();
      setScript(d.content?.[0]?.text || "Error generating script.");
    } catch(e) { setScript("Connection error: "+e.message); }
    setLoading(false);
  };

  useEffect(() => { generate(); }, [selType]);

  const copy = () => {
    navigator.clipboard.writeText(script).then(() => { setCopied(true); setTimeout(()=>setCopied(false),2000); });
  };

  return (
    <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="sheet" style={{maxHeight:"90vh"}}>
        {/* Header */}
        <div style={{padding:"13px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <div style={{width:28,height:28,borderRadius:8,background:`linear-gradient(135deg,${C.amber},${C.orange})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>📋</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:14,color:C.txt}}>Quick Script</div>
            <div style={{fontSize:11,color:C.txt3}}>{loc.company}{loc.location&&loc.location!==loc.company?" · "+loc.location:""} · {loc.stage}</div>
          </div>
          <button className="xb" onClick={onClose}>×</button>
        </div>

        {/* Script type selector */}
        <div style={{padding:"10px 12px",borderBottom:`1px solid ${C.border}`,display:"flex",gap:6,flexWrap:"wrap",flexShrink:0,background:C.bg0}}>
          {SCRIPT_TYPES.map(t=>(
            <button key={t.id} className="btn" onClick={()=>setSelType(t.id)}
              style={{padding:"6px 12px",fontSize:11,borderRadius:8,
                background:selType===t.id?`${C.amber}22`:C.bg3,
                color:selType===t.id?C.amber:C.txt3,
                border:`1.5px solid ${selType===t.id?C.amber:C.border}`}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Script content */}
        <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>
          {/* SPIN context pill row */}
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {[
              {label:"Stage",val:loc.stage,c:C.blue},
              {label:"Pain",val:loc.painScore?`${loc.painScore}/5`:"?",c:loc.painScore>=4?C.red:loc.painScore>=3?C.amber:C.txt3},
              {label:"Workers",val:loc.workers||"?",c:C.amber},
              {label:"Supplier",val:loc.currentSupplier||"none",c:C.orange},
            ].map(({label,val,c})=>(
              <div key={label} style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:6,padding:"3px 9px",fontSize:11}}>
                <span style={{color:C.txt3}}>{label}: </span><span style={{color:c,fontWeight:600}}>{val}</span>
              </div>
            ))}
            {(loc.spin?.p) && (
              <div style={{width:"100%",background:`${C.indigo}10`,border:`1px solid ${C.indigo}22`,borderRadius:6,padding:"5px 9px",fontSize:11,color:C.indigo}}>
                <span style={{fontWeight:600}}>Pain: </span>{loc.spin.p.substring(0,100)}{loc.spin.p.length>100?"...":""}
              </div>
            )}
          </div>

          {/* Generated script */}
          {loading ? (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,padding:32}}>
              <div style={{display:"flex",gap:5}}>{[0,.2,.4].map((d,i)=><span key={i} style={{width:8,height:8,background:C.amber,borderRadius:"50%",animation:`pulse 1s infinite ${d}s`}}/>)}</div>
              <div style={{fontSize:12,color:C.txt3}}>Generating script for {loc.company}...</div>
            </div>
          ) : script ? (
            <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:14}}>
              <pre style={{fontFamily:"'Inter',sans-serif",fontSize:13,color:C.txt,lineHeight:1.85,whiteSpace:"pre-wrap",wordBreak:"break-word",margin:0}}>{script}</pre>
            </div>
          ) : null}
        </div>

        {/* Footer actions */}
        <div style={{padding:"12px 14px",borderTop:`1px solid ${C.border}`,display:"flex",gap:8,flexShrink:0}}>
          <button className="btn" onClick={generate} disabled={loading}
            style={{background:`${C.amber}18`,color:C.amber,padding:"11px 16px",fontSize:13,borderRadius:9,border:`1px solid ${C.amber}44`}}>
            {loading?"...":"↻ Regenerate"}
          </button>
          <button className="btn" onClick={copy} disabled={!script||loading}
            style={{flex:1,background:copied?`${C.green}22`:`linear-gradient(135deg,${C.amber},${C.orange})`,color:copied?C.green:"#fff",padding:"11px",fontSize:14,borderRadius:9,border:copied?`1px solid ${C.green}44`:"none",fontWeight:600}}>
            {copied?"✓ Copied!":"📋 Copy Script"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── POST-CALL DEBRIEF MODAL ─────────────────────────────────────
function PostCallDebrief({loc, hq, onClose, onApply}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  const analyze = async () => {
    if(!text.trim()) return;
    setLoading(true);
    const sys = `You are a CRM AI for Gremi Personal Romania. Analyze a post-call note and suggest CRM field updates.
Return ONLY a JSON object with these possible keys (omit fields you cannot determine):
{
  "spin_s": "situation facts from call",
  "spin_p": "problems/pain discovered",
  "spin_i": "implications of the problem",
  "spin_n": "need-payoff / value of solving",
  "pain_summary": "one sentence pain summary",
  "pain_score": 1-5 number,
  "workers": "number as string",
  "current_supplier": "name",
  "next_step": "specific action",
  "next_step_date": "YYYY-MM-DD within next 14 days",
  "decision_criteria": "what matters to them",
  "economic_buyer": "who holds budget",
  "champion": "internal ally",
  "activity_note": "brief log entry describing what happened",
  "stage_suggestion": "one of: New,Contacted,Interested,Meeting Scheduled,Meeting Done,Proposal Sent,Negotiation,Closed Won,Closed Lost,No Answer"
}
Return ONLY valid JSON.`;
    const ctx = `Current deal: ${loc.company} — ${loc.location}
Stage: ${loc.stage}, Workers: ${loc.workers||"?"}
SPIN-P: ${loc.spin?.p||"empty"}
Pain Score: ${loc.painScore||"?"}
Call note: ${text}`;
    const raw = await aiCall(sys, ctx, 700);
    try {
      const clean = raw.replace(/```json|```/g,"").trim();
      setSuggestions(JSON.parse(clean));
    } catch(e) {
      setSuggestions({_error:"Parse error — try rewording the note."});
    }
    setLoading(false);
  };

  const apply = () => {
    if(!suggestions || suggestions._error) return;
    const patch = {};
    const spin = {...(loc.spin||{})};
    let spinChanged = false;
    if(suggestions.spin_s){spin.s=suggestions.spin_s;spinChanged=true;}
    if(suggestions.spin_p){spin.p=suggestions.spin_p;spinChanged=true;}
    if(suggestions.spin_i){spin.i=suggestions.spin_i;spinChanged=true;}
    if(suggestions.spin_n){spin.n=suggestions.spin_n;spinChanged=true;}
    if(suggestions.pain_summary){spin.painSummary=suggestions.pain_summary;spinChanged=true;}
    if(spinChanged) patch.spin=spin;
    if(suggestions.pain_score) patch.painScore=parseInt(suggestions.pain_score);
    if(suggestions.workers) patch.workers=String(suggestions.workers);
    if(suggestions.current_supplier) patch.currentSupplier=suggestions.current_supplier;
    if(suggestions.next_step) patch.nextStep=suggestions.next_step;
    if(suggestions.next_step_date) patch.nextStepDate=suggestions.next_step_date;
    if(suggestions.decision_criteria) patch.decisionCriteria=suggestions.decision_criteria;
    if(suggestions.economic_buyer) patch.economicBuyer=suggestions.economic_buyer;
    if(suggestions.champion) patch.champion=suggestions.champion;
    // Add activity log entry
    const act = {
      id:Date.now(), type:"Call",
      note:text.trim()+(suggestions.activity_note?"\n\n[AI Summary] "+suggestions.activity_note:""),
      date:new Date().toISOString().slice(0,10),
      time:new Date().toTimeString().slice(0,5)
    };
    patch.activities = [act,...(loc.activities||[])];
    patch.lastContact = act.date;
    if(suggestions.stage_suggestion && suggestions.stage_suggestion !== loc.stage) {
      patch.stage = suggestions.stage_suggestion;
    }
    onApply(loc.id, patch);
    onClose();
  };

  const labelMap = {spin_s:"SPIN-S (Situation)",spin_p:"SPIN-P (Problem)",spin_i:"SPIN-I (Implication)",spin_n:"SPIN-N (Need-Payoff)",pain_summary:"Pain Summary",pain_score:"Pain Score",workers:"Workers Needed",current_supplier:"Current Supplier",next_step:"Next Step",next_step_date:"Next Step Date",decision_criteria:"Decision Criteria",economic_buyer:"Economic Buyer",champion:"Champion",stage_suggestion:"Stage Update",activity_note:"Activity Log Entry"};

  return(
    <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="sheet" style={{maxHeight:"85vh"}}>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <div style={{width:28,height:28,borderRadius:7,background:`linear-gradient(135deg,${C.blue},${C.teal})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>📞</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:14,color:C.txt}}>Post-Call Debrief</div>
            <div style={{fontSize:11,color:C.txt3}}>{loc.company} — {loc.location}</div>
          </div>
          <button className="xb" onClick={onClose}>×</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
          <div>
            <div style={{fontSize:11,color:C.txt3,marginBottom:6}}>What happened on the call? Write naturally in any language:</div>
            <textarea value={text} onChange={e=>setText(e.target.value)} rows={5}
              placeholder="e.g. 'Rozmawiałem z Marią, mają problem z sezonem, potrzebują 25 ludzi do maja, obecny dostawca Lugera nie daje rady, chce ofertę do piątku'"
              style={{width:"100%",background:C.bg4,border:`1.5px solid ${C.border}`,color:C.txt,borderRadius:8,padding:"10px 12px",fontSize:13,fontFamily:"'Inter',sans-serif",resize:"none",lineHeight:1.6,outline:"none"}}/>
          </div>

          <button className="btn" onClick={analyze} disabled={loading||!text.trim()}
            style={{width:"100%",background:loading||!text.trim()?C.bg4:`linear-gradient(135deg,${C.blue},${C.indigo})`,color:loading||!text.trim()?C.txt3:"#fff",padding:"12px",fontSize:13,borderRadius:9}}>
            {loading?"🤖 Analyzing...":"🤖 Analyze & Extract Fields"}
          </button>

          {suggestions && !suggestions._error && (
            <div className="anim-in" style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontSize:10,fontWeight:700,color:C.teal,letterSpacing:"0.08em"}}>SUGGESTED CRM UPDATES</div>
              {Object.entries(suggestions).filter(([k])=>!k.startsWith("_")&&suggestions[k]).map(([k,v])=>(
                <div key={k} style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",display:"flex",gap:8,alignItems:"flex-start"}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.teal,flexShrink:0,minWidth:100,paddingTop:1}}>{labelMap[k]||k}</div>
                  <div style={{fontSize:12,color:C.txt2,lineHeight:1.5}}>{String(v)}</div>
                </div>
              ))}
            </div>
          )}
          {suggestions?._error&&<div style={{color:C.red,fontSize:12,padding:"8px 12px",background:`${C.red}10`,borderRadius:8}}>{suggestions._error}</div>}
        </div>

        <div style={{padding:"12px 14px",borderTop:`1px solid ${C.border}`,display:"flex",gap:8,flexShrink:0}}>
          {suggestions&&!suggestions._error&&(
            <button className="btn" onClick={apply} style={{flex:1,background:`linear-gradient(135deg,${C.green},${C.teal})`,color:"#fff",padding:"12px",fontSize:14,borderRadius:9}}>
              ✅ Apply to CRM
            </button>
          )}
          <button className="btn" onClick={onClose} style={{background:C.bg3,color:C.txt3,padding:"12px 16px",fontSize:13,borderRadius:9,border:`1px solid ${C.border}`}}>
            {suggestions?"✕ Discard":"Close"}
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── QUICK EMAIL DRAFT ───────────────────────────────────────────
function EmailDraftModal({loc, hq, onClose}) {
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { generate(); }, []);

  const generate = async () => {
    setLoading(true); setDraft(""); setCopied(false);
    const acts = (loc.activities||[]).slice(0,5).map(a=>`${a.date} ${a.type}: ${a.note}`).join("\n");
    const ctx = `Company: ${loc.company}
Location: ${loc.location}, ${loc.county}
Contact: ${loc.contact||"?"} — ${loc.role||"?"}
Stage: ${loc.stage}
Workers needed: ${loc.workers||"?"}, Type: ${loc.workerType||"?"}
Pain Score: ${loc.painScore||"?"}
SPIN-P: ${loc.spin?.p||"?"}
Pain Summary: ${loc.spin?.painSummary||"?"}
Next Step: ${loc.nextStep||"?"}
Recent activity:\n${acts||"none"}`;
    const role = (loc.role||"").toLowerCase();
    const focus = role.includes("hr")?"compliance, documentation, zero legal risk for client" : role.includes("plant")||role.includes("production")?"speed of delivery, worker quality, filling the line" : "total cost of ownership, partnership value, operational continuity";
    const text = await aiCall(
      `You are Walery, BD Director at Gremi Personal Romania. Write a professional, personalized follow-up email in Romanian (formal, director-to-director tone). Focus: ${focus}. Reference specific context from the deal. Do NOT use generic phrases. Max 150 words. Include subject line as first line: "Subject: ...". Be specific and concrete.`,
      ctx, 500
    );
    setDraft(text);
    setLoading(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(draft).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});
  };

  return(
    <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="sheet" style={{maxHeight:"80vh"}}>
        <div style={{padding:"13px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <div style={{width:26,height:26,borderRadius:7,background:`${C.teal}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>✉️</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:14,color:C.txt}}>AI Email Draft</div>
            <div style={{fontSize:11,color:C.txt3}}>{loc.company} · {loc.contact||"?"} · {loc.stage}</div>
          </div>
          <button className="btn" onClick={generate} disabled={loading} style={{background:`${C.blue}18`,color:C.blue,padding:"5px 10px",fontSize:10,borderRadius:6,border:`1px solid ${C.blue}33`}}>↻ Regenerate</button>
          <button className="xb" onClick={onClose}>×</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:14}}>
          {loading&&(
            <div style={{display:"flex",gap:4,padding:"20px 0",justifyContent:"center"}}>
              {[0,0.2,0.4].map((d,i)=><span key={i} style={{width:7,height:7,background:C.blue,borderRadius:"50%",animation:`pulse 1s infinite ${d}s`}}/>)}
            </div>
          )}
          {!loading&&draft&&(
            <textarea value={draft} onChange={e=>setDraft(e.target.value)}
              style={{width:"100%",background:C.bg3,border:`1px solid ${C.border}`,color:C.txt,borderRadius:8,padding:"12px",fontSize:13,fontFamily:"'Inter',sans-serif",lineHeight:1.7,resize:"none",minHeight:220,outline:"none"}}/>
          )}
        </div>
        <div style={{padding:"12px 14px",borderTop:`1px solid ${C.border}`,display:"flex",gap:8,flexShrink:0}}>
          <button className="btn" onClick={copy} disabled={!draft}
            style={{flex:1,background:copied?`${C.green}22`:`${C.teal}18`,color:copied?C.green:C.teal,padding:"11px",fontSize:13,borderRadius:9,border:`1px solid ${copied?C.green+"44":C.teal+"33"}`}}>
            {copied?"✓ Copied!":"📋 Copy to Clipboard"}
          </button>
          <button className="btn" onClick={onClose} style={{background:C.bg3,color:C.txt3,padding:"11px 14px",fontSize:13,borderRadius:9,border:`1px solid ${C.border}`}}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── ACTIVITY LOG ────────────────────────────────────────────────
function ActivityLog({loc, onUpdate}) {
  const [show,setShow]=useState(false); const [note,setNote]=useState(""); const [type,setType]=useState("Call");
  const [editId,setEditId]=useState(null); const [editNote,setEditNote]=useState(""); const [editType,setEditType]=useState("Call");
  const [showAll,setShowAll]=useState(false);
  const [aiSuggest,setAiSuggest]=useState(null); const [aiLoading,setAiLoading]=useState(false);
  const TYPES=["Call","Email","Meeting","LinkedIn","SMS","Note"];

  const analyzeNote = async (noteText) => {
    if(!noteText.trim()||noteText.length<20) return;
    setAiLoading(true);
    const raw = await aiCall(
      `CRM field suggestion AI. Analyze this activity note and return JSON with only the fields you can confidently determine (omit others):
{"workers":"number","spin_p":"problem text","spin_n":"need-payoff","pain_score":1-5,"next_step":"action","decision_criteria":"text","stage_suggestion":"stage name"}
Return ONLY valid JSON.`,
      `Deal: ${loc.company} — ${loc.location}, Stage: ${loc.stage}, Current workers: ${loc.workers||"?"}\nActivity note: ${noteText}`,
      400
    );
    try {
      const clean = raw.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);
      if(Object.keys(parsed).length > 0) setAiSuggest(parsed);
    } catch(e) {}
    setAiLoading(false);
  };

  const add=()=>{
    if(!note.trim())return;
    const act={id:Date.now(),type,note:note.trim(),date:new Date().toISOString().slice(0,10),time:new Date().toTimeString().slice(0,5)};
    const updated=[act,...(loc.activities||[])];
    onUpdate(loc.id,{activities:updated,lastContact:act.date});
    analyzeNote(note.trim());
    setNote("");setShow(false);
  };

  const applyAiSuggest = () => {
    if(!aiSuggest) return;
    const patch = {};
    const spin = {...(loc.spin||{})};
    let sc = false;
    if(aiSuggest.spin_p){spin.p=aiSuggest.spin_p;sc=true;}
    if(aiSuggest.spin_n){spin.n=aiSuggest.spin_n;sc=true;}
    if(sc) patch.spin = spin;
    if(aiSuggest.pain_score) patch.painScore = parseInt(aiSuggest.pain_score);
    if(aiSuggest.workers) patch.workers = String(aiSuggest.workers);
    if(aiSuggest.next_step) patch.nextStep = aiSuggest.next_step;
    if(aiSuggest.decision_criteria) patch.decisionCriteria = aiSuggest.decision_criteria;
    if(aiSuggest.stage_suggestion && aiSuggest.stage_suggestion !== loc.stage) patch.stage = aiSuggest.stage_suggestion;
    onUpdate(loc.id, patch);
    setAiSuggest(null);
  };

  const saveEdit=()=>{const updated=(loc.activities||[]).map(a=>a.id===editId?{...a,note:editNote,type:editType}:a);onUpdate(loc.id,{activities:updated});setEditId(null);};
  const del=(id)=>{if(!confirm("Delete this activity?"))return;const updated=(loc.activities||[]).filter(a=>a.id!==id);onUpdate(loc.id,{activities:updated});};
  const acts=loc.activities||[]; const visible=showAll?acts:acts.slice(0,5);

  return(
    <div style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:show||acts.length>0?10:0}}>
        <div className="lbl" style={{marginBottom:0}}>ACTIVITY LOG ({acts.length})</div>
        <button className="btn" onClick={()=>{setShow(!show);setEditId(null);}} style={{background:`${C.blue}22`,color:C.blue2,padding:"4px 10px",fontSize:10,borderRadius:6,border:`1px solid ${C.blue}44`}}>{show?"Cancel":"+ Add"}</button>
      </div>

      {aiSuggest&&(
        <div className="anim-in" style={{background:`${C.teal}10`,border:`1px solid ${C.teal}44`,borderRadius:8,padding:"8px 12px",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{fontSize:10,fontWeight:700,color:C.teal,letterSpacing:"0.06em"}}>🤖 AI FIELD SUGGESTIONS</div>
            <div style={{display:"flex",gap:4}}>
              <button className="btn" onClick={applyAiSuggest} style={{background:`${C.green}22`,color:C.green,padding:"4px 10px",fontSize:10,borderRadius:6,border:`1px solid ${C.green}44`}}>✅ Apply</button>
              <button className="btn" onClick={()=>setAiSuggest(null)} style={{background:"transparent",color:C.txt3,padding:"4px 6px",fontSize:10,borderRadius:6,border:`1px solid ${C.border}`}}>✕</button>
            </div>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {Object.entries(aiSuggest).filter(([,v])=>v).map(([k,v])=>(
              <div key={k} style={{background:C.bg2,borderRadius:5,padding:"3px 8px",fontSize:11}}>
                <span style={{color:C.teal,fontWeight:600}}>{k.replace(/_/g," ")}: </span>
                <span style={{color:C.txt2}}>{String(v).substring(0,50)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {show&&(
        <div style={{marginBottom:10,background:C.bg4,borderRadius:8,padding:10}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8}}>
            {TYPES.map(t=>(
              <button key={t} className="btn" onClick={()=>setType(t)} style={{padding:"4px 10px",fontSize:11,borderRadius:6,background:type===t?`${C.blue}22`:C.bg2,color:type===t?C.blue2:C.txt3,border:`1px solid ${type===t?C.blue+"44":C.border}`}}>{t}</button>
            ))}
          </div>
          <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} className="fi" style={{fontSize:12,resize:"vertical",marginBottom:8}} placeholder="What happened? Be specific — who said what, next steps..."/>
          <button className="btn" onClick={add} style={{width:"100%",background:`linear-gradient(135deg,${C.blue},${C.indigo})`,color:"#fff",padding:"9px",fontSize:12,borderRadius:8}}>Save Activity {aiLoading?"(AI analyzing...)":""}</button>
        </div>
      )}
      {visible.map(a=>(
        <div key={a.id} style={{padding:"8px 0",borderTop:`1px solid ${C.border}`}}>
          {editId===a.id?(
            <div style={{background:C.bg4,borderRadius:8,padding:10}}>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>{TYPES.map(t=><button key={t} className="btn" onClick={()=>setEditType(t)} style={{padding:"3px 8px",fontSize:10,borderRadius:5,background:editType===t?`${C.blue}22`:C.bg2,color:editType===t?C.blue2:C.txt3,border:`1px solid ${editType===t?C.blue+"44":C.border}`}}>{t}</button>)}</div>
              <textarea value={editNote} onChange={e=>setEditNote(e.target.value)} rows={3} className="fi" style={{fontSize:12,resize:"vertical",marginBottom:6}}/>
              <div style={{display:"flex",gap:6}}>
                <button className="btn" onClick={saveEdit} style={{flex:1,background:`linear-gradient(135deg,${C.green},${C.teal})`,color:"#fff",padding:"7px",fontSize:11,borderRadius:7}}>Save</button>
                <button className="btn" onClick={()=>setEditId(null)} style={{flex:1,background:C.bg2,color:C.txt3,padding:"7px",fontSize:11,borderRadius:7,border:`1px solid ${C.border}`}}>Cancel</button>
              </div>
            </div>
          ):(
            <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}>
                  <span className="pill" style={{background:`${C.blue}18`,color:C.blue2,border:`1px solid ${C.blue}33`,flexShrink:0}}>{a.type}</span>
                  <div style={{fontSize:10,color:C.txt3,flexShrink:0}}>{a.date?.slice(5)} {a.time}</div>
                </div>
                <div style={{fontSize:12,color:C.txt2,lineHeight:1.6,wordBreak:"break-word"}}>{a.note}</div>
              </div>
              <div style={{display:"flex",gap:4,flexShrink:0}}>
                <button className="btn" onClick={()=>{setEditId(a.id);setEditNote(a.note);setEditType(a.type);}} style={{background:`${C.blue}18`,color:C.blue2,padding:"3px 7px",fontSize:10,borderRadius:5,border:`1px solid ${C.blue}33`}}>✎</button>
                <button className="btn" onClick={()=>del(a.id)} style={{background:`${C.red}18`,color:C.red,padding:"3px 7px",fontSize:10,borderRadius:5,border:`1px solid ${C.red}33`}}>✕</button>
              </div>
            </div>
          )}
        </div>
      ))}
      {acts.length>5&&<button className="btn" onClick={()=>setShowAll(!showAll)} style={{width:"100%",background:"transparent",color:C.txt3,padding:"6px",fontSize:11,border:`1px dashed ${C.border}`,borderRadius:7,marginTop:4}}>{showAll?"Show less ↑":"Show all "+acts.length+" entries ↓"}</button>}
      {acts.length===0&&!show&&<div style={{fontSize:11,color:C.txt3,fontStyle:"italic",padding:"4px 0"}}>No activities recorded yet</div>}
    </div>
  );
}


// ─── STAGE HINT ──────────────────────────────────────────────────
function StageHint({stage,spin,nextStep,checklistDone}) {
  const hints = {
    "New":{color:checklistDone?"green":"indigo",msg:checklistDone?"✅ Pre-Call Research complete — ready to contact!":"Complete Pre-Call Research Checklist before first contact."},
    "Contacted":{color:"blue",msg:"Write SPIN hypotheses before the meeting. Fill S and P fields with what you expect to find."},
    "Interested":{color:"amber",msg:"Update SPIN with REAL answers from client. Fill Economic Buyer and Decision Criteria."},
    "Meeting Scheduled":{color:"amber",msg:"Confirm the meeting 24h in advance. Prepare 3 Implication questions. Write your Pain Hypothesis in SPIN-P now."},
    "Meeting Done":{color:"orange",msg:"Use Post-Call Debrief (📞) to extract SPIN fields from your notes. Send proposal within 24h."},
    "Proposal Sent":{color:"teal",msg:"Check: Is Pain Summary filled? Is Next Step set with a date? Follow up in 3 days."},
    "Negotiation":{color:"purple",msg:"Never concede without getting something in return. Know your walk-away number. Escalate to Walery if discount > 5%."},
    "Closed Won":{color:"green",msg:"🏆 Handover to Operations within 48h. Set monthly check-in. Ask for referral after month 1."},
    "Closed Lost":{color:"red",msg:"Please select the Lost Reason in Edit — this data helps improve team performance."},
    "No Answer":{color:"txt3",msg:"Try 4 times across different channels before giving up. Next attempt: different time of day + LinkedIn."},
  };
  const h=hints[stage]; if(!h) return null;
  const c=C[h.color]||C.txt3;
  return <div style={{background:`${c}12`,border:`1px solid ${c}33`,borderRadius:8,padding:"9px 12px",fontSize:11,color:c,lineHeight:1.6}}>💡 {h.msg}</div>;
}

// ─── AI CONTEXTUAL HINT (auto) ───────────────────────────────────
function ContextualHint({loc, hq}) {
  const today = new Date();
  const daysSinceContact = loc.lastContact ? Math.ceil((today-new Date(loc.lastContact))/86400000) : 999;
  const daysInStage = loc.activities?.length
    ? Math.ceil((today-new Date(loc.activities[loc.activities.length-1]?.date||today))/86400000) : 0;
  const sp = loc.spin||{};
  const spinCount = [sp.s,sp.p,sp.i,sp.n].filter(Boolean).length;
  const checklistDone = hq ? Object.values(hq.preCallChecklist||{}).filter(Boolean).length : 0;

  let hint = null;
  if(loc.stage==="New"&&checklistDone<10) hint={color:C.indigo,msg:`Pre-call checklist ${checklistDone}/12 complete. Missing key research before first contact.`};
  else if(loc.stage==="Contacted"&&daysSinceContact>5&&daysSinceContact<=14) hint={color:C.blue,msg:`${daysSinceContact} days since last contact. Consider a LinkedIn approach if calls go unanswered.`};
  else if(loc.stage==="Meeting Done"&&!sp.i) hint={color:C.amber,msg:`Implication (SPIN-I) not filled. This weakens your proposal. Fill it before sending.`};
  else if(loc.stage==="Proposal Sent"&&daysSinceContact>=10&&daysSinceContact<14) hint={color:C.orange,msg:`Day ${daysSinceContact} without response. Win probability drops 50% after day 14. Call today.`};
  else if(loc.stage==="Proposal Sent"&&daysSinceContact>=14) hint={color:C.red,msg:`⚠ Day ${daysSinceContact}+ — critical follow-up. Send breakup message or close as No Answer.`};
  else if(!loc.nextStep&&!["Closed Won","Closed Lost","No Answer"].includes(loc.stage)) hint={color:C.red,msg:`No next step defined. Every active deal must have a next step with a date.`};
  else if(spinCount<2&&["Interested","Meeting Scheduled","Meeting Done"].includes(loc.stage)) hint={color:C.amber,msg:`SPIN only ${spinCount}/4 fields filled for stage "${loc.stage}". Improve before the meeting.`};

  if(!hint) return null;
  return (
    <div style={{background:`${hint.color}10`,border:`1px solid ${hint.color}33`,borderRadius:8,padding:"9px 12px",fontSize:11,color:hint.color,lineHeight:1.6}}>
      💡 {hint.msg}
    </div>
  );
}

// ─── MEDDIC SECTION ──────────────────────────────────────────────
function MeddicSection({form,setForm}) {
  const [open,setOpen]=useState(!!(form.decisionProcess||form.economicBuyer||form.decisionCriteria||form.champion));
  return(
    <div>
      <button type="button" className="btn" onClick={()=>setOpen(!open)} style={{width:"100%",background:"transparent",color:open?C.indigo:C.txt3,padding:"8px",fontSize:11,borderRadius:7,border:`1px dashed ${open?C.indigo:C.border2}`,letterSpacing:"0.05em",marginBottom:open?8:0}}>
        {open?"▲ Hide MEDDIC fields":"+ Show MEDDIC fields (Decision Process, Buyer, Criteria, Champion)"}
      </button>
      {open&&(
        <div style={{display:"flex",flexDirection:"column",gap:10,background:C.bg3,border:`1px solid ${C.indigo}33`,borderRadius:10,padding:12}}>
          <div style={{fontSize:10,color:C.indigo,fontWeight:600,letterSpacing:"0.08em"}}>MEDDIC — DEAL INTELLIGENCE</div>
          <div><div className="lbl">DECISION PROCESS</div><textarea value={form.decisionProcess||""} onChange={e=>setForm({...form,decisionProcess:e.target.value})} rows={2} className="fi" style={{fontSize:12}} placeholder='e.g. "HR recommends → Owner signs"'/></div>
          <div><div className="lbl">ECONOMIC BUYER (who holds the budget)</div><textarea value={form.economicBuyer||""} onChange={e=>setForm({...form,economicBuyer:e.target.value})} rows={2} className="fi" style={{fontSize:12}} placeholder='e.g. "Vasile Ionescu, GM — signs contracts above 50k RON"'/></div>
          <div><div className="lbl">DECISION CRITERIA</div><textarea value={form.decisionCriteria||""} onChange={e=>setForm({...form,decisionCriteria:e.target.value})} rows={2} className="fi" style={{fontSize:12}} placeholder='e.g. "Price/hour, delivery speed, Romanian-speaking coordinator"'/></div>
          <div><div className="lbl">CHAMPION (internal ally)</div><textarea value={form.champion||""} onChange={e=>setForm({...form,champion:e.target.value})} rows={2} className="fi" style={{fontSize:12}} placeholder='e.g. "Ana Pop, HR Manager — tired of manual recruiting"'/></div>
        </div>
      )}
    </div>
  );
}

// ─── SPIN FIELD ──────────────────────────────────────────────────
function SpinField({label,hint,value,onChange}) {
  const [showHint,setShowHint]=useState(false);
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
        <div className="lbl" style={{marginBottom:0}}>{label}</div>
        <button type="button" className="btn" onClick={()=>setShowHint(!showHint)} style={{background:"transparent",color:C.indigo,padding:"0 4px",fontSize:11,border:"none",cursor:"pointer"}}>?</button>
      </div>
      {showHint&&<div style={{background:`${C.indigo}18`,border:`1px solid ${C.indigo}33`,borderRadius:7,padding:"8px 10px",marginBottom:6}}>{hint.map((h,i)=><div key={i} style={{fontSize:11,color:C.indigo,marginBottom:2}}>→ {h}</div>)}</div>}
      <textarea value={value} onChange={e=>onChange(e.target.value)} rows={3} className="fi" style={{resize:"vertical",fontSize:12,minHeight:72}}/>
    </div>
  );
}

// ─── WORKER TYPE ─────────────────────────────────────────────────
function WorkerTypeSelect({value,onChange}) {
  const types=["UA Ukrainian","Asian","Latin American","African","MD Moldovan"];
  const [custom,setCustom]=useState("");
  const selected=value?value.split(",").map(s=>s.trim()).filter(Boolean):[];
  const toggle=(t)=>{const isOn=selected.includes(t);const next=isOn?selected.filter(x=>x!==t):[...selected,t];onChange(next.join(", "));};
  const hasOther=selected.some(s=>!types.includes(s));
  const otherVal=selected.find(s=>!types.includes(s))||"";
  const setOther=(v)=>{const base=selected.filter(s=>types.includes(s));onChange(v?[...base,v].join(", "):base.join(", "));setCustom(v);};
  return(
    <div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:6}}>
        {types.map(t=>(
          <button key={t} type="button" className="btn" onClick={()=>toggle(t)} style={{padding:"6px 10px",fontSize:11,borderRadius:7,background:selected.includes(t)?`${C.teal}22`:C.bg4,color:selected.includes(t)?C.teal:C.txt3,border:`1.5px solid ${selected.includes(t)?C.teal:C.border}`}}>{t}</button>
        ))}
        <button type="button" className="btn" onClick={()=>hasOther?setOther(""):setOther("Other")} style={{padding:"6px 10px",fontSize:11,borderRadius:7,background:hasOther?`${C.amber}22`:C.bg4,color:hasOther?C.amber:C.txt3,border:`1.5px solid ${hasOther?C.amber:C.border}`}}>✏ Other</button>
      </div>
      {hasOther&&<input type="text" value={otherVal} onChange={e=>setOther(e.target.value)} className="fi" style={{fontSize:12}} placeholder="Specify worker type..."/>}
      {selected.length>0&&<div style={{fontSize:11,color:C.teal,marginTop:4}}>Selected: {selected.join(", ")}</div>}
    </div>
  );
}


// ─── PRE-CALL CHECKLIST ──────────────────────────────────────────
const PRECALL_ITEMS = [
  {id:"annualTurnover",label:"Annual Turnover",hint:"→ Annual Turnover",fieldId:"#hq-annual-turnover"},
  {id:"employees",label:"Number of Employees",hint:"→ Employees",fieldId:"#hq-employees"},
  {id:"owner",label:"Owner / Administrator",hint:"→ Intelligence",fieldId:"#hq-intelligence"},
  {id:"locations",label:"Locations and Addresses",hint:"→ Add as Locations",fieldId:"#hq-locations-section"},
  {id:"products",label:"What they produce / for whom",hint:"→ Intelligence",fieldId:"#hq-intelligence"},
  {id:"growth",label:"Growing or shrinking (3yr)",hint:"→ Intelligence",fieldId:"#hq-intelligence"},
  {id:"vacancies",label:"Open vacancies — how many",hint:"→ Intelligence",fieldId:"#hq-intelligence"},
  {id:"agency",label:"Work with an agency?",hint:"→ Location Notes",fieldId:"#location-notes"},
  {id:"lprName",label:"Decision maker name + role",hint:"→ Central Contact",fieldId:"#hq-central-contact"},
  {id:"lprContact",label:"DM email / phone",hint:"→ Central Phone",fieldId:"#hq-central-phone"},
  {id:"linkedin",label:"DM LinkedIn activity",hint:"→ Intelligence",fieldId:"#hq-intelligence"},
  {id:"painHypothesis",label:"Pain hypothesis (1 sentence)",hint:"→ SPIN-P",fieldId:"#location-spin-p"},
];

function HQPreCallChecklist({hq,onSave,onNavigate}) {
  const stored=hq.preCallChecklist||{};
  const [checked,setChecked]=useState(stored); const [open,setOpen]=useState(false);
  const done=PRECALL_ITEMS.filter(i=>checked[i.id]).length; const total=PRECALL_ITEMS.length; const pct=Math.round(done/total*100); const allDone=done===total;
  const toggle=(id)=>{const next={...checked,[id]:!checked[id]};setChecked(next);onSave({preCallChecklist:next});};
  return(
    <div>
      <button type="button" className="btn" onClick={()=>setOpen(!open)} style={{width:"100%",background:allDone?`${C.green}22`:`${C.indigo}18`,color:allDone?C.green:C.indigo,padding:"9px 12px",fontSize:11,borderRadius:8,border:`1px solid ${allDone?C.green+"44":C.indigo+"33"}`,display:"flex",alignItems:"center",gap:8,marginBottom:open?8:0}}>
        <div style={{flex:1,textAlign:"left",fontWeight:600}}>{allDone?"✅ Pre-Call Research Complete":"📋 Pre-Call Research Checklist"}</div>
        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          <div style={{background:C.bg4,borderRadius:4,width:60,height:6,overflow:"hidden"}}><div style={{background:allDone?C.green:pct>50?C.amber:C.indigo,height:6,width:pct+"%",transition:"width 0.3s"}}/></div>
          <span style={{fontSize:10,color:allDone?C.green:C.txt3,fontWeight:600}}>{done}/{total}</span>
          <span style={{color:C.txt3}}>{open?"▲":"▼"}</span>
        </div>
      </button>
      {open&&(
        <div style={{background:C.bg3,border:`1px solid ${C.indigo}33`,borderRadius:10,padding:12}}>
          {PRECALL_ITEMS.map(item=>(
            <div key={item.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 6px",borderBottom:`1px solid ${C.border}`}}>
              <div className="row-hover" onClick={()=>toggle(item.id)} style={{width:18,height:18,borderRadius:4,border:`2px solid ${checked[item.id]?C.green:C.border2}`,background:checked[item.id]?C.green:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",fontWeight:700,cursor:"pointer"}}>{checked[item.id]?"✓":""}</div>
              <div className="row-hover" onClick={()=>toggle(item.id)} style={{flex:1,cursor:"pointer"}}>
                <div style={{fontSize:12,color:checked[item.id]?C.txt3:C.txt,textDecoration:checked[item.id]?"line-through":"none"}}>{item.label}</div>
              </div>
              <button className="btn" onClick={()=>onNavigate&&onNavigate(item.fieldId)} style={{background:"transparent",color:C.txt3,fontSize:10,padding:"2px 5px",border:`1px solid ${C.border}`,borderRadius:4}}>{item.hint}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── HQ DETAILS SECTION ──────────────────────────────────────────
function HqDetailsSection({hq}) {
  const hasDetails=hq.employees||hq.annualTurnover||hq.intelligence||hq.seasonality||hq.leadSource;
  const [open,setOpen]=useState(false);
  if(!hasDetails) return null;
  return(
    <div>
      <button type="button" className="btn" onClick={()=>setOpen(!open)} style={{width:"100%",background:"transparent",color:open?C.blue:C.txt3,padding:"8px",fontSize:11,borderRadius:7,border:`1px dashed ${open?C.blue:C.border2}`,letterSpacing:"0.05em",marginBottom:open?8:0}}>
        {open?"▲ Hide details":"+ Show details (Turnover, Employees, Intelligence)"}
      </button>
      {open&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {hq.employees&&<div className="kv"><div className="lbl">EMPLOYEES</div><div style={{fontSize:13,color:C.txt,fontWeight:600}}>{hq.employees}</div></div>}
            {hq.annualTurnover&&<div className="kv"><div className="lbl">ANNUAL TURNOVER</div><div style={{fontSize:13,color:C.txt,fontWeight:600}}>{hq.annualTurnover} RON</div></div>}
            {hq.seasonality&&<div className="kv" style={{gridColumn:"1/-1"}}><div className="lbl">SEASONALITY</div><div style={{fontSize:12,color:C.txt2}}>{hq.seasonality}</div></div>}
            {hq.leadSource&&<div className="kv"><div className="lbl">LEAD SOURCE</div><div style={{fontSize:12,color:C.blue2}}>{hq.leadSource}</div></div>}
          </div>
          {hq.intelligence&&<div style={{background:C.bg3,border:`1px solid ${C.indigo}44`,borderRadius:10,padding:12}}><div className="lbl" style={{color:C.indigo}}>INTELLIGENCE</div><div style={{fontSize:12,color:C.txt2,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{hq.intelligence}</div></div>}
        </div>
      )}
    </div>
  );
}


// ─── INLINE AI (inside deal modal) ───────────────────────────────
const AI_SYS_INLINE = `You are the internal sales AI for Gremi Personal Romania. You help the BD Director analyze leads and fill CRM fields.

CRITICAL INSTRUCTION — FIELD SUGGESTIONS:
When you analyze a lead or answer a question, ALWAYS include a section at the END of your response with suggested CRM field values in this EXACT format:

---FIELDS---
HQ_INTELLIGENCE: [research about the company]
HQ_ANNUAL_TURNOVER: [annual revenue in RON]
HQ_EMPLOYEES: [total company headcount]
HQ_SEASONALITY: [seasonal patterns]
WORKERS: [number of workers needed]
WORKER_TYPE: [one of: UA Ukrainian, Asian, MD Moldovan, UA+Asian Mix, Other]
CURRENT_SUPPLIER: [current staffing supplier name, or "none"]
DECISION_PROCESS: [who decides and how]
ECONOMIC_BUYER: [who holds the budget]
CHAMPION: [internal ally who supports the deal]
DECISION_CRITERIA: [what matters most]
SPIN_S: [Situation — facts about current state]
SPIN_P: [Problem — difficulties and pain]
SPIN_I: [Implication — consequences and costs]
SPIN_N: [Need-Payoff — value of solving it]
PAIN_SUMMARY: [one sentence pain summary]
PAIN_SCORE: [1-5, where 5 is critical]
NEXT_STEP: [specific next action]
LOC_NOTES: [notes to append]
---END---

Rules: Only include fields where you have meaningful data. Write field values in the language the user writes in. Respond in the language the user writes.`;

function InlineAI({loc,hq,onUpdate,onUpdateHQ}) {
  const [msgs,setMsgs]=useState([]); const [input,setInput]=useState(""); const [loading,setLoading]=useState(false); const [pending,setPending]=useState(null);
  const bottomRef=useRef(null); const taRef=useRef(null);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,loading]);

  const buildCtx=()=>{
    let ctx="";
    if(hq) ctx+=`\nCOMPANY: ${hq.company}\nIndustry: ${hq.industry||"?"}\nTurnover: ${hq.annualTurnover||"?"}\nEmployees: ${hq.employees||"?"}\nSeasonality: ${hq.seasonality||"?"}\nIntelligence: ${hq.intelligence||"not collected"}\nContact: ${hq.centralContact||"?"} (${hq.centralRole||"?"})`;
    const sp=loc.spin||{};
    const acts=(loc.activities||[]).slice(0,5).map(a=>`${a.date} ${a.type}: ${a.note}`).join("\n");
    ctx+=`\nLOCATION: ${loc.location}\nContact: ${loc.contact||"?"} (${loc.role||"?"})\nCounty: ${loc.county||"?"}\nStage: ${loc.stage}\nTemp: ${loc.temp}\nWorkers: ${loc.workers||"?"}\nType: ${loc.workerType||"?"}\nPain Score: ${loc.painScore||"?"}\nDecision Process: ${loc.decisionProcess||"?"}\nEconomic Buyer: ${loc.economicBuyer||"?"}\nSPIN-S: ${sp.s||"empty"}\nSPIN-P: ${sp.p||"empty"}\nSPIN-I: ${sp.i||"empty"}\nSPIN-N: ${sp.n||"empty"}\nPain Summary: ${sp.painSummary||"empty"}\nNotes: ${loc.notes||""}\nActivity:\n${acts||"none"}`;
    return ctx;
  };

  const parseFields=(text)=>{const m=text.match(/---FIELDS---([\s\S]*?)---END---/);if(!m)return null;const lines=m[1].trim().split("\n");const fields={};lines.forEach(l=>{const idx=l.indexOf(":");if(idx>0){const key=l.substring(0,idx).trim();const val=l.substring(idx+1).trim();if(val&&val!=="[none]"&&val!=="?")fields[key]=val;}});return Object.keys(fields).length>0?fields:null;};
  const stripFields=(text)=>text.replace(/---FIELDS---[\s\S]*?---END---/,"").trim();

  const applyFields=(fields)=>{
    const locPatch={};const spin={...(loc.spin||{})};let spinChanged=false;
    if(fields.SPIN_S){spin.s=fields.SPIN_S;spinChanged=true;}
    if(fields.SPIN_P){spin.p=fields.SPIN_P;spinChanged=true;}
    if(fields.SPIN_I){spin.i=fields.SPIN_I;spinChanged=true;}
    if(fields.SPIN_N){spin.n=fields.SPIN_N;spinChanged=true;}
    if(fields.PAIN_SUMMARY){spin.painSummary=fields.PAIN_SUMMARY;spinChanged=true;}
    if(spinChanged)locPatch.spin=spin;
    if(fields.PAIN_SCORE)locPatch.painScore=parseInt(fields.PAIN_SCORE)||null;
    if(fields.NEXT_STEP){locPatch.nextStep=fields.NEXT_STEP;locPatch.nextStepDate=new Date().toISOString().slice(0,10);}
    if(fields.LOC_NOTES)locPatch.notes=(loc.notes?loc.notes+"\n\n":"")+"[AI] "+fields.LOC_NOTES;
    if(fields.WORKERS)locPatch.workers=fields.WORKERS;
    if(fields.WORKER_TYPE)locPatch.workerType=fields.WORKER_TYPE;
    if(fields.CURRENT_SUPPLIER)locPatch.currentSupplier=fields.CURRENT_SUPPLIER;
    if(fields.DECISION_PROCESS)locPatch.decisionProcess=fields.DECISION_PROCESS;
    if(fields.ECONOMIC_BUYER)locPatch.economicBuyer=fields.ECONOMIC_BUYER;
    if(fields.CHAMPION)locPatch.champion=fields.CHAMPION;
    if(fields.DECISION_CRITERIA)locPatch.decisionCriteria=fields.DECISION_CRITERIA;
    const locFields=Object.keys(fields).filter(k=>!k.startsWith("HQ_"));
    if(locFields.length>0){const act={id:Date.now(),type:"Note",note:"[AI] Fields updated: "+locFields.join(", "),date:new Date().toISOString().slice(0,10),time:new Date().toTimeString().slice(0,5)};locPatch.activities=[act,...(loc.activities||[])];locPatch.lastContact=act.date;onUpdate(loc.id,locPatch);}
    const hqFields=Object.keys(fields).filter(k=>k.startsWith("HQ_"));
    let hqSaved=false;
    if(hqFields.length>0&&hq&&onUpdateHQ){const hqPatch={};if(fields.HQ_INTELLIGENCE)hqPatch.intelligence=(hq.intelligence?hq.intelligence+"\n\n":"")+"[AI] "+fields.HQ_INTELLIGENCE;if(fields.HQ_ANNUAL_TURNOVER)hqPatch.annualTurnover=fields.HQ_ANNUAL_TURNOVER;if(fields.HQ_EMPLOYEES)hqPatch.employees=fields.HQ_EMPLOYEES;if(fields.HQ_SEASONALITY)hqPatch.seasonality=fields.HQ_SEASONALITY;if(Object.keys(hqPatch).length>0){onUpdateHQ(hq.id,hqPatch);hqSaved=true;}}
    setPending(null);
    const msg="✅ Applied to CRM."+(hqSaved?" HQ fields (Intelligence, Turnover etc.) saved to company record.":"")+(locFields.length===0&&!hqSaved?" (no actionable fields found)":"");
    setMsgs(prev=>[...prev,{role:"system",content:msg}]);
  };

  const send=async()=>{
    const text=input.trim();if(!text||loading)return;
    const userMsg={role:"user",content:text};const newMsgs=[...msgs,userMsg];
    setMsgs(newMsgs);setInput("");setLoading(true);setPending(null);
    try{
      const ctx=buildCtx();const sysMsg=AI_SYS_INLINE+"\n\n--- CRM CONTEXT ---"+ctx;
      const apiMsgs=newMsgs.filter(m=>m.role!=="system").map(m=>({role:m.role,content:m.content}));
      const res=await fetch(AI_PROXY,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${SB_KEY}`},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:2000,system:sysMsg,messages:apiMsgs})});
      const data=await res.json();const raw=data.content?.[0]?.text||"Error.";
      const fields=parseFields(raw);const clean=stripFields(raw);
      setMsgs(prev=>[...prev,{role:"assistant",content:clean}]);
      if(fields)setPending(fields);
    }catch(e){setMsgs(prev=>[...prev,{role:"assistant",content:"Error: "+e.message}]);}
    setLoading(false);
  };

  const parseMd=(t)=>t.replace(/\*\*(.*?)\*\*/g,"<strong style='color:"+C.txt+"'>$1</strong>").replace(/\*(.*?)\*/g,"<em>$1</em>").replace(/^[•\-] (.+)$/gm,"<div style='padding:1px 0 1px 12px;position:relative'><span style='position:absolute;left:0;color:"+C.blue+"'>›</span>$1</div>").replace(/^(\d+)\. (.+)$/gm,"<div style='padding:1px 0 1px 12px'><span style='color:"+C.blue+";margin-right:3px'>$1.</span>$2</div>").replace(/^#{1,3} (.+)$/gm,"<div style='color:"+C.blue+";font-weight:700;margin:8px 0 4px;font-size:13px'>$1</div>").replace(/\n\n/g,"<div style='height:6px'></div>").replace(/`([^`]+)`/g,"<code style='background:"+C.bg4+";padding:2px 5px;border-radius:3px;font-size:12px;color:"+C.teal+"'>$1</code>");
  const fieldLabels={SPIN_S:"Situation",SPIN_P:"Problem",SPIN_I:"Implication",SPIN_N:"Need-Payoff",PAIN_SUMMARY:"Pain Summary",PAIN_SCORE:"Pain Score",NEXT_STEP:"Next Step",LOC_NOTES:"Notes",WORKERS:"Workers",WORKER_TYPE:"Worker Type",CURRENT_SUPPLIER:"Current Supplier",DECISION_PROCESS:"Decision Process",ECONOMIC_BUYER:"Economic Buyer",CHAMPION:"Champion",DECISION_CRITERIA:"Decision Criteria",HQ_INTELLIGENCE:"Intelligence",HQ_ANNUAL_TURNOVER:"Annual Turnover",HQ_EMPLOYEES:"Employees",HQ_SEASONALITY:"Seasonality"};
  const quicks=[{l:"📋 Qualify",t:"Analyze this lead and suggest CRM field values."},{l:"📞 Pre-call",t:"Generate a pre-call brief with SPIN hypotheses."},{l:"❓ SPIN",t:"Give me 3 targeted Implication questions and suggest SPIN field updates."},{l:"✉️ Email",t:"Draft a follow-up email in Romanian and suggest a next step."},{l:"📊 Review",t:"Review this deal stage, what is missing, suggest field updates."}];

  return(
    <div style={{borderTop:`2px solid ${C.teal}`,background:C.bg0,display:"flex",flexDirection:"column",maxHeight:"70vh",minHeight:280}}>
      <div style={{padding:"8px 14px",display:"flex",gap:5,flexWrap:"wrap",flexShrink:0,borderBottom:`1px solid ${C.border}`,alignItems:"center"}}>
        <span style={{fontSize:12,color:C.teal,fontWeight:700,letterSpacing:"0.05em",marginRight:4}}>🤖 AI</span>
        {quicks.map(q=>(
          <button key={q.l} className="btn" onClick={()=>{setInput(q.t);taRef.current?.focus();}} style={{background:C.bg3,border:`1px solid ${C.border}`,color:C.txt3,padding:"5px 10px",borderRadius:6,fontSize:11}}>{q.l}</button>
        ))}
        <button className="btn" onClick={()=>setMsgs([])} style={{background:C.bg3,border:`1px solid ${C.border}`,color:C.txt3,padding:"5px 10px",borderRadius:6,fontSize:11,marginLeft:"auto"}}>Clear</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>
        {msgs.length===0&&<div style={{fontSize:13,color:C.txt3,padding:"24px 0",textAlign:"center"}}>Ask AI to analyze this lead, suggest SPIN fields, draft emails...</div>}
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",gap:6}}>
            {m.role==="assistant"&&<div style={{width:26,height:26,borderRadius:6,background:`linear-gradient(135deg,${C.blue},${C.indigo})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,marginTop:2}}>🤖</div>}
            {m.role==="system"&&<div style={{width:26,height:26,borderRadius:6,background:`${C.green}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,marginTop:2}}>✓</div>}
            <div style={{maxWidth:"88%",background:m.role==="user"?`${C.blue}15`:m.role==="system"?`${C.green}12`:C.bg2,border:`1px solid ${m.role==="user"?C.blue+"33":m.role==="system"?C.green+"33":C.border}`,borderRadius:10,padding:"10px 14px",fontSize:13,lineHeight:1.7,color:m.role==="system"?C.green:C.txt2}} dangerouslySetInnerHTML={{__html:parseMd(m.content)}}/>
          </div>
        ))}
        {loading&&<div style={{display:"flex",gap:6}}><div style={{width:26,height:26,borderRadius:6,background:`linear-gradient(135deg,${C.blue},${C.indigo})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>🤖</div><div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",display:"flex",gap:4}}>{[0,0.2,0.4].map((d,i)=><span key={i} style={{width:6,height:6,background:C.blue,borderRadius:"50%",animation:`pulse 1s infinite ${d}s`}}/>)}</div></div>}
        <div ref={bottomRef}/>
      </div>
      {pending&&(
        <div style={{borderTop:`1px solid ${C.teal}44`,background:`${C.teal}08`,padding:"8px 12px",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{fontSize:12,fontWeight:700,color:C.teal}}>SUGGESTED CRM UPDATES</div>
            <div style={{display:"flex",gap:4}}>
              <button className="btn" onClick={()=>applyFields(pending)} style={{background:`linear-gradient(135deg,${C.green},${C.teal})`,color:"#fff",padding:"7px 14px",fontSize:12,borderRadius:7}}>✅ Apply All</button>
              <button className="btn" onClick={()=>setPending(null)} style={{background:C.bg4,color:C.txt3,padding:"7px 10px",fontSize:12,borderRadius:7,border:`1px solid ${C.border}`}}>✕</button>
            </div>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {Object.entries(pending).map(([k,v])=>(
              <div key={k} style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:7,padding:"6px 10px",fontSize:12,maxWidth:"100%"}}>
                <span style={{color:C.teal,fontWeight:600}}>{fieldLabels[k]||k}: </span>
                <span style={{color:C.txt2}}>{String(v).substring(0,80)}{String(v).length>80?"...":""}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{borderTop:`1px solid ${C.border}`,padding:"10px 14px",display:"flex",gap:8,alignItems:"flex-end",flexShrink:0}}>
        <textarea ref={taRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
          placeholder="Ask AI... (Enter = send)" rows={2}
          style={{flex:1,background:C.bg3,border:`1px solid ${C.border}`,color:C.txt,borderRadius:8,padding:"10px 12px",fontSize:13,fontFamily:"'Inter',sans-serif",resize:"none",lineHeight:1.5}}/>
        <button className="btn" onClick={send} disabled={loading||!input.trim()}
          style={{background:loading||!input.trim()?C.bg4:`linear-gradient(135deg,${C.blue},${C.indigo})`,color:loading||!input.trim()?C.txt3:"#fff",width:40,height:40,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>↑</button>
      </div>
    </div>
  );
}


// ─── HQ DETAIL MODAL ─────────────────────────────────────────────
function HQDetailModal({hq,locs,users,isAdmin,onClose,onEditHQ,onDeleteHQ,onAddLoc,onSelectLoc,onSaveChecklist,onUpdateHQ,onUpdateLoc,curUser}) {
  const hqLocs=locs.filter(l=>l.parentId===hq.id);
  const totalW=hqLocs.reduce((s,l)=>s+(parseInt(l.workers)||0),0);
  const stages=[...new Set(hqLocs.map(l=>l.stage))];
  const [showDanger,setShowDanger]=useState(false);
  const [showAI,setShowAI]=useState(false);
  const uN=id=>users.find(u=>u.id===id)?.name||"—";
  return(
    <div className="modal">
      <div className="mh">
        <div style={{flex:1,minWidth:0,paddingRight:10}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:17,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{hq.company}</div>
          <div style={{fontSize:11,color:C.txt3,marginTop:2}}>🏢 HQ · {hq.industry} · {hqLocs.length} location{hqLocs.length!==1?"s":""}</div>
        </div>
        <button className="xb" onClick={onClose}>×</button>
      </div>
      <div className="ms">
        <div style={{background:C.bg3,border:`1px solid ${C.border}`,borderLeft:`3px solid ${C.indigo}`,borderRadius:10,padding:13}}>
          <div className="lbl">CENTRAL CONTACT (HQ)</div>
          <div style={{fontWeight:700,fontSize:15,color:C.txt}}>{hq.centralContact||"—"}</div>
          <div style={{fontSize:12,color:C.txt3,marginBottom:10}}>{hq.centralRole||"—"}</div>
          {hq.centralPhone&&<a href={"tel:"+hq.centralPhone} style={{display:"block",background:`${C.blue}18`,border:`1px solid ${C.blue}44`,color:C.blue2,padding:"10px",fontSize:13,fontWeight:600,textAlign:"center",marginBottom:8,textDecoration:"none",borderRadius:8}}>📞 {hq.centralPhone}</a>}
          {hq.centralEmail&&<a href={"mailto:"+hq.centralEmail} style={{display:"block",background:`${C.teal}18`,border:`1px solid ${C.teal}44`,color:C.teal,padding:"10px",fontSize:13,fontWeight:600,textAlign:"center",textDecoration:"none",borderRadius:8,marginBottom:8}}>✉ {hq.centralEmail}</a>}
          {hq.address&&<a href={mapsUrl(hq.address)} target="_blank" rel="noopener" style={{display:"block",background:`${C.green}18`,border:`1px solid ${C.green}44`,color:C.green,padding:"10px",fontSize:13,fontWeight:600,textAlign:"center",textDecoration:"none",borderRadius:8,marginBottom:8}}>📍 {hq.address}</a>}
          {hq.website&&<a href={webUrl(hq.website)} target="_blank" rel="noopener" style={{display:"block",background:`${C.indigo}18`,border:`1px solid ${C.indigo}44`,color:C.indigo,padding:"10px",fontSize:13,fontWeight:600,textAlign:"center",textDecoration:"none",borderRadius:8}}>🌐 {hq.website}</a>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          <div className="kv" style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:700,color:C.blue,fontFamily:"'Space Grotesk',sans-serif"}}>{hqLocs.length}</div><div className="lbl" style={{marginBottom:0}}>Locations</div></div>
          <div className="kv" style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:700,color:C.amber,fontFamily:"'Space Grotesk',sans-serif"}}>{totalW}</div><div className="lbl" style={{marginBottom:0}}>Workers</div></div>
          <div className="kv" style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:700,color:C.green,fontFamily:"'Space Grotesk',sans-serif"}}>{hqLocs.filter(l=>l.stage==="Closed Won").length}</div><div className="lbl" style={{marginBottom:0}}>Won</div></div>
        </div>
        {stages.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6}}>{stages.map(s=>{const cnt=hqLocs.filter(l=>l.stage===s).length;const c=getSC()[s]||C.txt3;return <span key={s} className="pill" style={{background:c+"22",color:c,border:`1px solid ${c}44`,fontSize:11,padding:"4px 10px"}}>{s} ({cnt})</span>;})}</div>}
        <HqDetailsSection hq={hq}/>
        <HQPreCallChecklist hq={hq} onSave={onSaveChecklist} onNavigate={(fieldId)=>{const hqFields=["#hq-annual-turnover","#hq-employees","#hq-intelligence","#hq-central-contact","#hq-central-phone"];if(hqFields.includes(fieldId)){onEditHQ();setTimeout(()=>{const el=document.querySelector(fieldId);if(el){el.scrollIntoView({behavior:"smooth",block:"center"});el.focus();}},300);}else{const el=document.querySelector(fieldId);if(el){el.scrollIntoView({behavior:"smooth",block:"center"});el.focus();}}}}/>
        {hq.notes&&<div style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}><div className="lbl">NOTES</div><div style={{fontSize:13,color:C.txt2,lineHeight:1.7}}>{hq.notes}</div></div>}
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:11,fontWeight:600,color:C.txt3,letterSpacing:"0.08em"}}>LOCATIONS / DEALS ({hqLocs.length})</div>
            <button className="btn" onClick={onAddLoc} style={{background:`linear-gradient(135deg,${C.blue},${C.indigo})`,color:"#fff",padding:"6px 12px",fontSize:11,borderRadius:7}}>+ Add Location</button>
          </div>
          {hqLocs.length===0&&<div style={{fontSize:12,color:C.txt3,padding:"14px",background:C.bg3,borderRadius:8,border:`1px dashed ${C.border2}`,textAlign:"center"}}>No locations yet — add the first deal</div>}
          {hqLocs.map(l=>{
            const sc=getSC()[l.stage]||C.txt3;const od=isOD(l.nextStepDate,l.stage);const dl=daysLeft(l.nextStepDate);const uName=uN(l.salesId);
            return(
              <div key={l.id} className="row-hover" onClick={()=>onSelectLoc(l)} style={{background:C.bg3,border:`1px solid ${C.border}`,borderLeft:`3px solid ${sc}`,borderRadius:10,padding:"12px 14px",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <HealthDot loc={l}/>
                      <div style={{fontWeight:600,fontSize:13,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📍 {l.location}</div>
                    </div>
                    <div style={{fontSize:11,color:C.txt3,marginTop:2}}>{l.contact} · {l.county} · <span style={{color:C.blue}}>{uName}</span></div>
                  </div>
                  <span style={{fontSize:16,flexShrink:0}}>{l.temp}</span>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
                  <span className="pill" style={{background:sc+"22",color:sc,border:`1px solid ${sc}44`}}>{l.stage}</span>
                  {l.service&&<span className="pill" style={{background:`${C.blue}18`,color:C.blue2,border:`1px solid ${C.blue}33`}}>{l.service}</span>}
                  {l.workers&&<span className="pill" style={{background:`${C.amber}18`,color:C.amber,border:`1px solid ${C.amber}33`}}>👷 {l.workers}</span>}
                  {!l.nextStep&&!["Closed Won","Closed Lost"].includes(l.stage)&&<span className="pill" style={{background:`${C.red}18`,color:C.red,border:`1px solid ${C.red}44`}}>⚠ No next step</span>}
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.txt3}}>
                  {l.nextStep?<span style={{color:C.amber,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"55%"}}>{l.nextStep}</span>:<span/>}
                  <span style={{color:od?C.red:(dl!==null&&dl<=3)?C.amber:C.txt3,fontWeight:(od||(dl!==null&&dl<=3))?600:400}}>{od?"⚠ ":""}{fmtDate(l.nextStepDate)}{(!od&&dl!==null&&dl<=3)?" ("+dl+"d)":""}</span>
                </div>
              </div>
            );
          })}
        </div>
        {isAdmin&&(
          <div>
            <button className="btn" onClick={()=>setShowDanger(!showDanger)} style={{width:"100%",background:"transparent",color:C.txt3,padding:"8px",fontSize:10,borderRadius:7,border:`1px dashed ${C.border2}`}}>{showDanger?"▲ Hide":"▼ More actions..."}</button>
            {showDanger&&(
              <div style={{marginTop:8,background:`${C.red}08`,border:`1px solid ${C.red}33`,borderRadius:10,padding:12}}>
                <div style={{fontSize:10,color:C.red,fontWeight:600,marginBottom:8}}>ARCHIVE</div>
                <div style={{fontSize:11,color:C.txt3,marginBottom:10}}>Move this company and all its {hqLocs.length} location(s) to archive.</div>
                <button className="btn" onClick={onDeleteHQ} style={{width:"100%",background:`${C.red}18`,color:C.red,padding:"10px",fontSize:12,borderRadius:8,border:`1px solid ${C.red}44`}}>📦 Archive company + {hqLocs.length} location(s)</button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mf" style={{display:"flex",flexDirection:"column",gap:8}}>
        {onUpdateHQ&&(
          <button className="btn" onClick={()=>setShowAI(v=>!v)}
            style={{width:"100%",background:showAI?`${C.teal}22`:`${C.teal}12`,color:C.teal,padding:"11px",fontSize:13,borderRadius:10,border:`1px solid ${C.teal}44`}}>
            🤖 {showAI?"Hide AI Assistant":"AI Assistant"}
          </button>
        )}
        {showAI&&onUpdateHQ&&curUser&&(
          <div style={{background:C.bg2,border:`1px solid ${C.teal}33`,borderRadius:12,overflow:"hidden",maxHeight:420,display:"flex",flexDirection:"column"}}>
            <AIChatTab locs={hqLocs} hqs={[hq]} users={users} cur={curUser}
              onUpdateLoc={onUpdateLoc} onUpdateHQ={onUpdateHQ}/>
          </div>
        )}
        <button className="btn" onClick={onEditHQ} style={{width:"100%",background:C.bg3,color:C.txt2,padding:"13px",fontSize:13,borderRadius:10,border:`1px solid ${C.border}`}}>✎ Edit HQ Info</button>
      </div>
    </div>
  );
}


// ─── INLINE EDIT FIELD ───────────────────────────────────────────
function InlineEditField({label, value, onSave, color, multiline=false, placeholder=""}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const taRef = useRef(null);

  useEffect(()=>{ setDraft(value); },[value]);
  useEffect(()=>{ if(editing && taRef.current) taRef.current.focus(); },[editing]);

  const save = () => { onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };

  return(
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <div className="lbl" style={{marginBottom:0,color:color||C.txt3}}>{label}</div>
        {!editing && (
          <button className="btn" onClick={()=>setEditing(true)}
            style={{background:`${C.blue}18`,color:C.blue2,padding:"2px 8px",fontSize:10,borderRadius:5,border:`1px solid ${C.blue}33`}}>
            ✎ Edit
          </button>
        )}
      </div>
      {editing ? (
        <div>
          {multiline ? (
            <textarea ref={taRef} value={draft} onChange={e=>setDraft(e.target.value)} rows={5}
              style={{width:"100%",background:C.bg4,border:`1.5px solid ${C.blue}`,color:C.txt,borderRadius:8,padding:"10px 12px",fontSize:13,fontFamily:"'Inter',sans-serif",resize:"vertical",lineHeight:1.7,outline:"none"}}
              placeholder={placeholder}/>
          ) : (
            <input ref={taRef} type="text" value={draft} onChange={e=>setDraft(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter")save();if(e.key==="Escape")cancel();}}
              style={{width:"100%",background:C.bg4,border:`1.5px solid ${C.blue}`,color:C.txt,borderRadius:8,padding:"9px 12px",fontSize:13,fontFamily:"'Inter',sans-serif",outline:"none"}}/>
          )}
          <div style={{display:"flex",gap:6,marginTop:6}}>
            <button className="btn" onClick={save}
              style={{flex:1,background:`linear-gradient(135deg,${C.green},${C.teal})`,color:"#fff",padding:"8px",fontSize:12,borderRadius:7}}>✓ Save</button>
            <button className="btn" onClick={cancel}
              style={{flex:1,background:C.bg4,color:C.txt3,padding:"8px",fontSize:12,borderRadius:7,border:`1px solid ${C.border}`}}>✕ Cancel</button>
          </div>
        </div>
      ) : (
        <div onClick={()=>setEditing(true)} style={{cursor:"text",fontSize:13,color:value?C.txt2:C.txt3,lineHeight:1.7,padding:"6px 8px",background:C.bg4,borderRadius:7,border:`1px solid ${C.border}`,minHeight:36,fontStyle:value?"normal":"italic"}}>
          {value || (placeholder || "Click to edit...")}
        </div>
      )}
    </div>
  );
}

// ─── LOCATION DETAIL MODAL ───────────────────────────────────────
function LocDetailModal({loc,hqs,users,isAdmin,canArchive,canEdit,onClose,onEdit,onArchive,onUpdate,onUpdateHQ}) {
  const hq=hqs.find(h=>h.id===loc.parentId);
  const sc=getSC()[loc.stage]||C.txt3;
  const uN=id=>users.find(u=>u.id===id)?.name||"—";
  const [showDanger,setShowDanger]=useState(false);
  const [showAI,setShowAI]=useState(false);
  const [showDebrief,setShowDebrief]=useState(false);
  const [showEmail,setShowEmail]=useState(false);
  const [showStageGuide,setShowStageGuide]=useState(false);
  const [showQuickScript,setShowQuickScript]=useState(false);
  const [pendingStage,setPendingStage]=useState(null);
  const [stagePrompt,setStagePrompt]=useState("");

  const handleStageChange = (newStage) => {
    if(newStage===loc.stage) return;
    const logStageChange = (extraPatch={}) => {
      const act = {id:Date.now(),type:"Note",note:`Stage → ${newStage}`,date:new Date().toISOString().slice(0,10),time:new Date().toTimeString().slice(0,5)};
      onUpdate(loc.id,{stage:newStage,activities:[act,...(loc.activities||[])],...extraPatch});
    };
    if(newStage==="Meeting Done") {
      logStageChange();
      setShowDebrief(true);
    } else if(newStage==="Closed Lost") {
      if(confirm("Mark as Closed Lost?\n\nWe'll open Edit so you can fill Lost Reason — this data helps the team.")) {
        logStageChange();
        onEdit();
      }
    } else if(newStage==="Proposal Sent") {
      const d3 = new Date(); d3.setDate(d3.getDate()+3);
      logStageChange({nextStep:"Follow-up on proposal",nextStepDate:d3.toISOString().slice(0,10)});
    } else {
      logStageChange();
    }
  };

  return(
    <div className="modal" style={{zIndex:110}}>
      <div className="mh">
        <div style={{flex:1,minWidth:0,paddingRight:10}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
            <HealthDot loc={loc} size={8}/>
            <span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:16,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{loc.company}</span>
          </div>
          <div style={{fontSize:11,color:C.txt3}}>📍 {loc.location} · {loc.county}{hq?<span style={{color:C.indigo}}> · ↑ {hq.company}</span>:""}</div>
        </div>
        <button className="xb" onClick={onClose}>×</button>
      </div>
      <div className="ms">
        {/* Stage + Temp selectors */}
        <div style={{display:"flex",gap:8}}>
          <select value={loc.stage} onChange={e=>handleStageChange(e.target.value)} className="fi" style={{flex:1,fontSize:13}}>{STAGES.map(s=><option key={s}>{s}</option>)}</select>
          <select value={loc.temp} onChange={e=>{const act={id:Date.now(),type:"Note",note:`Temperature → ${e.target.value}`,date:new Date().toISOString().slice(0,10),time:new Date().toTimeString().slice(0,5)};onUpdate(loc.id,{temp:e.target.value,activities:[act,...(loc.activities||[])]});}} className="fi" style={{width:105,fontSize:13}}>{TEMPS.map(t=><option key={t}>{t}</option>)}</select>
          <button className="btn" title={`Stage guide: ${loc.stage}`} onClick={()=>setShowStageGuide(true)}
            style={{background:`${C.indigo}18`,color:C.indigo,padding:"8px 10px",fontSize:13,borderRadius:8,border:`1px solid ${C.indigo}33`,flexShrink:0}}>📖</button>
        </div>

        {/* PRE-CALL BRIEF — instant context before dialing */}
        {(loc.phone||loc.email)&&!["Closed Won","Closed Lost"].includes(loc.stage)&&(
          <div style={{background:`linear-gradient(135deg,${C.bg3},${C.bg2})`,border:`1px solid ${C.border2}`,borderLeft:`3px solid ${C.blue}`,borderRadius:10,padding:"11px 14px"}}>
            <div style={{fontSize:9,fontWeight:700,color:C.txt3,letterSpacing:"0.1em",marginBottom:8}}>📞 PRE-CALL BRIEF</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:loc.spin?.p?8:0}}>
              {loc.lastContact&&<div style={{fontSize:11}}><span style={{color:C.txt3}}>Last contact: </span><span style={{color:C.txt2,fontWeight:500}}>{fmtDate(loc.lastContact)}</span></div>}
              {loc.painScore&&<div style={{fontSize:11}}><span style={{color:C.txt3}}>Pain: </span><span style={{color:loc.painScore>=4?C.red:loc.painScore>=3?C.amber:C.green,fontWeight:700}}>{loc.painScore}/5 {["","❄️","🟡","🟠","🔥","💥"][loc.painScore]||""}</span></div>}
              {loc.workers&&<div style={{fontSize:11}}><span style={{color:C.txt3}}>Workers: </span><span style={{color:C.amber,fontWeight:600}}>{loc.workers} {loc.workerType||""}</span></div>}
              {loc.currentSupplier&&<div style={{fontSize:11}}><span style={{color:C.txt3}}>Current supplier: </span><span style={{color:C.orange,fontWeight:500}}>{loc.currentSupplier}</span></div>}
            </div>
            {loc.spin?.p&&<div style={{fontSize:12,color:C.indigo,lineHeight:1.5,background:`${C.indigo}10`,borderRadius:6,padding:"6px 10px"}}><span style={{fontWeight:700,fontSize:10}}>PAIN: </span>{loc.spin.p.substring(0,140)}{loc.spin.p.length>140?"...":""}</div>}
            {(loc.activities||[]).length>0&&(
              <div style={{fontSize:11,color:C.txt3,marginTop:6,borderTop:`1px solid ${C.border}`,paddingTop:6}}>
                <span style={{color:C.blue2,fontWeight:600}}>{(loc.activities||[])[0]?.type}: </span>
                {(loc.activities||[])[0]?.note?.substring(0,80)}{((loc.activities||[])[0]?.note?.length||0)>80?"...":""}
                <span style={{color:C.txt3,marginLeft:6}}>{(loc.activities||[])[0]?.date?.slice(5)}</span>
              </div>
            )}
          </div>
        )}

        {/* Contextual AI hint (automatic) */}
        <ContextualHint loc={loc} hq={hq}/>
        <StageHint stage={loc.stage} spin={loc.spin} nextStep={loc.nextStep} checklistDone={(()=>{const h=hqs.find(x=>x.id===loc.parentId);return Object.values(h?.preCallChecklist||{}).filter(Boolean).length===12;})()}/>

        {/* Next Step */}
        {(()=>{
          const od=isOD(loc.nextStepDate,loc.stage);const dl=daysLeft(loc.nextStepDate);const active=loc.stage!=="Closed Won"&&loc.stage!=="Closed Lost";
          if(!active)return null;
          return(
            <div style={{background:od?`${C.red}18`:loc.nextStepDate?`${C.amber}12`:C.bg3,border:`1.5px solid ${od?C.red:loc.nextStepDate?C.amber:C.border}`,borderRadius:10,padding:"10px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:loc.nextStep?4:0}}>
                <div className="lbl" style={{color:od?C.red:loc.nextStepDate?C.amber:C.txt3,marginBottom:0}}>{od?"⚠ OVERDUE":loc.nextStepDate?"📅 NEXT STEP":"NEXT STEP"}</div>
                {loc.nextStepDate&&<div style={{fontSize:11,fontWeight:600,color:od?C.red:C.amber}}>{fmtDate(loc.nextStepDate)}{(!od&&dl!==null&&dl<=3)?" ("+dl+"d)":""}</div>}
              </div>
              {loc.nextStep?<div style={{fontSize:13,color:od?C.red:C.txt,fontWeight:500,lineHeight:1.5}}>{loc.nextStep}</div>:<div style={{fontSize:12,color:C.txt3,fontStyle:"italic"}}>No next step — add one in Edit</div>}
            </div>
          );
        })()}

        {/* Won/Lost outcome block */}
        {(loc.stage==="Closed Won"||loc.stage==="Closed Lost")&&(
          <div style={{background:loc.stage==="Closed Won"?`${C.green}12`:`${C.red}10`,border:`1.5px solid ${loc.stage==="Closed Won"?C.green:C.red}44`,borderRadius:10,padding:"12px 14px"}}>
            <div className="lbl" style={{color:loc.stage==="Closed Won"?C.green:C.red,marginBottom:8}}>{loc.stage==="Closed Won"?"🏆 CLOSED WON":"❌ CLOSED LOST"}</div>
            {loc.stage==="Closed Won"?(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div><div className="lbl" style={{fontSize:9}}>SIGNED DATE</div><div style={{fontSize:13,color:C.green,fontWeight:600}}>{fmtDate(loc.wonDate)||"—"}</div></div>
                <div><div className="lbl" style={{fontSize:9}}>WORKERS</div><div style={{fontSize:13,color:C.green,fontWeight:600}}>{loc.workers||"—"}</div></div>
                {loc.wonNotes&&<div style={{gridColumn:"1/-1"}}><div className="lbl" style={{fontSize:9}}>WHAT CLOSED THE DEAL</div><div style={{fontSize:12,color:C.txt2,lineHeight:1.5}}>{loc.wonNotes}</div></div>}
              </div>
            ):(
              <>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <div><div className="lbl" style={{fontSize:9}}>LOST DATE</div><div style={{fontSize:13,color:C.red,fontWeight:600}}>{fmtDate(loc.lostDate)||"—"}</div></div>
                  <div><div className="lbl" style={{fontSize:9}}>REASON</div><div style={{fontSize:13,color:C.txt3,fontWeight:500}}>{loc.lostReason||"—"}</div></div>
                </div>
                {loc.lostDescription&&<div><div className="lbl" style={{fontSize:9}}>WHAT HAPPENED</div><div style={{fontSize:12,color:C.txt2,lineHeight:1.5}}>{loc.lostDescription}</div></div>}
                {loc.lostLesson&&<div style={{marginTop:6}}><div className="lbl" style={{fontSize:9}}>WHAT TO DO DIFFERENTLY</div><div style={{fontSize:12,color:C.txt2,lineHeight:1.5}}>{loc.lostLesson}</div></div>}
              </>
            )}
          </div>
        )}

        {/* Contact card */}
        <div style={{background:C.bg3,border:`1px solid ${C.border}`,borderLeft:`3px solid ${sc}`,borderRadius:10,padding:13}}>
          <div className="lbl">LOCAL CONTACT</div>
          <div style={{fontWeight:700,fontSize:15,color:C.txt}}>{loc.contact||"—"}</div>
          <div style={{fontSize:12,color:C.txt3,marginBottom:12}}>{loc.role||"—"}</div>
          {loc.phone&&<a href={"tel:"+loc.phone} style={{display:"block",background:`${C.blue}18`,border:`1px solid ${C.blue}44`,color:C.blue2,padding:"11px",fontSize:13,fontWeight:600,textAlign:"center",marginBottom:8,textDecoration:"none",borderRadius:8}}>📞 {loc.phone}</a>}
          {loc.email&&<a href={"mailto:"+loc.email} style={{display:"block",background:`${C.teal}18`,border:`1px solid ${C.teal}44`,color:C.teal,padding:"11px",fontSize:13,fontWeight:600,textAlign:"center",textDecoration:"none",borderRadius:8,marginBottom:8}}>✉ {loc.email}</a>}
          {loc.address&&<a href={mapsUrl(loc.address)} target="_blank" rel="noopener" style={{display:"block",background:`${C.green}18`,border:`1px solid ${C.green}44`,color:C.green,padding:"11px",fontSize:13,fontWeight:600,textAlign:"center",textDecoration:"none",borderRadius:8}}>📍 {loc.address}</a>}
        </div>

        {/* Key values grid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["SERVICE",loc.service||"—"],["ENTITY",loc.companyName||"—"],["WORKERS",loc.workers||"—"],["TYPE",loc.workerType||"—"],["EMPLOYEES",loc.employees||"—"],["SOURCE",loc.source||"—"],["LAST CONTACT",fmtDate(loc.lastContact)],["SALESPERSON",uN(loc.salesId)],["INDUSTRY",loc.industry||"—"]].map(([l,v])=>(
            <div key={l} className="kv"><div className="lbl">{l}</div><div style={{fontSize:12,color:C.txt,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v}</div></div>
          ))}
        </div>

        {/* Pain Score */}
        {loc.stage!=="New"&&(
          <div style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px"}}>
            <div className="lbl">PAIN SCORE</div>
            <div style={{display:"flex",gap:6,marginTop:6,alignItems:"center"}}>
              {[1,2,3,4,5].map(n=>(
                <div key={n} style={{width:28,height:28,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,background:loc.painScore>=n?`${C.red}${Math.round(40+n*15).toString(16)}`:`${C.red}18`,color:loc.painScore>=n?"#fff":C.txt3}}>{n}</div>
              ))}
              {loc.painScore&&<span style={{fontSize:11,color:C.txt3,marginLeft:4}}>{["","Cold","Low","Moderate","High","Critical"][loc.painScore]||""}</span>}
            </div>
          </div>
        )}

        {/* MEDDIC */}
        {(loc.decisionProcess||loc.economicBuyer||loc.decisionCriteria||loc.champion)&&(
          <div style={{background:C.bg3,border:`1px solid ${C.indigo}33`,borderRadius:10,padding:12}}>
            <div className="lbl" style={{color:C.indigo,marginBottom:8}}>MEDDIC</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {loc.decisionProcess&&<div className="kv"><div className="lbl">DECISION PROCESS</div><div style={{fontSize:12,color:C.txt2,lineHeight:1.5}}>{loc.decisionProcess}</div></div>}
              {loc.economicBuyer&&<div className="kv"><div className="lbl">ECONOMIC BUYER</div><div style={{fontSize:12,color:C.amber,lineHeight:1.5}}>{loc.economicBuyer}</div></div>}
              {loc.decisionCriteria&&<div className="kv" style={{gridColumn:"1/-1"}}><div className="lbl">DECISION CRITERIA</div><div style={{fontSize:12,color:C.txt2,lineHeight:1.5}}>{loc.decisionCriteria}</div></div>}
              {loc.champion&&<div className="kv" style={{gridColumn:"1/-1"}}><div className="lbl">CHAMPION</div><div style={{fontSize:12,color:C.green,lineHeight:1.5}}>{loc.champion}</div></div>}
            </div>
          </div>
        )}

        {/* SPIN */}
        {(loc.spin?.s||loc.spin?.p||loc.spin?.i||loc.spin?.n||loc.spinReal?.s||loc.spinReal?.p)&&(
          <div style={{background:C.bg3,border:`1px solid ${C.indigo}44`,borderRadius:10,padding:12}}>
            <div className="lbl" style={{color:C.indigo,marginBottom:8}}>SPIN DISCOVERY</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {(loc.spin?.s||loc.spin?.p||loc.spin?.i||loc.spin?.n)&&(
                <div style={{background:`${C.indigo}08`,borderRadius:8,padding:"8px 10px"}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.indigo,marginBottom:6}}>📋 PRE-MEETING</div>
                  {[["s","Situation"],["p","Problem"],["i","Implication"],["n","Need-Payoff"]].map(([k,label])=>loc.spin?.[k]?(
                    <div key={k} style={{marginBottom:6}}><div style={{fontSize:9,fontWeight:700,color:C.indigo,marginBottom:2}}>{k.toUpperCase()} — {label}</div><div style={{fontSize:12,color:C.txt2,lineHeight:1.5}}>{loc.spin[k]}</div></div>
                  ):null)}
                </div>
              )}
              {(loc.spinReal?.s||loc.spinReal?.p||loc.spinReal?.i||loc.spinReal?.n)&&(
                <div style={{background:`${C.green}08`,borderRadius:8,padding:"8px 10px"}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.green,marginBottom:6}}>✅ POST-MEETING</div>
                  {[["s","Situation"],["p","Problem"],["i","Implication"],["n","Need-Payoff"]].map(([k,label])=>loc.spinReal?.[k]?(
                    <div key={k} style={{marginBottom:6}}><div style={{fontSize:9,fontWeight:700,color:C.green,marginBottom:2}}>{k.toUpperCase()} — {label}</div><div style={{fontSize:12,color:C.txt2,lineHeight:1.5}}>{loc.spinReal[k]}</div></div>
                  ):null)}
                </div>
              )}
            </div>
            {loc.spin?.painSummary&&<div style={{marginTop:8,background:`${C.red}18`,border:`1px solid ${C.red}33`,borderRadius:8,padding:"9px 11px"}}><div className="lbl" style={{color:C.red,fontSize:9}}>💥 PAIN SUMMARY</div><div style={{fontSize:12,color:C.txt,fontStyle:"italic",lineHeight:1.5,marginTop:4}}>"{loc.spin.painSummary}"</div></div>}
          </div>
        )}

        {/* Inline editable NOTES */}
        <InlineEditField label="NOTES" value={loc.notes||""} color={C.txt3}
          onSave={v=>onUpdate(loc.id,{notes:v})}/>

        <ActivityLog loc={loc} onUpdate={onUpdate}/>

        {/* Inline editable HQ intelligence + notes from location view */}
        {hq&&(
          <div style={{background:C.bg3,border:`1px solid ${C.indigo}44`,borderRadius:10,padding:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div className="lbl" style={{color:C.indigo,marginBottom:0}}>🏢 {hq.company}</div>
              <span style={{fontSize:10,color:C.txt3}}>{hq.centralContact} · {hq.industry}</span>
            </div>
            <InlineEditField label="HQ INTELLIGENCE" value={hq.intelligence||""} color={C.indigo} multiline
              onSave={v=>onUpdateHQ&&onUpdateHQ(hq.id,{intelligence:v})}
              placeholder="Research, financials, DM LinkedIn, seasonality..."/>
            <InlineEditField label="HQ NOTES" value={hq.notes||""} color={C.txt3} multiline
              onSave={v=>onUpdateHQ&&onUpdateHQ(hq.id,{notes:v})}
              placeholder="Internal notes about this company..."/>
          </div>
        )}
        {canArchive&&(
          <div>
            <button className="btn" onClick={()=>setShowDanger(!showDanger)} style={{width:"100%",background:"transparent",color:C.txt3,padding:"8px",fontSize:10,borderRadius:7,border:`1px dashed ${C.border2}`}}>{showDanger?"▲ Hide":"▼ More actions..."}</button>
            {showDanger&&<div style={{marginTop:8,background:`${C.red}08`,border:`1px solid ${C.red}33`,borderRadius:10,padding:12}}><div style={{fontSize:10,color:C.red,fontWeight:600,marginBottom:8}}>ARCHIVE</div><div style={{fontSize:11,color:C.txt3,marginBottom:10}}>Move this location to archive.</div><button className="btn" onClick={onArchive} style={{width:"100%",background:`${C.red}18`,color:C.red,padding:"10px",fontSize:12,borderRadius:8,border:`1px solid ${C.red}44`}}>📦 Archive this location</button></div>}
          </div>
        )}
      </div>
      <div className="mf" style={{display:"flex",gap:8}}>
        <button className="btn" onClick={()=>setShowDebrief(true)} style={{background:`${C.blue}18`,color:C.blue2,padding:"12px 14px",fontSize:13,borderRadius:10,border:`1px solid ${C.blue}33`}} title="Post-Call Debrief">📞</button>
        <button className="btn" onClick={()=>setShowEmail(true)} style={{background:`${C.teal}18`,color:C.teal,padding:"12px 14px",fontSize:13,borderRadius:10,border:`1px solid ${C.teal}33`}} title="AI Email Draft">✉️</button>
        <button className="btn" onClick={()=>setShowQuickScript(v=>!v)} style={{background:showQuickScript?`${C.amber}28`:`${C.amber}15`,color:C.amber,padding:"12px 14px",fontSize:13,borderRadius:10,border:`1px solid ${showQuickScript?C.amber:C.amber+"44"}`}} title="Quick Script for this client">📋</button>
        {canEdit?<button className="btn" onClick={onEdit} style={{flex:1,background:`linear-gradient(135deg,${C.blue},${C.indigo})`,color:"#fff",padding:"13px",fontSize:14,borderRadius:10}}>✎ Edit</button>
        :<div style={{flex:1,padding:"13px",fontSize:12,color:C.txt3,textAlign:"center"}}>View only</div>}
        <button className="btn" onClick={()=>setShowAI(!showAI)} style={{background:showAI?`${C.teal}28`:`${C.teal}18`,color:C.teal,padding:"13px 16px",fontSize:14,borderRadius:10,border:`1px solid ${showAI?C.teal:C.teal+"44"}`}} title="AI Assistant">🤖</button>
      </div>
      {showAI&&<InlineAI loc={loc} hq={hq} onUpdate={onUpdate} onUpdateHQ={onUpdateHQ}/>}
      {showQuickScript&&<QuickScriptModal loc={loc} hq={hq} onClose={()=>setShowQuickScript(false)}/>}
      {showDebrief&&<PostCallDebrief loc={loc} hq={hq} onClose={()=>setShowDebrief(false)} onApply={onUpdate}/>}
      {showEmail&&<EmailDraftModal loc={loc} hq={hq} onClose={()=>setShowEmail(false)}/>}
      {showStageGuide&&(()=>{
        const pb = INIT_PLAYBOOK;
        const stageMap = {"New":"new","Contacted":"contacted","Interested":"interested","Meeting Scheduled":"meeting","Meeting Done":"done","Proposal Sent":"proposal","Negotiation":"negotiation","Closed Won":"won","Closed Lost":"lost","No Answer":"noanswer"};
        const card = pb.stages.find(s=>s.id===stageMap[loc.stage]);
        return(
          <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)setShowStageGuide(false);}}>
            <div className="sheet" style={{maxHeight:"85vh"}}>
              <div style={{padding:"13px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                <div style={{width:26,height:26,borderRadius:7,background:`${C.indigo}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>📖</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:14,color:C.txt}}>Stage Guide: {loc.stage}</div>
                  {card&&<div style={{fontSize:11,color:C.txt3}}>{card.title}</div>}
                </div>
                <button className="xb" onClick={()=>setShowStageGuide(false)}>×</button>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:14}}>
                {card?(
                  <>
                    <div style={{background:`${C.amber}12`,border:`1px solid ${C.amber}33`,borderRadius:8,padding:"9px 12px",fontSize:12,color:C.amber,marginBottom:12}}>🎯 {card.target}</div>
                    {card.quick&&card.quick.length>0&&(
                      <div style={{background:`linear-gradient(135deg,${C.amber}15,${C.orange}08)`,border:`2px solid ${C.amber}44`,borderRadius:10,padding:"11px 14px",marginBottom:12}}>
                        <div style={{fontSize:10,fontWeight:700,color:C.amber,letterSpacing:"0.1em",marginBottom:8}}>⚡ QUICK VIEW</div>
                        {card.quick.map((b,i)=>(
                          <div key={i} style={{display:"flex",gap:8,marginBottom:6}}>
                            <span style={{color:C.amber,fontWeight:700,fontSize:12,flexShrink:0}}>{i+1}.</span>
                            <span style={{fontSize:12,color:C.txt,lineHeight:1.6}}>{b}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{fontSize:10,color:C.txt3,marginBottom:8,fontStyle:"italic"}}>📖 Full manual:</div>
                    <pre style={{fontFamily:"'Inter',sans-serif",fontSize:13,color:C.txt2,lineHeight:1.9,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{card.tasks}</pre>
                  </>
                ):(
                  <div style={{color:C.txt3,fontSize:13,padding:20,textAlign:"center"}}>No guide for this stage.</div>
                )}
              </div>
              <div style={{padding:"12px 14px",borderTop:`1px solid ${C.border}`,flexShrink:0}}>
                <button className="btn" onClick={()=>setShowStageGuide(false)} style={{width:"100%",background:C.bg3,color:C.txt2,padding:"11px",fontSize:13,borderRadius:9,border:`1px solid ${C.border}`}}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}


// ─── FILTER BAR ──────────────────────────────────────────────────
function FilterBar({filters,setFilters,users,isAdmin,isTeamLead,curId,services,entities}) {
  const [open,setOpen]=useState(false);
  const active=[filters.stage!=="All",filters.temp!=="All",filters.service!=="All",filters.entity!=="All",filters.county!=="All",filters.industry!=="All",filters.salesId!=="All",filters.overdueOnly,filters.myOnly].filter(Boolean).length;
  const Sel=({label,k,opts})=>{
    const v=filters[k]||"All";
    const optsArr=opts.map(o=>typeof o==="string"?{v:o,l:o}:o);
    return(
      <div>
        <div className="lbl">{label}</div>
        <select value={v} onChange={e=>setFilters({...filters,[k]:e.target.value})} className="fi" style={{fontSize:12}}>
          <option value="All">All</option>
          {optsArr.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      </div>
    );
  };
  const chips=[
    filters.myOnly&&{k:"myOnly",v:"My Leads",c:C.purple},
    filters.stage!=="All"&&{k:"stage",v:filters.stage,c:C.indigo},
    filters.temp!=="All"&&{k:"temp",v:filters.temp,c:C.amber},
    filters.service!=="All"&&{k:"service",v:filters.service,c:C.blue},
    filters.entity!=="All"&&{k:"entity",v:filters.entity,c:C.teal},
    filters.county!=="All"&&{k:"county",v:filters.county,c:C.green},
    filters.industry!=="All"&&{k:"industry",v:filters.industry,c:C.orange},
    filters.salesId!=="All"&&{k:"salesId",v:users.find(u=>String(u.id)===filters.salesId)?.name,c:C.purple},
    filters.overdueOnly&&{k:"overdueOnly",v:"Overdue",c:C.red},
  ].filter(Boolean);
  return(
    <div style={{background:C.bg0,borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
      <div style={{padding:"8px 12px",display:"flex",gap:7,alignItems:"center",overflowX:"auto"}}>
        <button className="btn" onClick={()=>setOpen(!open)} style={{background:open||active>0?`${C.blue}22`:C.bg3,color:open||active>0?C.blue2:C.txt3,padding:"6px 11px",fontSize:11,borderRadius:7,border:`1.5px solid ${open||active>0?C.blue:C.border}`,flexShrink:0}}>Filters{active>0?` (${active})`:""}</button>
        <button className="btn" onClick={()=>setFilters({...filters,myOnly:!filters.myOnly})} style={{background:filters.myOnly?`${C.purple}22`:C.bg3,color:filters.myOnly?C.purple:C.txt3,padding:"6px 11px",fontSize:11,borderRadius:7,border:`1.5px solid ${filters.myOnly?C.purple:C.border}`,flexShrink:0}}>My Leads</button>
        {chips.map(ch=>(
          <span key={ch.k} className="chip" style={{background:`${ch.c}18`,color:ch.c,borderColor:`${ch.c}44`}} onClick={()=>setFilters({...filters,[ch.k]:ch.k==="overdueOnly"||ch.k==="myOnly"?false:"All"})}>
            {ch.v} ×
          </span>
        ))}
        {active>0&&<button className="btn" onClick={()=>setFilters({stage:"All",temp:"All",service:"All",entity:"All",county:"All",industry:"All",salesId:"All",overdueOnly:false,myOnly:false,showLocs:filters.showLocs})} style={{background:"transparent",color:C.red,padding:"6px 10px",fontSize:11,borderRadius:7,border:`1px solid ${C.red}44`,flexShrink:0}}>Clear all</button>}
      </div>
      {open&&(
        <div style={{padding:"12px",borderTop:`1px solid ${C.border}`,display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Sel label="STAGE" k="stage" opts={STAGES}/>
            <Sel label="TEMPERATURE" k="temp" opts={TEMPS}/>
            <Sel label="SERVICE" k="service" opts={services}/>
            <Sel label="ENTITY" k="entity" opts={entities}/>
            <Sel label="COUNTY" k="county" opts={COUNTIES}/>
            <Sel label="INDUSTRY" k="industry" opts={INDUSTRIES}/>
            {(isAdmin||isTeamLead)&&<Sel label="SALESPERSON" k="salesId" opts={users.filter(u=>u.active).map(u=>({v:String(u.id),l:u.name}))}/>}
          </div>
          <button className="btn" onClick={()=>setFilters({...filters,overdueOnly:!filters.overdueOnly})}
            style={{background:filters.overdueOnly?`${C.red}22`:C.bg4,color:filters.overdueOnly?C.red:C.txt3,padding:"9px",fontSize:12,borderRadius:8,border:`1.5px solid ${filters.overdueOnly?C.red:C.border}`}}>
            {filters.overdueOnly?"✓ Overdue Only":"⚠ Show Overdue Only"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── TEAM TAB ────────────────────────────────────────────────────
function TeamTab({users,locs,onSelect}) {
  const [exp,setExp]=useState(null);
  return(
    <div style={{flex:1,overflowY:"auto",padding:"12px 12px 80px",display:"flex",flexDirection:"column",gap:10}}>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:11,color:C.txt3,letterSpacing:"0.1em",marginBottom:2}}>TEAM OVERVIEW</div>
      {users.filter(u=>u.active).map(u=>{
        const ul=locs.filter(l=>l.salesId===u.id);const won=ul.filter(l=>l.stage==="Closed Won");const pipe=ul.filter(l=>l.stage!=="Closed Won"&&l.stage!=="Closed Lost");const late=ul.filter(l=>isOD(l.nextStepDate,l.stage));const placed=won.reduce((s,l)=>s+(parseInt(l.workers)||0),0);const isE=exp===u.id;
        return(
          <div key={u.id} style={{background:C.bg2,border:`1px solid ${isE?C.blue:C.border}`,borderRadius:12}}>
            <div onClick={()=>setExp(isE?null:u.id)} style={{padding:"13px 14px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:34,height:34,borderRadius:10,background:`linear-gradient(135deg,${C.blue},${C.indigo})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,color:"#fff",flexShrink:0}}>{u.name[0]}</div>
                <div><div style={{fontWeight:600,fontSize:14,color:C.txt}}>{u.name} <span style={{fontSize:10,color:u.role==="admin"?C.purple:u.role==="team_lead"?C.amber:C.txt3}}>{u.role==="admin"?"ADMIN":u.role==="team_lead"?"TL":""}</span></div><div style={{fontSize:11,color:C.txt3}}>{ul.length} locations · {placed} workers placed</div></div>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {late.length>0&&<span className="pill" style={{background:`${C.red}18`,color:C.red,border:`1px solid ${C.red}44`}}>⚠{late.length}</span>}
                <span className="pill" style={{background:`${C.green}18`,color:C.green,border:`1px solid ${C.green}44`}}>{ul.length?Math.round(won.length/ul.length*100):0}%</span>
                <span style={{color:C.txt3,fontSize:12}}>{isE?"▲":"▼"}</span>
              </div>
            </div>
            <div style={{display:"flex",borderTop:`1px solid ${C.border}`}}>
              {[["Won",won.length,C.green],["Pipeline",pipe.length,C.amber],["Placed",placed,C.teal],["Late",late.length,C.red]].map(([l,v,c])=>(
                <div key={l} style={{flex:1,padding:"9px 6px",textAlign:"center",borderRight:`1px solid ${C.border}`}}>
                  <div style={{fontSize:17,fontWeight:700,color:c,fontFamily:"'Space Grotesk',sans-serif"}}>{v}</div>
                  <div style={{fontSize:9,color:C.txt3,marginTop:2}}>{l.toUpperCase()}</div>
                </div>
              ))}
            </div>
            {isE&&(
              <div style={{borderTop:`1px solid ${C.border}`,maxHeight:"60vh",overflowY:"auto"}}>
                <div style={{padding:"8px 14px 4px",background:C.bg3}}><span style={{fontSize:10,color:C.txt3,fontWeight:600,letterSpacing:"0.08em"}}>{ul.length} LOCATION{ul.length!==1?"S":""}</span></div>
                {ul.length===0&&<div style={{padding:"18px",textAlign:"center",color:C.txt3,fontSize:12}}>No locations assigned</div>}
                {ul.map(l=>{const sc=getSC()[l.stage]||C.txt3;const od=isOD(l.nextStepDate,l.stage);return(
                  <div key={l.id} className="row-hover" onClick={()=>onSelect(l)} style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:5}}>
                        <HealthDot loc={l} size={6}/>
                        <span style={{fontWeight:500,fontSize:13,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.company}</span>
                      </div>
                      <div style={{fontSize:11,color:C.txt3}}>📍 {l.location} · {l.county}</div>
                    </div>
                    <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0,marginLeft:8,flexDirection:"column"}}>
                      <span className="pill" style={{background:sc+"22",color:sc,border:`1px solid ${sc}44`}}>{l.stage}</span>
                      {od&&<span className="pill" style={{background:`${C.red}18`,color:C.red,border:`1px solid ${C.red}44`}}>⚠</span>}
                    </div>
                  </div>
                );})}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


// ─── LOCATION FORM ────────────────────────────────────────────────
function LocFormModal({form,setForm,onSave,onClose,editMode,users,isAdmin,hqs,services,entities}) {
  const [newCo,setNewCo]=useState(!form.parentId&&!editMode);
  const [newHQ,setNewHQ]=useState({company:"",industry:"",centralContact:"",centralRole:"",centralPhone:"",centralEmail:"",address:"",website:"",notes:""});
  return(
    <div className="modal" style={{zIndex:150}}>
      <div className="mh"><div style={{fontWeight:700,fontSize:16,color:C.txt}}>{editMode?"Edit Location":"New Location / Deal"}</div><button className="xb" onClick={onClose}>×</button></div>
      <div className="ms">
        {!editMode&&(
          <div style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
            <div className="lbl">COMPANY</div>
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              <button className="btn" onClick={()=>setNewCo(false)} style={{flex:1,padding:"8px",fontSize:12,borderRadius:7,background:!newCo?`${C.blue}22`:C.bg4,color:!newCo?C.blue2:C.txt3,border:`1.5px solid ${!newCo?C.blue:C.border}`}}>Existing Company</button>
              <button className="btn" onClick={()=>{setNewCo(true);setForm({...form,parentId:null,company:""})}} style={{flex:1,padding:"8px",fontSize:12,borderRadius:7,background:newCo?`${C.green}22`:C.bg4,color:newCo?C.green:C.txt3,border:`1.5px solid ${newCo?C.green:C.border}`}}>+ New Company</button>
            </div>
            {!newCo?(
              <select value={form.parentId||""} onChange={e=>{const id=Number(e.target.value);const h=hqs.find(x=>x.id===id);setForm({...form,parentId:id||null,company:h?.company||form.company,industry:h?.industry||form.industry});}} className="fi">
                <option value="">— select company —</option>
                {hqs.map(h=><option key={h.id} value={h.id}>{h.company}</option>)}
              </select>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div><div className="lbl">COMPANY NAME *</div><input type="text" value={newHQ.company} onChange={e=>{setNewHQ({...newHQ,company:e.target.value});setForm({...form,company:e.target.value});}} className="fi" placeholder="e.g. Autoliv Romania"/></div>
                <div><div className="lbl">INDUSTRY</div><select value={newHQ.industry} onChange={e=>setNewHQ({...newHQ,industry:e.target.value})} className="fi"><option value="">— select —</option>{INDUSTRIES.map(i=><option key={i}>{i}</option>)}</select></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div><div className="lbl">CENTRAL CONTACT (HQ)</div><input type="text" value={newHQ.centralContact} onChange={e=>setNewHQ({...newHQ,centralContact:e.target.value})} className="fi" placeholder="HR Director name"/></div>
                  <div><div className="lbl">CENTRAL ROLE</div><input type="text" value={newHQ.centralRole} onChange={e=>setNewHQ({...newHQ,centralRole:e.target.value})} className="fi" placeholder="e.g. HR Director"/></div>
                  <div><div className="lbl">HQ PHONE</div><input type="tel" value={newHQ.centralPhone} onChange={e=>setNewHQ({...newHQ,centralPhone:e.target.value})} className="fi"/></div>
                  <div><div className="lbl">HQ EMAIL</div><input type="email" value={newHQ.centralEmail} onChange={e=>setNewHQ({...newHQ,centralEmail:e.target.value})} className="fi"/></div>
                  <div><div className="lbl">HQ ADDRESS</div><input type="text" value={newHQ.address} onChange={e=>setNewHQ({...newHQ,address:e.target.value})} className="fi"/></div>
                  <div><div className="lbl">WEBSITE</div><input type="text" value={newHQ.website} onChange={e=>setNewHQ({...newHQ,website:e.target.value})} className="fi" placeholder="www.company.ro"/></div>
                </div>
              </div>
            )}
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={{gridColumn:"1/-1"}}><div className="lbl">LOCATION NAME *</div><input type="text" value={form.location} onChange={e=>setForm({...form,location:e.target.value})} className="fi" placeholder="e.g. Factory Timișoara"/></div>
          <div><div className="lbl">COUNTY</div><select value={form.county} onChange={e=>setForm({...form,county:e.target.value})} className="fi"><option value="">— select —</option>{COUNTIES.map(c=><option key={c}>{c}</option>)}</select></div>
          <div><div className="lbl">EMPLOYEES (at location)</div><input type="number" value={form.employees||""} onChange={e=>setForm({...form,employees:e.target.value})} className="fi"/></div>
          <div style={{gridColumn:"1/-1"}}><div className="lbl">ADDRESS</div><input type="text" value={form.address||""} onChange={e=>setForm({...form,address:e.target.value})} className="fi"/></div>
          <div><div className="lbl">INDUSTRY</div><select value={form.industry||""} onChange={e=>setForm({...form,industry:e.target.value})} className="fi"><option value="">— select —</option>{INDUSTRIES.map(i=><option key={i}>{i}</option>)}</select></div>
          <div><div className="lbl">LOCAL CONTACT</div><input type="text" value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} className="fi"/></div>
          <div>
            <div className="lbl">CONTACT ROLE</div>
            <div style={{display:"flex",gap:6}}>
              <select value={["HR Director","HR Manager","Plant Manager","Production Manager","Operations Director","General Manager","Owner","CEO"].includes(form.role)?form.role:"__custom"} onChange={e=>{if(e.target.value!=="__custom")setForm({...form,role:e.target.value});else setForm({...form,role:""}); }} className="fi" style={{flex:"0 0 auto",width:"55%"}}>
                <option value="">— select —</option>
                {["HR Director","HR Manager","Plant Manager","Production Manager","Operations Director","General Manager","Owner","CEO"].map(r=><option key={r}>{r}</option>)}
                <option value="__custom">✏ Custom...</option>
              </select>
              <input type="text" value={form.role} onChange={e=>setForm({...form,role:e.target.value})} className="fi" style={{flex:1}} placeholder="or type any role"/>
            </div>
          </div>
          <div><div className="lbl">PHONE</div><input type="tel" value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})} className="fi"/></div>
          <div><div className="lbl">EMAIL</div><input type="email" value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})} className="fi"/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><div className="lbl">STAGE</div><select value={form.stage} onChange={e=>setForm({...form,stage:e.target.value})} className="fi">{STAGES.map(s=><option key={s}>{s}</option>)}</select></div>
          <div><div className="lbl">TEMPERATURE</div><select value={form.temp} onChange={e=>setForm({...form,temp:e.target.value})} className="fi">{TEMPS.map(t=><option key={t}>{t}</option>)}</select></div>
          {[["SERVICE","service",services],["GREMI ENTITY","companyName",entities]].map(([l,k,opts])=>(
            <div key={k}><div className="lbl">{l}</div><select value={form[k]||""} onChange={e=>setForm({...form,[k]:e.target.value})} className="fi"><option value="">— select —</option>{opts.map(o=><option key={o}>{o}</option>)}</select></div>
          ))}
          <div><div className="lbl">WORKERS NEEDED</div><input type="number" value={form.workers||""} onChange={e=>setForm({...form,workers:e.target.value})} className="fi"/></div>
          <div><div className="lbl">LEAD SOURCE</div><select value={form.source||""} onChange={e=>setForm({...form,source:e.target.value})} className="fi"><option value="">— select —</option>{LEAD_SOURCES.map(s=><option key={s}>{s}</option>)}</select></div>
        </div>
        <div><div className="lbl">WORKER TYPE</div><WorkerTypeSelect value={form.workerType||""} onChange={v=>setForm({...form,workerType:v})}/></div>
        {isAdmin&&<div><div className="lbl">SALESPERSON</div><select value={form.salesId||""} onChange={e=>setForm({...form,salesId:Number(e.target.value)||null})} className="fi"><option value="">— select —</option>{users.filter(u=>u.active).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></div>}
        {/* SPIN — two-column PRE + POST */}
        <div style={{background:C.bg3,border:`1px solid ${C.indigo}44`,borderRadius:10,padding:12}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:10,fontWeight:600,color:C.indigo,letterSpacing:"0.08em",marginBottom:10}}>SPIN DISCOVERY NOTES</div>
          <div style={{display:"flex",gap:5,marginBottom:6,flexWrap:"wrap"}}>
            <span style={{fontSize:10,color:C.txt3,alignSelf:"center",marginRight:4}}>PRE:</span>
            {["s","p","i","n"].map(k=>(<span key={k} className="pill" style={{background:form.spin?.[k]?`${C.indigo}22`:C.bg2,color:form.spin?.[k]?C.indigo:C.txt3,border:`1px solid ${form.spin?.[k]?C.indigo+"44":C.border}`}}>{k.toUpperCase()}{form.spin?.[k]?" ✅":" ⬜"}</span>))}
            <span style={{fontSize:10,color:C.txt3,alignSelf:"center",marginLeft:8,marginRight:4}}>POST:</span>
            {["s","p","i","n"].map(k=>(<span key={"r"+k} className="pill" style={{background:form.spinReal?.[k]?`${C.green}22`:C.bg2,color:form.spinReal?.[k]?C.green:C.txt3,border:`1px solid ${form.spinReal?.[k]?C.green+"44":C.border}`}}>{k.toUpperCase()}{form.spinReal?.[k]?" ✅":" ⬜"}</span>))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div style={{background:`${C.indigo}08`,border:`1px solid ${C.indigo}22`,borderRadius:8,padding:"10px 12px"}}>
              <div style={{fontSize:10,fontWeight:700,color:C.indigo,letterSpacing:"0.08em",marginBottom:8}}>📋 PRE-MEETING — Hipotezy</div>
              <div style={{fontSize:10,color:C.txt3,marginBottom:8,lineHeight:1.4}}>Wypełnij PRZED spotkaniem. Co zakładasz o kliencie?</div>
              <SpinField label="S — SITUATION" hint={["What do you think their workforce setup looks like?","Who handles their staffing — is it working?","How many open roles have they been posting?"]} value={form.spin?.s||""} onChange={v=>setForm({...form,spin:{...form.spin,s:v}})}/>
              <SpinField label="P — PROBLEM" hint={["How long to fill a vacancy?","What happens when understaffed?","Compliance issues?"]} value={form.spin?.p||""} onChange={v=>setForm({...form,spin:{...form.spin,p:v}})}/>
              <SpinField label="I — IMPLICATION" hint={["If that problem exists — what is the likely business impact?","What does one week of this cost them?","How does it affect production commitments?"]} value={form.spin?.i||""} onChange={v=>setForm({...form,spin:{...form.spin,i:v}})}/>
              <SpinField label="N — NEED-PAYOFF" hint={["What outcome would solve their problem?","What would consistent staffing allow them to deliver?","What would one partner handling everything be worth?"]} value={form.spin?.n||""} onChange={v=>setForm({...form,spin:{...form.spin,n:v}})}/>
              <div style={{marginTop:8}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><div className="lbl" style={{marginBottom:0,color:C.indigo}}>🔍 PAIN HYPOTHESIS</div><span style={{fontSize:10,color:C.txt3}}>(PRE — your assumption)</span></div><textarea value={form.spin?.painHypothesis||""} onChange={e=>setForm({...form,spin:{...form.spin,painHypothesis:e.target.value}})} rows={3} className="fi" style={{resize:"vertical",fontSize:12}} placeholder='e.g. "They struggle to fill night shift — posting on eJobs 3 months. Cost: delayed production."'/></div>
            </div>
            <div style={{background:`${C.green}08`,border:`1px solid ${C.green}22`,borderRadius:8,padding:"10px 12px"}}>
              <div style={{fontSize:10,fontWeight:700,color:C.green,letterSpacing:"0.08em",marginBottom:8}}>✅ POST-MEETING — Realne odpowiedzi</div>
              <div style={{fontSize:10,color:C.txt3,marginBottom:8,lineHeight:1.4}}>Wypełnij PO spotkaniu. Zastąp hipotezy tym co klient powiedział.</div>
              <SpinField label="S — SITUATION" hint={["Write exact numbers: workers, shifts, locations, since when","Name the current supplier — contract, how long, what works / doesn't","How many open roles, which profile, since when — their exact answer"]} value={form.spinReal?.s||""} onChange={v=>setForm({...form,spinReal:{...form.spinReal,s:v}})}/>
              <SpinField label="P — PROBLEM" hint={["Use their exact words — do not paraphrase","How long has this been a problem? What have they tried?","What specifically is not working — their words, not your analysis"]} value={form.spinReal?.p||""} onChange={v=>setForm({...form,spinReal:{...form.spinReal,p:v}})}/>
              <SpinField label="I — IMPLICATION" hint={["What financial/operational impact did they confirm — with numbers","What internal pressure did they mention: management, deadlines, clients?","Urgency signals: what happens if not solved by [date]?"]} value={form.spinReal?.i||""} onChange={v=>setForm({...form,spinReal:{...form.spinReal,i:v}})}/>
              <SpinField label="N — NEED-PAYOFF" hint={["What outcome did the client say they want — their exact words","What would solving this create for the business — their answer","What does good look like for them — their definition of success"]} value={form.spinReal?.n||""} onChange={v=>setForm({...form,spinReal:{...form.spinReal,n:v}})}/>
              <div style={{marginTop:8}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><div className="lbl" style={{marginBottom:0,color:C.red}}>💥 PAIN SUMMARY</div><span style={{fontSize:10,color:C.txt3}}>(POST — client's words → proposal)</span></div><textarea value={form.spin?.painSummary||""} onChange={e=>setForm({...form,spin:{...form.spin,painSummary:e.target.value}})} rows={3} className="fi" style={{resize:"vertical",fontSize:12}} placeholder='e.g. "Night shift in Cluj unstaffed 8 weeks, 15 operators missing, Bosch contract at risk Apr 1."'/></div>
            </div>
          </div>
        </div>
        <div style={{height:1,background:C.border}}/>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:11,fontWeight:600,color:C.txt3,letterSpacing:"0.08em"}}>DEAL INTELLIGENCE</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={{gridColumn:"1/-1"}}><div className="lbl">NEXT STEP</div><input type="text" value={form.nextStep||""} onChange={e=>setForm({...form,nextStep:e.target.value})} className="fi" placeholder='e.g. "Send calculation for 50 people"'/></div>
          <div><div className="lbl">NEXT STEP DATE</div><input type="date" value={form.nextStepDate||""} onChange={e=>setForm({...form,nextStepDate:e.target.value})} className="fi"/></div>
          <div><div className="lbl">LAST CONTACT</div><input type="date" value={form.lastContact||""} onChange={e=>setForm({...form,lastContact:e.target.value})} className="fi"/></div>
        </div>
        <div><div className="lbl">PAIN SCORE (1–5)</div>
          <div style={{display:"flex",gap:8,marginTop:4}}>
            {[1,2,3,4,5].map(n=>(
              <button key={n} type="button" className="btn" onClick={()=>setForm({...form,painScore:n})} style={{flex:1,padding:"10px",fontSize:14,fontWeight:700,borderRadius:8,background:form.painScore===n?(n>=4?`${C.red}33`:n>=3?`${C.amber}33`:`${C.green}33`):C.bg4,color:form.painScore===n?(n>=4?C.red:n>=3?C.amber:C.green):C.txt3,border:`1.5px solid ${form.painScore===n?(n>=4?C.red:n>=3?C.amber:C.green)+"66":C.border}`}}>{n}</button>
            ))}
          </div>
        </div>
        <MeddicSection form={form} setForm={setForm}/>
        {(form.stage==="Closed Lost")&&(
          <div style={{display:"flex",flexDirection:"column",gap:8,background:`${C.red}08`,border:`1px solid ${C.red}33`,borderRadius:10,padding:12}}>
            <div className="lbl" style={{color:C.red}}>❌ CLOSED LOST — OUTCOME</div>
            <div><div className="lbl">LOST REASON</div><select value={form.lostReason||""} onChange={e=>setForm({...form,lostReason:e.target.value})} className="fi"><option value="">— select reason —</option>{["Price","Competitor Won","No Budget","No Decision","Legal Concerns","Romanian Only Policy","Other"].map(r=><option key={r}>{r}</option>)}</select></div>
            <div><div className="lbl">LOST DATE</div><input type="date" value={form.lostDate||""} onChange={e=>setForm({...form,lostDate:e.target.value})} className="fi"/></div>
            <div><div className="lbl">DESCRIBE WHAT HAPPENED</div><textarea value={form.lostDescription||""} onChange={e=>setForm({...form,lostDescription:e.target.value})} rows={3} className="fi" style={{resize:"vertical",fontSize:12}}/></div>
            <div><div className="lbl">WHAT TO DO DIFFERENTLY NEXT TIME</div><textarea value={form.lostLesson||""} onChange={e=>setForm({...form,lostLesson:e.target.value})} rows={2} className="fi" style={{resize:"vertical",fontSize:12}}/></div>
            <div><div className="lbl">RECHECK DATE (Next Step)</div><input type="date" value={form.nextStepDate||""} onChange={e=>setForm({...form,nextStepDate:e.target.value})} className="fi"/></div>
          </div>
        )}
        {(form.stage==="Closed Won")&&(
          <div style={{display:"flex",flexDirection:"column",gap:8,background:`${C.green}08`,border:`1px solid ${C.green}33`,borderRadius:10,padding:12}}>
            <div className="lbl" style={{color:C.green}}>🏆 CLOSED WON — OUTCOME</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><div className="lbl">SIGNED DATE</div><input type="date" value={form.wonDate||""} onChange={e=>setForm({...form,wonDate:e.target.value})} className="fi"/></div>
              <div><div className="lbl">WORKER START DATE</div><input type="date" value={form.startDate||""} onChange={e=>setForm({...form,startDate:e.target.value})} className="fi"/></div>
            </div>
            <div><div className="lbl">NUMBER OF WORKERS</div><input type="number" value={form.workers||""} onChange={e=>setForm({...form,workers:e.target.value})} className="fi" placeholder="e.g. 25"/></div>
            <div><div className="lbl">NOTES — what closed the deal</div><textarea value={form.wonNotes||""} onChange={e=>setForm({...form,wonNotes:e.target.value})} rows={3} className="fi" style={{resize:"vertical",fontSize:12}}/></div>
          </div>
        )}
        <div><div className="lbl">NOTES</div><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={3} className="fi" style={{resize:"vertical",lineHeight:1.7}}/></div>
      </div>
      <div className="mf">
        <button className="btn" onClick={()=>onSave(newCo?newHQ:null)} style={{width:"100%",background:`linear-gradient(135deg,${C.green},${C.teal})`,color:"#fff",padding:"14px",fontSize:15,borderRadius:10}}>
          {editMode?"Save Changes":newCo?"Create Company + Add Location":"Add Location"}
        </button>
      </div>
    </div>
  );
}

// ─── HQ FORM ─────────────────────────────────────────────────────
function HQFormModal({form,setForm,onSave,onClose}) {
  return(
    <div className="modal" style={{zIndex:160}}>
      <div className="mh"><div style={{fontWeight:700,fontSize:16,color:C.txt}}>Edit Company (HQ)</div><button className="xb" onClick={onClose}>×</button></div>
      <div className="ms">
        <div><div className="lbl">COMPANY NAME</div><input type="text" value={form.company} onChange={e=>setForm({...form,company:e.target.value})} className="fi"/></div>
        <div><div className="lbl">INDUSTRY</div><select value={form.industry} onChange={e=>setForm({...form,industry:e.target.value})} className="fi"><option value="">— select —</option>{INDUSTRIES.map(i=><option key={i}>{i}</option>)}</select></div>
        <div><div className="lbl">CENTRAL CONTACT</div><input id="hq-central-contact" type="text" value={form.centralContact} onChange={e=>setForm({...form,centralContact:e.target.value})} className="fi"/></div>
        <div>
          <div className="lbl">CENTRAL ROLE</div>
          <div style={{display:"flex",gap:6}}>
            <select value={["HR Director","HR Manager","Plant Manager","Production Manager","Operations Director","General Manager","Owner","CEO"].includes(form.centralRole)?form.centralRole:"__custom"} onChange={e=>{if(e.target.value!=="__custom")setForm({...form,centralRole:e.target.value});else setForm({...form,centralRole:""}); }} className="fi" style={{flex:"0 0 auto",width:"50%"}}>
              <option value="">— select —</option>
              {["HR Director","HR Manager","Plant Manager","Production Manager","Operations Director","General Manager","Owner","CEO"].map(r=><option key={r}>{r}</option>)}
              <option value="__custom">✏ Custom...</option>
            </select>
            <input type="text" value={form.centralRole} onChange={e=>setForm({...form,centralRole:e.target.value})} className="fi" style={{flex:1}} placeholder="or type any role"/>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><div className="lbl">HQ PHONE</div><input id="hq-central-phone" type="tel" value={form.centralPhone} onChange={e=>setForm({...form,centralPhone:e.target.value})} className="fi"/></div>
          <div><div className="lbl">HQ EMAIL</div><input type="email" value={form.centralEmail} onChange={e=>setForm({...form,centralEmail:e.target.value})} className="fi"/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><div className="lbl">EMPLOYEES (TOTAL)</div><input id="hq-employees" type="text" value={form.employees||""} onChange={e=>setForm({...form,employees:e.target.value})} className="fi" placeholder="e.g. 350"/></div>
          <div><div className="lbl">ANNUAL TURNOVER (RON)</div><input id="hq-annual-turnover" type="text" value={form.annualTurnover||""} onChange={e=>setForm({...form,annualTurnover:e.target.value})} className="fi" placeholder="e.g. 12,000,000"/></div>
        </div>
        <div><div className="lbl">SEASONALITY</div><input type="text" value={form.seasonality||""} onChange={e=>setForm({...form,seasonality:e.target.value})} className="fi" placeholder="e.g. April–September (production peak)"/></div>
        <div><div className="lbl">LEAD SOURCE</div><select value={form.leadSource||""} onChange={e=>setForm({...form,leadSource:e.target.value})} className="fi"><option value="">— select —</option>{LEAD_SOURCES.map(s=><option key={s}>{s}</option>)}</select></div>
        <div><div className="lbl">INTELLIGENCE</div><textarea id="hq-intelligence" value={form.intelligence||""} onChange={e=>setForm({...form,intelligence:e.target.value})} rows={4} className="fi" style={{resize:"vertical",lineHeight:1.7}} placeholder="Financials: revenue, growth dynamics...&#10;Products & Markets: what they make, for whom...&#10;Vacancies: open positions, how long posted...&#10;Competitor: current suppliers, who else they work with...&#10;Decision Maker LinkedIn: what they post, concerns..."/></div>
        <div><div className="lbl">NOTES</div><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={3} className="fi" style={{resize:"vertical",lineHeight:1.7}}/></div>
      </div>
      <div className="mf"><button className="btn" onClick={onSave} style={{width:"100%",background:`linear-gradient(135deg,${C.blue},${C.indigo})`,color:"#fff",padding:"14px",fontSize:15,borderRadius:10}}>Save</button></div>
    </div>
  );
}


// ─── TEMPLATES TAB ───────────────────────────────────────────────
const TPL_DATA = [

  // ══════════════════════════════════════════════════════
  // COLD CALL
  // ══════════════════════════════════════════════════════
  {id:"cc_opener",category:"Cold Call",title:"Cold Call Opener — Challenger",text:`[YOUR NAME]: Buna ziua, ma numesc [NAME], sunt [Directorul de Dezvoltare / Account Manager] la Gremi Personal.

Am vazut ca aveti [X] pozitii de operatori deschise pe eJobs de [Y] saptamani — pare ca recrutarea locala e dificila in [JUDET] momentan.

Voiam sa va intreb: care e principala provocare acum cu aceste pozitii?

[WAIT — do not fill the silence]

---
STRUCTURE (Challenger Sale — Teach before you Sell):
1. Who you are + company (5 sec)
2. One specific observation about THEM — shows you did research (5 sec)
3. Open question — not a pitch, not "do you need workers?" (5 sec)

IF THEY ENGAGE: move to Problem questions (SPIN-P)
IF "SEND EMAIL": "Desigur. Inainte sa fac asta — ca sa trimit ceva relevant — pot sa va pun doua intrebari rapide?"
IF GATEKEEPER: "Am trimis un email dl-ului [NAME] referitor la personal operational. Puteti sa ma transferati?"
NEVER leave voicemail. NEVER say "Is this a bad time?"`},

  {id:"cc_reframe",category:"Cold Call",title:"Cold Call — Commercial Insight Reframe",text:`[Opening after they pick up]

"Buna ziua, ma numesc [NAME] de la Gremi Personal. Lucrez cu producatori din [industria lor] din toata Romania, si am observat ceva interesant: companiile care trec de la recrutare directa la outsourcing de muncitori straini isi reduc costul total pe angajat cu 30-40% — nu prin taiere de salarii, ci prin eliminarea costurilor ascunse.

Voiam sa inteleg daca asta e relevant si pentru dvs. — cat de mare e presiunea pe staffing momentan?"

[WAIT]

---
SOURCE: Challenger Sale — Commercial Insight
Rule: Your first sentence must change how they see their own situation.
NOT: "We provide foreign workers."
YES: A reframe that makes them think about a cost or risk they haven't quantified.

Commercial Insights for this market:
— "Costul real al unui angajat direct include recrutare + onboarding + fluctuatie + admin ITM. La [X] angajati, asta inseamna [Y RON/luna] pe care nu il vedeti in nicio linie bugetara."
— "Agentiile mari gestioneaza toate profilurile. Noi facem un singur lucru: muncitori straini pentru productie. Viteza noastra de livrare e de 2-4 saptamani pentru profil UA — comparativ cu 6-8 saptamani industrie standard."
— "ITM-ul vine la noi, nu la dvs. — asta e o protectie structurala pe care putini clienti o calculeaza cand compara oferte."`},

  {id:"cc_objection_email",category:"Cold Call",title:"Cold Call — 'Send Email' Deflection",text:`CLIENT: "Trimiteti un email."

YOU: "Desigur. Inainte sa fac asta — ca sa trimit ceva specific, nu un email generic — pot sa va pun doua intrebari rapide?"

[Usually they say yes]

Q1: "Cam cate pozitii de productie aveti deschise momentan?"
Q2: "Care e termenul — aveti un deadline de sezon sau e o nevoie continua?"

THEN: "Perfect, va trimit ceva specific in [X ore]. Si ca sa merite timpul dvs. — ar fi ok sa facem un apel de 15 minute [ziua] la [ora] sa il parcurgem impreuna?"

---
SOURCE: Voss — Never Split the Difference
Principle: Invite a safe "no" to stay in conversation.
"Would it be a problem if I asked two quick questions?" — most people say "no" (= go ahead).
Goal: attach a booked call to the email. An email without a follow-up call is dead.`},

  // ══════════════════════════════════════════════════════
  // EMAIL
  // ══════════════════════════════════════════════════════
  {id:"email_first",category:"Email",title:"First Contact Email — SPIN Opener",text:`Subiect: Personal de productie pentru [COMPANIA] — livrat in 3 saptamani

Buna ziua [PRENUME],

Am vazut ca [COMPANIA] are [X] pozitii de operatori deschise pe [eJobs/BestJobs] de [Y] saptamani. Companiile cu care lucrez in [industrie] intampina de obicei aceeasi problema: recrutarea locala e lenta si fluctuatia e mare.

Ce rezolvam noi: muncitori straini pentru productie (profil ucrainean sau asiatic), livrati in 3-4 saptamani, cu toata documentatia ITM gestionata de noi. Dvs. nu atingeti niciun dosar.

Trei intrebari rapide:
1. Care e termenul — aveti un deadline de sezon sau e o nevoie continua?
2. Lucrati deja cu o agentie de muncitori straini?
3. Cine e persoana care ia decizia in acest subiect?

Daca are sens, propun un apel de 15 minute pentru a intelege situatia dvs. mai exact.

Cu stima,
[NAME] | Gremi Personal Romania | [PHONE]

---
SOURCE: SPIN Selling (Rackham) — Situation questions in writing
Rule: 3 questions max. Each one diagnostic, not rhetorical.
Goal: get a reply that gives you SPIN-S data before the call.`},

  {id:"email_followup",category:"Email",title:"Follow-up Email — Challenger Insight",text:`Subiect: Re: [previous subject] — o observatie despre [industria lor]

Buna ziua [PRENUME],

Revin cu o perspectiva care ar putea fi relevanta pentru dvs.

[CHOOSE ONE INSIGHT BASED ON THEIR INDUSTRY]:

AUTO PARTS: "Producatorii auto din Romania cu care lucrez au inregistrat o fluctuatie medie de 35% la muncitorii locali in ultimele 12 luni. Cei care au trecut la muncitori straini au redus fluctuatia la sub 8% — stabilitatea echipei s-a transformat direct in predictibilitate pe linie."

TEXTILE: "In textile, problema nu e sezonul — e viteza de rampa. Muncitorii UA invata linia in 5-7 zile vs 3-4 saptamani pentru angajari locale noi. Companiile care au calculat costul de rampa si-au schimbat strategia complet."

FOOD PRODUCTION: "Producatorii alimentari au cea mai mare expunere ITM — documentatia pentru muncitori straini are zero marja de eroare. Noi suntem angajatorul de inregistrare — orice control ITM vine la noi, nu la dvs."

---
Daca oricare din acestea e relevanta pentru [COMPANIA], propun un apel de 20 minute saptamana aceasta.

Cu stima,
[NAME] | [PHONE]

---
SOURCE: Challenger Sale — Teach in every touchpoint, not just first contact
Rule: Never "just checking in." Every email must deliver insight or value.
Rule: Insight must be industry-specific and contain a real number.`},

  {id:"email_proposal",category:"Email",title:"Proposal Email — EVC Framework",text:`Subiect: Propunere personalizata — [X] muncitori [UA/Asiatic] pentru [COMPANIA/LOCATIE]

Buna ziua [PRENUME],

Asa cum am discutat, atașez propunerea pentru [X] muncitori [profil] pentru locatia dvs. din [LOCATIE].

Cateva puncte cheie pe care vreau sa le subliniez:

1. COSTUL REAL AL ALTERNATIVEI
Pe baza a ce mi-ati spus, costul actual (recrutare + fluctuatie + admin HR + overtime in vacanta) este estimat la [X RON/luna] pentru [Y] pozitii. Propunerea noastra: [Z RON/luna] all-inclusive. Delta: [X-Z RON/luna].

2. CE ESTE INCLUS
Permise de munca, documentatie ITM, housing coordination (daca e cazul), coordonator dedicat, garantie de inlocuire in 72h.

3. CALENDARUL
Semnare → Selectie workers → Start pe site: [DATA ESTIMATA]
Profil UA: 2-4 saptamani | Profil Asiatic: minimum 4-6 luni

4. PASUL URMATOR
Am rezervat [ZI] la [ORA] pentru un apel de 20 minute sa parcurgem propunerea impreuna. Va contactez atunci.

Daca nu e potrivit, anuntati-ma si stabilim alta ora.

Cu stima,
[NAME] | Gremi Personal Romania | [PHONE]

---
SOURCE: Nagle — Strategy and Tactics of Pricing: EVC Framework
Rule: Price comes AFTER value calculation, never before.
Rule: Always attach a scheduled call to the proposal — proposals without follow-up die.
Rule: State the timeline clearly — Asian vs UA profiles have fundamentally different timelines.`},

  {id:"email_breakup",category:"Email",title:"Breakup Email — Voss Pattern",text:`Subiect: Ultima incercare — [COMPANIA]

Buna ziua [PRENUME],

Am incercat sa va contactez de [X] ori in ultimele [Y] saptamani — inteleg ca sunteti ocupat.

Inchid dosarul din sistemul nostru. Daca situatia cu personalul se schimba — sau daca timing-ul nu a fost bun — sunt disponibil.

Cu stima,
[NAME] | [PHONE]

---
SOURCE: Voss — Never Split the Difference
Principle: "A clear no is more useful than a false maybe."
The breakup message often gets a response — people react to closure.
Tone: professional, respectful, leaves the door open. Zero passive-aggression.
Timing: Day 14+ after proposal with no response, after 4+ contact attempts.

WHAT NOT TO WRITE:
✗ "I just wanted to follow up again..."
✗ "I understand you're very busy..."
✗ Any guilt or pressure language`},

  // ══════════════════════════════════════════════════════
  // LINKEDIN
  // ══════════════════════════════════════════════════════
  {id:"li_first_hr",category:"LinkedIn",title:"LinkedIn — First Message to HR Director",text:`"Buna ziua [PRENUME],

Am vazut ca recrutati operatori de linie de cateva luni — am urmarit si postarile voastre pe eJobs. Companiile din productie cu care lucrez au redus timpul de recrutare cu 60% trecand la un model diferit de staffing.

Va intreb direct: cat timp aloca echipa HR lunar pentru aceasta problema?"

---
SOURCE: Challenger Sale — Teach before you ask. Lead with insight, not pitch.
Rule: Never mention your company in the first message.
Rule: One question only — not two.
Hook: Their specific hiring activity (shows you studied them).
Insight: 60% reduction — specific, credible, makes them curious about "what model."
Question: Diagnostic, not rhetorical.

IF THEY REPLY: "Multumesc pentru raspuns. Ar fi ok sa facem un apel de 15 minute sa inteleg mai bine situatia dvs.?"`},

  {id:"li_first_plant",category:"LinkedIn",title:"LinkedIn — First Message to Plant/Ops Manager",text:`"Buna ziua [PRENUME],

Felicitari pentru extinderea liniei de productie [sau: am vazut ca [COMPANIA] a castigat contractul cu [CLIENT]]. Din experienta cu producatori similari din [JUDET] — cel mai mare risc in primele 3 luni de scale-up e stabilitatea echipei, nu capacitatea.

Cum gestionati asta momentan?"

---
SOURCE: Challenger Sale — Commercial Insight tailored to Production Manager persona.
Hook: Specific news about their company — expansion, new contract, new plant.
Insight: Reframe "the risk is stability, not capacity" — challenges their assumption.
Question: Opens the real conversation.

IF NO REPLY after 7 days: send one follow-up with a DIFFERENT angle.
IF STILL NO REPLY: move to Cold Call. LinkedIn silence ≠ rejection.`},

  {id:"li_followup",category:"LinkedIn",title:"LinkedIn — Follow-up Message (7 days later)",text:`"Revin cu o perspectiva diferita.

Am lucrat recent cu un producator similar din [aceeasi industrie / acelasi judet] — provocarea lor principala era [fluctuatie mare / pozitii deschise de 3 luni / ITM problematic].

Ce au schimbat: au trecut la un model de muncitori straini cu angajator de inregistrare extern. Fluctuatia a scazut la 8% in 6 luni.

Daca asta suna relevant — propun un apel de 15 minute. Daca nu, nicio problema."

---
SOURCE: Voss — Invite the safe 'no': "If not, no problem."
This gives them permission to decline — paradoxically increases response rate.
Different angle = case study from same industry/county, not same message.`},

  // ══════════════════════════════════════════════════════
  // OBJECTION
  // ══════════════════════════════════════════════════════
  {id:"obj_price",category:"Objection",title:"Objection: 'Too Expensive'",text:`CLIENT: "E prea scump / Avem alt furnizor mai ieftin."

STEP 1 — LABEL (Voss: tactical empathy before logic)
"Inteleg — investitia pare mai mare decat ce ati bugetat initial."
[pause — let them confirm]

STEP 2 — CALIBRATED QUESTION (Voss)
"Ce a inclus oferta lor exact? Documentatie ITM, coordinare housing, garantie de inlocuire in 72h?"
[Listen. Most competitors do not include all of these.]

STEP 3 — BUILD THE EVC (Nagle: Economic Value to Customer)
"Hai sa calculam impreuna costul real.
Recrutare directa: [X RON/angajare] × fluctuatie [Y%] anuala = [Z RON/an] doar in recrutare.
Admin HR pentru dosare muncitori: [W ore/luna] × costul intern = [V RON/luna].
Exposure ITM in caz de control: risc de [U RON].
Total cost of status quo: [T RON/luna].
Propunerea noastra: [S RON/luna] all-inclusive. Delta: [T-S RON/luna] in favoarea noastra."

STEP 4 — WAIT
Don't fill the silence. Let them process.

---
SOURCE: Nagle — never defend price. Defend value.
NEVER: drop the price immediately. It signals your price was wrong to begin with.
NEVER: say "we're worth it" — unverifiable. Show the math instead.`},

  {id:"obj_agency",category:"Objection",title:"Objection: 'We Already Have an Agency'",text:`CLIENT: "Lucram deja cu [Adecco/Manpower/Lugera/alta agentie]."

STEP 1 — LABEL
"Inteleg — inseamna ca vedeti valoarea in modelul asta de staffing. Respect asta."
[pause]

STEP 2 — CALIBRATED QUESTION
"Cat de bine va acopera nevoile curente in termeni de volum si viteza de livrare?"
[Listen. Most clients reveal a gap without you prompting.]

STEP 3 — REFRAME (Challenger: change how they evaluate suppliers)
"Multe din companiile cu care lucrez folosesc doua agentii in paralel — una pentru personal local, una pentru muncitori straini. Sunt nise diferite. Noi facem exclusiv muncitori straini pentru productie. Asta inseamna viteza si expertiza legala pe care agentiile generaliste nu le pot replica.

O singura intrebare: aveti un program de muncitori straini activ sau discutam strict local momentan?"

---
SOURCE: Challenger Sale — position as complement, not replacement.
Porter — Competitive Strategy: differentiation through specialization wins in niches.
NEVER attack the competitor. Let the client see the gap themselves.`},

  {id:"obj_timing",category:"Objection",title:"Objection: 'Not the Right Time'",text:`CLIENT: "Momentan nu e momentul potrivit / revenim dupa sezon / asteptam decizia de buget."

STEP 1 — LABEL
"Inteleg — timing-ul e important si nu vreau sa va presez intr-o decizie prematura."

STEP 2 — FIND THE REAL BLOCKER (Voss: "Not the right time" = something unresolved)
"Ce anume nu e clarificat inca — e vorba de buget, de decizia interna, sau de altceva?"
[Listen. "Not the right time" almost always means something specific.]

STEP 3 — CONNECT TO THEIR TIMELINE (Dixit & Nalebuff: first-mover advantage)
"Inteleg. Un singur aspect practic: pentru profil UA, procesul de la semnare la primul muncitor pe site e de 2-4 saptamani. Daca peak-ul dvs. e in [LUNA], start-ul procesului ar trebui sa fie in [LUNA-6 SAPTAMANI].

Nu va cer o decizie acum — va cer sa stabilim o data concreta pentru a relua discutia: [DATA SPECIFICA]."

---
SOURCE: Dixit & Nalebuff — Thinking Strategically: first-mover advantage in seasonal markets.
Clients who start early get the best worker profiles. Clients who start at peak wait 6+ weeks.
This reframe changes "later" into "I'm losing my advantage by waiting."`},

  {id:"obj_complicated",category:"Objection",title:"Objection: 'Foreign Workers Are Too Complicated'",text:`CLIENT: "Muncitorii straini sunt prea complicati legal / nu vrem riscul ITM."

STEP 1 — LABEL + ACCUSATION AUDIT (Voss)
"Inteleg complet — si apreciez ca sunteti direct in legatura cu asta. Probabil va ganditi: ce se intampla daca vine un control ITM si nu avem documentatia in regula."

[Let them confirm — this is the real fear]

STEP 2 — STRUCTURAL REASSURANCE
"Exact de aceea clientii nostri aleg modelul de outsourcing in loc sa gestioneze singuri.

In modelul Gremi Personal:
— Noi suntem angajatorul de inregistrare (angajatorul legal)
— Noi gestionam 100% din documentatia ITM
— Noi gestionam permisele de munca si inregistrarile
— Daca vine un control ITM — vine la noi, nu la dvs.
— Dvs. aveti un contract de prestari servicii cu noi — zero dosar de personal strain

Asta e o protectie structurala, nu o promisiune."

STEP 3 — PROOF
"Putem sa va trimit contractul-cadru si un one-pager cu structura legala ca sa il vedeti un avocat sau juristul dvs. inainte de orice decizie?"

---
SOURCE: Challenger Sale — "Take Control" when they have a misconception.
This objection = knowledge gap, not a real objection. Your job is to educate.
The key insight: THEY are not the employer. YOU are. That changes everything legally.`},

  // ══════════════════════════════════════════════════════
  // DISCOVERY
  // ══════════════════════════════════════════════════════
  {id:"disc_spin",category:"Discovery",title:"SPIN Discovery — Full Question Bank",text:`SOURCE: Rackham — SPIN Selling (35,000 sales calls researched)
Use these in sequence. Fill each CRM field as you go.

━━━ S — SITUATION (facts — use sparingly, 2-3 max) ━━━
"Cate persoane aveti pe linia de productie momentan?"
"Lucrati deja cu vreo agentie de personal?"
"Cate pozitii aveti deschise acum si de cat timp?"
"Ce tip de muncitori cautati — calificati, semi, necalificati?"
→ Write answers in SPIN-S

━━━ P — PROBLEM (expose dissatisfaction) ━━━
"Care e principala provocare cand vine vorba de ocuparea acestor pozitii?"
"Cand o linie e sub-staffata — cum arata asta operationally?"
"Ati avut situatii in care un muncitor a plecat in primele 2-4 saptamani?"
"Cat de des se intampla sa nu gasiti oamenii de care aveti nevoie in timp util?"
→ Write their exact words in SPIN-P — do NOT paraphrase

━━━ I — IMPLICATION (make consequences visible — this is the engine) ━━━
"Daca linia merge cu 10 oameni in minus — cat costa asta per schimb?"
"A afectat asta vreun termen de livrare catre clientii dvs.?"
"Cat timp aloca echipa HR pe luna pentru recrutare si admin?"
"Ce se intampla cu aceasta situatie in [luna de peak]?"
"Care e costul de fluctuatie anuala — recrutare + onboarding + pierdere productivitate?"
→ Write financial and operational impact in SPIN-I
RULE: Do not answer these questions. Ask and wait. Write exactly what they say.

━━━ N — NEED-PAYOFF (let them articulate value — ONE question) ━━━
"Daca ati avea 25 de operatori fiabili care incep in 3 saptamani — ce ar schimba asta pentru dvs.?"
→ Write their answer word-for-word in SPIN-N
→ This becomes your proposal language — use their words back to them

Pain Score: 1 (no pain visible) → 2 (aware but not urgent) → 3 (significant) → 4 (urgent) → 5 (crisis)
DO NOT close until Pain Score ≥ 4.`},

  {id:"disc_meeting",category:"Discovery",title:"Discovery Meeting — Challenger Structure",text:`SOURCE: Challenger Sale — Teach-Tailor-Take Control
Use this for the physical on-site meeting. You have already done the phone Discovery Call.

[0-3 min] RAPPORT — specific, not generic
Compliment something concrete: their facility, a news item, their LinkedIn post.
NOT: "Nice to meet you, let me tell you about Gremi Personal."

[3-6 min] SET THE AGENDA (Take Control from minute 1)
"Vreau sa petrecem ~30 minute impreuna. As vrea sa va impartasesc cateva observatii din industrie — apoi sa inteleg situatia dvs. mai in profunzime — si daca are sens, sa discutam ce putem face impreuna. Va convine?"

[6-12 min] TEACH — Commercial Insight (Challenger)
Deliver ONE prepared insight specific to their industry and size.
It must challenge an assumption they hold.
Example: "Producatorii din [industrie] cu care lucrez credeau initial ca muncitorii straini sunt o solutie de criza. Ce am descoperit impreuna: fluctuatia la muncitori straini e de 3-4x mai mica decat la personal local — si asta schimba complet calculul de cost pe 12 luni."

[12-22 min] TAILOR — go deeper on SPIN
Use prepared Implication questions based on their SPIN-P from the Discovery Call.
Listen. Take notes. Update SPIN fields.

[22-30 min] PRESENT — your specific proposal
Only now. Never before.
"Pe baza a ce mi-ati spus — as propune [X] muncitori [profil], outsourcing via Gremi Personal SRL, livrare estimata [DATA]. Rata all-inclusive: [RANGE] RON/muncitor/luna."

[30-33 min] PAIN SUMMARY — get "That's Right" (Voss)
"Sa verific ca am inteles corect: aveti [X] pozitii deschise, dureaza [Y] saptamani sa le ocupati, si fiecare saptamana de intarziere costa aproximativ [Z RON]. E corect?"
Wait for "Exact." Not "Da, aveti dreptate" — that's different.

[33-36 min] NEXT STEP — specific, not vague
"Pregatesc propunerea si v-o trimit pana [DATA]. Facem un apel de 20 minute pe [ZI] la [ORA] sa o parcurgem impreuna?"
Get YES + date. Confirm email.`},

  // ══════════════════════════════════════════════════════
  // NEGOTIATION
  // ══════════════════════════════════════════════════════
  {id:"neg_price_push",category:"Negotiation",title:"Price Negotiation — Ackerman Method",text:`SOURCE: Voss — Never Split the Difference: Ackerman Bargaining
Use when they push back on price after you've shown EVC.

BEFORE THE CALL: write your walk-away number. Do not cross it.

STEP 1 — LABEL FIRST
"Inteleg — presiunea pe buget e reala."
[pause]

STEP 2 — CALIBRATED QUESTION (do not defend, ask)
"Cum as putea sa fac asta sa functioneze la nivelul asta?"
[Let them answer. Often they will explain what they actually need.]

STEP 3 — ACKERMAN MOVES (if you must negotiate price)
Target: [your real minimum acceptable rate]
Move 1: anchor far — [65% of target, or your listed rate]
Move 2: → 85% of target
Move 3: → 95% of target
Move 4: → 100% of target (final)
Each move SMALLER than the last — signals you're approaching your limit.
Final number: precise, non-round (e.g., 5,840 RON not 5,800) — feels calculated, not arbitrary.
On final move: add small non-monetary item: "Pot sa adaug prima luna de coordonator la cost zero."

STEP 4 — NEVER CONCEDE WITHOUT TRADING
"Pot sa ma uit la rata — daca putem confirma volumul si durata contractului."
"Pot sa ofer pilot — daca convenim acum ca un pilot reusit duce direct la contractul complet."

STEP 5 — ESCALATE IF NEEDED
"> 5% discount: 'Lasati-ma sa aduc directorul nostru intr-un apel — are mai multa flexibilitate pe termeni decat mine.'"
This is strategic, not weakness. Escalation signals seriousness.`},

  {id:"neg_close",category:"Negotiation",title:"Closing Techniques — Four Methods",text:`SOURCE: Voss + Challenger Sale
Use only when: Pain Score ≥ 4 + Economic Buyer involved + proposal discussed + no open objections.

CHECK BEFORE CLOSING — get "That's Right" (Voss):
"Sa verific ca am inteles: [pain summary]. E corect?"
If they say "Exact" → proceed.
If they say "Aveti dreptate" → not ready. More discovery needed.

━━━ METHOD 1: ASSUMPTIVE CLOSE ━━━
Best when: alignment is clear, only timing is open.
"Cand va este mai convenabil sa incepem — la inceputul lui [LUNA] sau la mijlocul lunii?"
Assumes yes. Only asks about timing.

━━━ METHOD 2: SUMMARY CLOSE ━━━
Best when: all terms have been discussed.
"Am convenit: [X] persoane, profil [UA/Asiatic], start [DATA], via [ENTITATE], rata [X] RON/luna. Semnam?"
No ambiguity. Forces a clear yes or no.

━━━ METHOD 3: TRIAL CLOSE ━━━
Best when: testing if last objection is the real one.
"Daca rezolvam problema cu [specific concern] — sunteti pregatiti sa mergem mai departe?"
YES → resolve it → close immediately.
Another concern appears → address → trial close again.

━━━ METHOD 4: ESCALATION CLOSE ━━━
Best when: they stall and you suspect authority is the issue.
"Lasati-ma sa aduc directorul nostru intr-un apel de 20 minute — poate autoriza lucruri pe care eu nu le pot."
Creates seriousness. Often accelerates decisions.

AFTER EVERY CLOSE ATTEMPT:
YES → confirm in writing same day.
NOT YET → "Ce anume lipseste pentru a lua decizia?"
NO → "Ce s-a schimbat fata de ultima noastra conversatie?" → update Lost Reason in CRM.`},

];

function TemplatesTab({isAdmin, templates, setTemplates}) {
  const tplData = templates||TPL_DATA;
  const allCats=[...new Set(tplData.map(t=>t.category))];
  const [selCat,setSelCat]=useState(allCats[0]||"Cold Call");
  const [selTpl,setSelTpl]=useState(null);
  const [editText,setEditText]=useState("");
  const [editTitle,setEditTitle]=useState("");
  const [editMode,setEditMode]=useState(false);
  const [copied,setCopied]=useState(false);
  const [addingNew,setAddingNew]=useState(false);
  const [newTpl,setNewTpl]=useState({category:"Cold Call",title:"",text:""});

  const filtered=tplData.filter(t=>t.category===selCat);
  const select=(tpl)=>{setSelTpl(tpl);setEditText(tpl.text);setEditTitle(tpl.title);setCopied(false);setEditMode(false);};
  const copy=()=>{navigator.clipboard.writeText(editText).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});};
  const saveTpl=()=>{setTemplates(tplData.map(t=>t.id===selTpl.id?{...t,title:editTitle,text:editText}:t));setSelTpl({...selTpl,title:editTitle,text:editText});setEditMode(false);};
  const deleteTpl=(id)=>{setTemplates(tplData.filter(t=>t.id!==id));setSelTpl(null);};
  const addTpl=()=>{if(!newTpl.title||!newTpl.text)return;setTemplates([...tplData,{...newTpl,id:"custom_"+Date.now()}]);setAddingNew(false);setNewTpl({category:selCat,title:"",text:""});};

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{display:"flex",gap:6,padding:"10px 12px",borderBottom:`1px solid ${C.border}`,overflowX:"auto",flexShrink:0,alignItems:"center"}}>
        {allCats.map(c=>(
          <button key={c} className="btn" onClick={()=>{setSelCat(c);setSelTpl(null);setAddingNew(false);}}
            style={{padding:"6px 14px",fontSize:12,borderRadius:7,background:selCat===c?`${C.blue}22`:C.bg3,color:selCat===c?C.blue2:C.txt3,border:`1.5px solid ${selCat===c?C.blue:C.border}`,flexShrink:0}}>{c}</button>
        ))}
        {isAdmin&&<button className="btn" onClick={()=>{setAddingNew(true);setSelTpl(null);setNewTpl({category:selCat,title:"",text:"..."});}}
          style={{marginLeft:"auto",background:`${C.green}18`,color:C.green,padding:"5px 12px",fontSize:11,borderRadius:7,border:`1px solid ${C.green}44`,flexShrink:0}}>+ Add</button>}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:12,display:"flex",flexDirection:"column",gap:8}}>
        {!selTpl&&!addingNew&&filtered.map(t=>(
          <div key={t.id} className="card" style={{padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{flex:1,minWidth:0,cursor:"pointer"}} onClick={()=>select(t)}>
              <div style={{fontWeight:600,fontSize:13,color:C.txt,marginBottom:3}}>{t.title}</div>
              <div style={{fontSize:11,color:C.txt3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.text.substring(0,80)}...</div>
            </div>
            {isAdmin&&<button className="btn" onClick={e=>{e.stopPropagation();select(t);setEditMode(true);}} style={{background:`${C.blue}18`,color:C.blue2,padding:"4px 9px",fontSize:11,borderRadius:6,border:`1px solid ${C.blue}33`,marginLeft:8,flexShrink:0}}>✎</button>}
          </div>
        ))}
        {!selTpl&&!addingNew&&filtered.length===0&&<div style={{textAlign:"center",padding:32,color:C.txt3,fontSize:13}}>No templates in this category.</div>}
        {addingNew&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button className="btn" onClick={()=>setAddingNew(false)} style={{background:C.bg3,color:C.txt3,padding:"6px 12px",fontSize:11,borderRadius:7,border:`1px solid ${C.border}`}}>← Cancel</button>
              <div style={{fontWeight:700,fontSize:14,color:C.green}}>New Template</div>
            </div>
            <div><div className="lbl">CATEGORY</div><input type="text" value={newTpl.category} onChange={e=>setNewTpl({...newTpl,category:e.target.value})} className="fi" placeholder="e.g. Cold Call"/></div>
            <div><div className="lbl">TITLE</div><input type="text" value={newTpl.title} onChange={e=>setNewTpl({...newTpl,title:e.target.value})} className="fi" placeholder="Template name"/></div>
            <div><div className="lbl">CONTENT</div><textarea value={newTpl.text} onChange={e=>setNewTpl({...newTpl,text:e.target.value})} rows={14} className="fi" style={{resize:"vertical",fontSize:12,lineHeight:1.8}}/></div>
            <button className="btn" onClick={addTpl} disabled={!newTpl.title||!newTpl.text} style={{width:"100%",background:!newTpl.title||!newTpl.text?C.bg4:`linear-gradient(135deg,${C.green},${C.teal})`,color:!newTpl.title||!newTpl.text?C.txt3:"#fff",padding:"12px",fontSize:13,borderRadius:9}}>✓ Add Template</button>
          </div>
        )}
        {selTpl&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <button className="btn" onClick={()=>{setSelTpl(null);setEditMode(false);}} style={{background:C.bg3,color:C.txt3,padding:"6px 12px",fontSize:11,borderRadius:7,border:`1px solid ${C.border}`}}>← Back</button>
              {editMode?<input type="text" value={editTitle} onChange={e=>setEditTitle(e.target.value)} className="fi" style={{flex:1,fontSize:14,fontWeight:700}}/>
              :<div style={{fontWeight:700,fontSize:14,color:C.txt,flex:1}}>{selTpl.title}</div>}
              {isAdmin&&!editMode&&<button className="btn" onClick={()=>setEditMode(true)} style={{background:`${C.blue}18`,color:C.blue2,padding:"5px 12px",fontSize:11,borderRadius:7,border:`1px solid ${C.blue}33`}}>✎</button>}
              {isAdmin&&<ConfirmDelete label="Delete" onConfirm={()=>deleteTpl(selTpl.id)}/>}
            </div>
            <textarea value={editText} onChange={e=>setEditText(e.target.value)} readOnly={!editMode} rows={16}
              style={{width:"100%",background:editMode?C.bg4:C.bg3,border:`1px solid ${editMode?C.blue:C.border}`,color:C.txt,borderRadius:10,padding:"12px",fontSize:13,fontFamily:"'Inter',sans-serif",resize:"vertical",lineHeight:1.8,outline:"none"}}/>
            {editMode?(
              <div style={{display:"flex",gap:8}}>
                <button className="btn" onClick={saveTpl} style={{flex:1,background:`linear-gradient(135deg,${C.green},${C.teal})`,color:"#fff",padding:"12px",fontSize:13,borderRadius:9}}>✓ Save</button>
                <button className="btn" onClick={()=>{setEditText(selTpl.text);setEditTitle(selTpl.title);setEditMode(false);}} style={{background:C.bg3,color:C.txt3,padding:"12px 16px",fontSize:13,borderRadius:9,border:`1px solid ${C.border}`}}>Cancel</button>
              </div>
            ):(
              <>
                <button className="btn" onClick={copy} style={{width:"100%",background:copied?`${C.green}22`:`linear-gradient(135deg,${C.teal},${C.blue})`,color:copied?C.green:"#fff",padding:"12px",fontSize:14,borderRadius:9,border:copied?`1px solid ${C.green}44`:"none"}}>{copied?"✓ Copied!":"📋 Copy Template"}</button>
                <div style={{fontSize:10,color:C.txt3,fontStyle:"italic",textAlign:"center"}}>Customize the [VARIABLES] before sending</div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CONFIRM DELETE (two-step protection) ────────────────────────
function ConfirmDelete({label, onConfirm}) {
  const [step, setStep] = useState(0);
  if(step===0) return(
    <button className="btn" onClick={()=>setStep(1)}
      style={{background:`${C.red}12`,color:C.red,padding:"6px 12px",fontSize:11,borderRadius:7,border:`1px solid ${C.red}33`}}>
      🗑 {label}
    </button>
  );
  return(
    <div style={{display:"flex",gap:6,alignItems:"center",background:`${C.red}10`,border:`1px solid ${C.red}44`,borderRadius:8,padding:"6px 10px"}}>
      <span style={{fontSize:11,color:C.red,fontWeight:600}}>Sure? This cannot be undone.</span>
      <button className="btn" onClick={onConfirm} style={{background:C.red,color:"#fff",padding:"5px 12px",fontSize:11,borderRadius:6,fontWeight:700}}>Yes, delete</button>
      <button className="btn" onClick={()=>setStep(0)} style={{background:C.bg3,color:C.txt3,padding:"5px 10px",fontSize:11,borderRadius:6,border:`1px solid ${C.border}`}}>Cancel</button>
    </div>
  );
}

// ─── SCRIPTS TAB COMPONENT ───────────────────────────────────────
function ScriptsTab({tplData, isAdmin, setTemplates}) {
  const allCats=[...new Set((tplData||TPL_DATA).map(t=>t.category))];
  const [selCat,setSelCat]=useState(allCats[0]||"Cold Call");
  const [selTpl,setSelTpl]=useState(null);
  const [editMode,setEditMode]=useState(false);
  const [editText,setEditText]=useState("");
  const [editTitle,setEditTitle]=useState("");
  const [copied,setCopied]=useState(false);
  const td = tplData||TPL_DATA;
  const filtered=td.filter(t=>t.category===selCat);
  const select=(tpl)=>{setSelTpl(tpl);setEditText(tpl.text);setEditTitle(tpl.title);setEditMode(false);setCopied(false);};
  const copy=()=>{navigator.clipboard.writeText(editText).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});};
  const saveTpl=()=>{if(setTemplates)setTemplates(td.map(t=>t.id===selTpl.id?{...t,title:editTitle,text:editText}:t));setSelTpl({...selTpl,title:editTitle,text:editText});setEditMode(false);};
  const deleteTpl=(id)=>{if(confirm("Delete this script?")&&setTemplates){setTemplates(td.filter(t=>t.id!==id));setSelTpl(null);}};
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{display:"flex",gap:5,padding:"8px 10px",borderBottom:`1px solid ${C.border}`,overflowX:"auto",flexShrink:0,background:C.bg0}}>
        {allCats.map(c=>(
          <button key={c} className="btn" onClick={()=>{setSelCat(c);setSelTpl(null);}}
            style={{padding:"5px 12px",fontSize:11,borderRadius:7,flexShrink:0,
              background:selCat===c?`${C.blue}22`:C.bg3,color:selCat===c?C.blue2:C.txt3,
              border:`1.5px solid ${selCat===c?C.blue:C.border}`}}>{c}</button>
        ))}
        {isAdmin&&setTemplates&&<button className="btn" onClick={()=>{const id="cust_"+Date.now();setTemplates([...td,{id,category:selCat,title:"New Script",text:""}]);}}
          style={{marginLeft:"auto",background:`${C.green}18`,color:C.green,padding:"5px 12px",fontSize:11,borderRadius:7,border:`1px solid ${C.green}44`,flexShrink:0}}>+ Add</button>}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:10,display:"flex",flexDirection:"column",gap:7}}>
        {!selTpl&&filtered.map(t=>(
          <div key={t.id} style={{background:C.bg2,border:`1px solid ${C.border}`,borderLeft:`3px solid ${C.blue}`,borderRadius:9,padding:"11px 13px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}
            onClick={()=>select(t)}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,fontSize:13,color:C.txt,marginBottom:2}}>{t.title}</div>
              <div style={{fontSize:11,color:C.txt3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.text.substring(0,70)}...</div>
            </div>
            {isAdmin&&<button className="btn" onClick={e=>{e.stopPropagation();select(t);setEditMode(true);}}
              style={{background:`${C.blue}18`,color:C.blue2,padding:"3px 8px",fontSize:10,borderRadius:5,border:`1px solid ${C.blue}33`,marginLeft:8,flexShrink:0}}>✎</button>}
          </div>
        ))}
        {!selTpl&&filtered.length===0&&<div style={{padding:32,textAlign:"center",color:C.txt3,fontSize:13}}>No scripts in this category.</div>}
        {selTpl&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
              <button className="btn" onClick={()=>{setSelTpl(null);setEditMode(false);}} style={{background:C.bg3,color:C.txt3,padding:"6px 12px",fontSize:11,borderRadius:7,border:`1px solid ${C.border}`}}>← Back</button>
              {editMode?<input type="text" value={editTitle} onChange={e=>setEditTitle(e.target.value)} className="fi" style={{flex:1,fontSize:14,fontWeight:700}}/>
              :<div style={{fontWeight:700,fontSize:14,color:C.txt,flex:1}}>{selTpl.title}</div>}
              {isAdmin&&!editMode&&<button className="btn" onClick={()=>setEditMode(true)} style={{background:`${C.blue}18`,color:C.blue2,padding:"5px 10px",fontSize:11,borderRadius:7,border:`1px solid ${C.blue}33`}}>✎</button>}
              {isAdmin&&setTemplates&&<ConfirmDelete label="Del" onConfirm={()=>deleteTpl(selTpl.id)}/>}
            </div>
            <textarea value={editText} onChange={e=>setEditText(e.target.value)} readOnly={!editMode} rows={18}
              style={{width:"100%",background:editMode?C.bg4:C.bg3,border:`1px solid ${editMode?C.blue:C.border}`,color:C.txt,borderRadius:10,padding:"12px",fontSize:12,fontFamily:"'Inter',sans-serif",resize:"vertical",lineHeight:1.85,outline:"none"}}/>
            {editMode?(
              <div style={{display:"flex",gap:8}}>
                <button className="btn" onClick={saveTpl} style={{flex:1,background:`linear-gradient(135deg,${C.green},${C.teal})`,color:"#fff",padding:"11px",fontSize:13,borderRadius:9}}>✓ Save</button>
                <button className="btn" onClick={()=>{setEditText(selTpl.text);setEditTitle(selTpl.title);setEditMode(false);}} style={{background:C.bg3,color:C.txt3,padding:"11px 14px",fontSize:13,borderRadius:9,border:`1px solid ${C.border}`}}>Cancel</button>
              </div>
            ):(
              <>
                <button className="btn" onClick={copy}
                  style={{width:"100%",background:copied?`${C.green}22`:`linear-gradient(135deg,${C.teal},${C.blue})`,color:copied?C.green:"#fff",padding:"12px",fontSize:14,borderRadius:9,border:copied?`1px solid ${C.green}44`:"none",fontWeight:600}}>
                  {copied?"✓ Copied!":"📋 Copy Script"}
                </button>
                <div style={{fontSize:10,color:C.txt3,textAlign:"center",fontStyle:"italic"}}>Customize [VARIABLES] before sending</div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PLAYBOOK TAB ─────────────────────────────────────────────────
function PlaybookTab({playbook,setPlaybook,isAdmin,templates,setTemplates}) {
  const [tab,setTab]=useState("stages");
  const [selId,setSelId]=useState(null);
  const [editing,setEditing]=useState(null); // {mode:"stage"|"extra"|"script", item}
  const [newExtra,setNewExtra]=useState(false);
  const stages=playbook.stages||INIT_PLAYBOOK.stages;
  const extras=playbook.extras||INIT_PLAYBOOK.extras;
  const tplData=templates||TPL_DATA;

  const updateStage=(id,patch)=>setPlaybook({...playbook,stages:stages.map(s=>s.id===id?{...s,...patch}:s)});
  const updateExtra=(id,patch)=>setPlaybook({...playbook,extras:extras.map(e=>e.id===id?{...e,...patch}:e)});
  const deleteExtra=(id)=>{if(confirm("Delete this card?"))setPlaybook({...playbook,extras:extras.filter(e=>e.id!==id)});};
  const addExtra=()=>{
    const id="custom_"+Date.now();
    setPlaybook({...playbook,extras:[...extras,{id,title:"New Card",color:"blue",text:""}]});
    setEditing({mode:"extra",item:{id,title:"New Card",color:"blue",text:""}});
    setTab("extras");
  };

  const COLORS=["blue","teal","green","amber","orange","red","indigo","purple"];

  // Edit modal
  if(editing) {
    const save=()=>{
      if(editing.mode==="stage") updateStage(editing.item.id,editing.item);
      else if(editing.mode==="script"&&setTemplates) {
        const tpls=templates||TPL_DATA;
        if(tpls.find(t=>t.id===editing.item.id)) setTemplates(tpls.map(t=>t.id===editing.item.id?editing.item:t));
        else setTemplates([...tpls,editing.item]);
      }
      else updateExtra(editing.item.id,editing.item);
      setEditing(null);
    };
    return(
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <button className="btn" onClick={()=>setEditing(null)} style={{background:C.bg3,color:C.txt3,padding:"6px 12px",fontSize:11,borderRadius:7,border:`1px solid ${C.border}`}}>← Cancel</button>
          <div style={{fontWeight:700,fontSize:14,color:C.txt,flex:1}}>Editing: {editing.item.title||editing.item.stage}</div>
          <button className="btn" onClick={save} style={{background:`linear-gradient(135deg,${C.green},${C.teal})`,color:"#fff",padding:"7px 14px",fontSize:12,borderRadius:8}}>✓ Save</button>
          {editing.mode==="extra"&&(
            <ConfirmDelete label="Delete Card" onConfirm={()=>{deleteExtra(editing.item.id);setEditing(null);}}/>
          )}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>
          {editing.mode==="stage"?(
            <>
              <div><div className="lbl">TITLE</div><input type="text" value={editing.item.title} onChange={e=>setEditing({...editing,item:{...editing.item,title:e.target.value}})} className="fi"/></div>
              <div><div className="lbl">TARGET (one sentence goal)</div><input type="text" value={editing.item.target} onChange={e=>setEditing({...editing,item:{...editing.item,target:e.target.value}})} className="fi"/></div>
              <div><div className="lbl">TASKS & PROCEDURES</div><textarea value={editing.item.tasks} onChange={e=>setEditing({...editing,item:{...editing.item,tasks:e.target.value}})} rows={20} className="fi" style={{resize:"vertical",fontSize:12,lineHeight:1.8,minHeight:300}}/></div>
            </>
          ):(
            <>
              <div><div className="lbl">TITLE</div><input type="text" value={editing.item.title} onChange={e=>setEditing({...editing,item:{...editing.item,title:e.target.value}})} className="fi"/></div>
              <div>
                <div className="lbl">COLOR</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {COLORS.map(c=>(
                    <div key={c} onClick={()=>setEditing({...editing,item:{...editing.item,color:c}})}
                      style={{width:28,height:28,borderRadius:7,background:C[c]||C.blue,border:`3px solid ${editing.item.color===c?"#fff":"transparent"}`,cursor:"pointer"}}/>
                  ))}
                </div>
              </div>
              <div><div className="lbl">CONTENT</div><textarea value={editing.item.text} onChange={e=>setEditing({...editing,item:{...editing.item,text:e.target.value}})} rows={24} className="fi" style={{resize:"vertical",fontSize:12,lineHeight:1.8,minHeight:400}}/></div>
            </>
          )}
        </div>
      </div>
    );
  }

  const selStage = selId && tab==="stages" ? stages.find(s=>s.id===selId) : null;
  const selExtra = selId && tab==="extras" ? extras.find(e=>e.id===selId) : null;

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,flexShrink:0,alignItems:"center"}}>
        {[["stages","📋 Pipeline"],["extras","📚 Reference"],["scripts","💬 Scripts"]].map(([id,label])=>(
          <button key={id} className="tab" onClick={()=>{setTab(id);setSelId(null);}}
            style={{background:tab===id?C.bg2:C.bg0,color:tab===id?C.txt:C.txt3,borderBottomColor:tab===id?C.blue:"transparent",padding:"10px 14px",fontSize:12}}>
            {label}
          </button>
        ))}
        {isAdmin&&tab==="extras"&&(
          <button className="btn" onClick={addExtra}
            style={{marginLeft:"auto",marginRight:10,background:`${C.green}18`,color:C.green,padding:"5px 12px",fontSize:11,borderRadius:7,border:`1px solid ${C.green}44`}}>
            + Add Card
          </button>
        )}
        {isAdmin&&tab==="scripts"&&setTemplates&&(
          <button className="btn" onClick={()=>{setEditing({mode:"script",item:{id:"custom_"+Date.now(),category:"Cold Call",title:"",text:""}});}}
            style={{marginLeft:"auto",marginRight:10,background:`${C.green}18`,color:C.green,padding:"5px 12px",fontSize:11,borderRadius:7,border:`1px solid ${C.green}44`}}>
            + Add Script
          </button>
        )}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:12,display:"flex",flexDirection:"column",gap:8}}>
        {/* STAGES LIST */}
        {tab==="stages"&&!selId&&stages.map(s=>{
          const c=getSC()[s.stage]||C.txt3;
          return(
            <div key={s.id} className="card" style={{padding:"12px 14px",borderLeft:`3px solid ${c}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1,cursor:"pointer"}} onClick={()=>setSelId(s.id)}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                  <div style={{fontWeight:600,fontSize:13,color:C.txt}}>{s.stage}</div>
                  <span style={{background:c+"22",color:c,border:`1px solid ${c}44`,borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700}}>{s.icon}</span>
                </div>
                <div style={{fontWeight:500,fontSize:12,color:C.txt2,marginBottom:2}}>{s.title}</div>
                <div style={{fontSize:11,color:C.txt3,fontStyle:"italic"}}>{s.target}</div>
              </div>
              {isAdmin&&(
                <button className="btn" onClick={e=>{e.stopPropagation();setEditing({mode:"stage",item:{...s}});}}
                  style={{background:`${C.blue}18`,color:C.blue2,padding:"4px 9px",fontSize:11,borderRadius:6,border:`1px solid ${C.blue}33`,marginLeft:8,flexShrink:0}}>✎</button>
              )}
            </div>
          );
        })}
        {tab==="stages"&&selId&&selStage&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button className="btn" onClick={()=>setSelId(null)} style={{background:C.bg3,color:C.txt3,padding:"6px 12px",fontSize:11,borderRadius:7,border:`1px solid ${C.border}`}}>← Back</button>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:14,color:C.txt,flex:1}}>{selStage.stage}</div>
              {isAdmin&&<button className="btn" onClick={()=>setEditing({mode:"stage",item:{...selStage}})} style={{background:`${C.blue}18`,color:C.blue2,padding:"5px 12px",fontSize:11,borderRadius:7,border:`1px solid ${C.blue}33`}}>✎ Edit</button>}
            </div>
            {/* Quick View card */}
            {selStage.quick&&selStage.quick.length>0&&(
              <div style={{background:`linear-gradient(135deg,${C.amber}15,${C.orange}08)`,border:`2px solid ${C.amber}44`,borderRadius:10,padding:"12px 14px"}}>
                <div style={{fontSize:10,fontWeight:700,color:C.amber,letterSpacing:"0.1em",marginBottom:8}}>⚡ QUICK VIEW — przed rozmową</div>
                {selStage.quick.map((b,i)=>(
                  <div key={i} style={{display:"flex",gap:8,marginBottom:i<selStage.quick.length-1?6:0}}>
                    <span style={{color:C.amber,fontWeight:700,fontSize:12,flexShrink:0,marginTop:1}}>{i+1}.</span>
                    <span style={{fontSize:12,color:C.txt,lineHeight:1.6}}>{b}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
              <div style={{fontWeight:600,fontSize:13,color:C.txt,marginBottom:4}}>{selStage.title}</div>
              <div style={{display:"inline-block",background:`${C.amber}18`,color:C.amber,border:`1px solid ${C.amber}33`,borderRadius:7,padding:"4px 10px",fontSize:11,marginBottom:12}}>🎯 {selStage.target}</div>
              <div style={{fontSize:10,color:C.txt3,marginBottom:12,fontStyle:"italic"}}>📖 Full manual — lea to learn, use Quick View above before calls</div>
              <pre style={{fontFamily:"'Inter',sans-serif",fontSize:12,color:C.txt2,lineHeight:1.9,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{selStage.tasks}</pre>
            </div>
          </div>
        )}

        {/* EXTRAS LIST — grouped by stage */}
        {tab==="extras"&&!selId&&(()=>{
          // Define stage order and display
          const stageOrder = [
            {key:"New",        label:"New Lead",          icon:"1", color:C.txt3},
            {key:"Contacted",  label:"First Contact",     icon:"2", color:C.blue},
            {key:"Interested", label:"Discovery",         icon:"3", color:C.indigo},
            {key:"Meeting Scheduled", label:"Meeting",    icon:"4", color:C.amber},
            {key:"Proposal Sent",     label:"Proposal",   icon:"6", color:C.teal},
            {key:"Negotiation",       label:"Negotiation",icon:"7", color:C.orange},
            {key:"Closed Won",        label:"After Signing",icon:"✓",color:C.green},
            {key:"Always",    label:"Always Relevant",    icon:"★", color:C.purple},
          ];
          return stageOrder.map(({key,label,icon,color})=>{
            const group = extras.filter(e=>(e.stageGroup||"Always")===key);
            if(!group.length) return null;
            return(
              <div key={key} style={{marginBottom:4}}>
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 4px",marginBottom:5}}>
                  <div style={{width:22,height:22,borderRadius:6,background:`${color}22`,border:`1px solid ${color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color,flexShrink:0}}>{icon}</div>
                  <div style={{fontSize:10,fontWeight:700,color:color,letterSpacing:"0.08em",flex:1}}>{label.toUpperCase()}</div>
                  <div style={{fontSize:9,color:C.txt3}}>{group.length} card{group.length!==1?"s":""}</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:5,paddingLeft:8,borderLeft:`2px solid ${color}33`}}>
                  {group.map(e=>{
                    const c=C[e.color]||C.txt3;
                    return(
                      <div key={e.id} style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:9,padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}
                        onClick={()=>setSelId(e.id)}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:600,fontSize:12,color:C.txt}}>{e.title}</div>
                        </div>
                        <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0,marginLeft:8}}>
                          <div style={{width:8,height:8,borderRadius:2,background:c,flexShrink:0}}/>
                          {isAdmin&&(
                            <button className="btn" onClick={ev=>{ev.stopPropagation();setEditing({mode:"extra",item:{...e}});}}
                              style={{background:`${C.blue}18`,color:C.blue2,padding:"3px 8px",fontSize:10,borderRadius:5,border:`1px solid ${C.blue}33`}}>✎</button>
                          )}
                          <span style={{color:C.txt3,fontSize:11}}>›</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          });
        })()}
        {tab==="extras"&&selId&&selExtra&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button className="btn" onClick={()=>setSelId(null)} style={{background:C.bg3,color:C.txt3,padding:"6px 12px",fontSize:11,borderRadius:7,border:`1px solid ${C.border}`}}>← Back</button>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:14,color:C.txt,flex:1}}>{selExtra.title}</div>
              {isAdmin&&<button className="btn" onClick={()=>setEditing({mode:"extra",item:{...selExtra}})} style={{background:`${C.blue}18`,color:C.blue2,padding:"5px 12px",fontSize:11,borderRadius:7,border:`1px solid ${C.blue}33`}}>✎ Edit</button>}
            </div>
            {selExtra.quick&&selExtra.quick.length>0&&(
              <div style={{background:`linear-gradient(135deg,${C.amber}15,${C.orange}08)`,border:`2px solid ${C.amber}44`,borderRadius:10,padding:"12px 14px"}}>
                <div style={{fontSize:10,fontWeight:700,color:C.amber,letterSpacing:"0.1em",marginBottom:8}}>⚡ QUICK VIEW — kluczowe punkty</div>
                {selExtra.quick.map((b,i)=>(
                  <div key={i} style={{display:"flex",gap:8,marginBottom:i<selExtra.quick.length-1?6:0}}>
                    <span style={{color:C.amber,fontWeight:700,fontSize:12,flexShrink:0,marginTop:1}}>{i+1}.</span>
                    <span style={{fontSize:12,color:C.txt,lineHeight:1.6}}>{b}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
              <div style={{fontSize:10,color:C.txt3,marginBottom:10,fontStyle:"italic"}}>📖 Full manual — read to learn</div>
              <pre style={{fontFamily:"'Inter',sans-serif",fontSize:12,color:C.txt2,lineHeight:1.9,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{selExtra.text}</pre>
            </div>
          </div>
        )}

        {tab==="scripts"&&<ScriptsTab tplData={tplData} isAdmin={isAdmin} setTemplates={setTemplates}/>}
      </div>
    </div>
  );
}

// ─── AI CHAT TAB ─────────────────────────────────────────────────
function AIChatTab({locs,hqs,users,cur,onUpdateLoc,onUpdateHQ,onSaveLoc,onSaveHQ}) {
  const [msgs,setMsgs]=useState([]); const [input,setInput]=useState(""); const [loading,setLoading]=useState(false);
  const [pending,setPending]=useState(null);
  const bottomRef=useRef(null); const taRef=useRef(null);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,loading]);

  const ctx=()=>{
    const active=locs.filter(l=>!["Closed Won","Closed Lost"].includes(l.stage));
    const won=locs.filter(l=>l.stage==="Closed Won");
    const placed=won.reduce((s,l)=>s+(parseInt(l.workers)||0),0);
    const hot=active.filter(l=>l.temp==="🔥 Hot");
    const overdue=active.filter(l=>isOD(l.nextStepDate,l.stage));
    // Full HQ details
    const hqDetails = hqs.slice(0,8).map(h=>`${h.company} (${h.industry||"?"}): ${h.employees||"?"}emp, turnover ${h.annualTurnover||"?"}, intelligence: ${h.intelligence?.substring(0,100)||"none"}`).join("\n");
    // Full active deals with SPIN
    const dealDetails = active.slice(0,10).map(l=>{
      const hq=hqs.find(h=>h.id===l.parentId);
      return `${l.company}/${l.location} [${l.stage}/${l.temp}]: ${l.workers||"?"}w ${l.workerType||""}, contact:${l.contact||"?"}(${l.role||"?"}), pain:${l.painScore||"?"}/5, SPIN-P:"${l.spin?.p?.substring(0,60)||"empty"}", nextStep:${l.nextStep||"none"} by ${l.nextStepDate||"?"}`;
    }).join("\n");
    return `You are the internal sales AI for Gremi Personal Romania. Talking with ${cur.name} (${cur.role}).

PIPELINE SUMMARY:
Total: ${locs.length} locations, ${active.length} active, ${won.length} won, ${placed} workers placed.
Hot: ${hot.length}, Overdue: ${overdue.length}
Stages: ${STAGES.map(s=>{const c=active.filter(l=>l.stage===s).length;return c>0?`${s}(${c})`:null}).filter(Boolean).join(", ")}

COMPANIES (${hqs.length} total):
${hqDetails}

ACTIVE DEALS (top 10):
${dealDetails}

CAPABILITIES: You can suggest CRM actions. End response with ONE JSON block:

UPDATE existing deal:
\`\`\`json
{"action":"update_loc","company":"EXACT name","location":"EXACT location","fields":{"stage":"Interested","temp":"🔥 Hot","nextStep":"Call Monday","nextStepDate":"2026-03-30","painScore":4,"spin_p":"pain text","spin_s":"situation","spin_i":"implication","spin_n":"need","notes":"context"}}
\`\`\`

UPDATE existing company:
\`\`\`json
{"action":"update_hq","company":"EXACT name","fields":{"intelligence":"research notes","employees":"500","annualTurnover":"5000000"}}
\`\`\`

CREATE new lead (when user provides info about a new company):
\`\`\`json
{"action":"create_lead","hq_company":"Company Name","hq_industry":"Auto Parts","hq_address":"str. X, Cluj","hq_employees":"300","hq_intelligence":"what you know about them","loc_location":"Cluj-Napoca","loc_county":"Cluj","loc_workers":"20","loc_worker_type":"UA Ukrainian","loc_service":"Outsourcing","loc_contact":"Ion Popescu","loc_role":"HR Director","loc_phone":"0721000000","loc_email":"ion@company.ro","loc_notes":"any notes","spin_p":"pain hypothesis"}
\`\`\`

Include ONLY known fields. Use exact company/location names for updates. Respond in the user\'s language.`;
  };

  const parseAction=(text)=>{
    const m=text.match(/```json\s*([\s\S]*?)```/);
    if(!m)return null;
    try{return JSON.parse(m[1].trim());}catch(e){return null;}
  };
  const stripAction=(text)=>text.replace(/```json[\s\S]*?```/g,"").trim();

  const applyAction=(action)=>{
    if(!action||!onUpdateLoc||!onUpdateHQ)return;
    if(action.action==="update_loc"){
      const loc=locs.find(l=>l.company.toLowerCase()===action.company?.toLowerCase()&&(!action.location||l.location?.toLowerCase()===action.location?.toLowerCase()));
      if(!loc){setMsgs(prev=>[...prev,{role:"system",content:`❌ Location not found: ${action.company} / ${action.location}`}]);return;}
      const patch={};
      const f=action.fields||{};
      if(f.stage)patch.stage=f.stage;
      if(f.nextStep)patch.nextStep=f.nextStep;
      if(f.nextStepDate)patch.nextStepDate=f.nextStepDate;
      if(f.painScore)patch.painScore=parseInt(f.painScore);
      if(f.notes)patch.notes=(loc.notes?loc.notes+"\n\n":"")+"[AI] "+f.notes;
      if(f.spin_p||f.spin_s||f.spin_i||f.spin_n){
        const spin={...loc.spin};
        if(f.spin_s)spin.s=f.spin_s;if(f.spin_p)spin.p=f.spin_p;if(f.spin_i)spin.i=f.spin_i;if(f.spin_n)spin.n=f.spin_n;
        patch.spin=spin;
      }
      if(Object.keys(patch).length>0){
        const act={id:Date.now(),type:"Note",note:"[AI Chat] Updated: "+Object.keys(patch).join(", "),date:new Date().toISOString().slice(0,10),time:new Date().toTimeString().slice(0,5)};
        patch.activities=[act,...(loc.activities||[])];
        onUpdateLoc(loc.id,patch);
        setMsgs(prev=>[...prev,{role:"system",content:`✅ Updated ${loc.company}/${loc.location}: ${Object.keys(f).join(", ")}`}]);
      }
    } else if(action.action==="update_hq"){
      const hq=hqs.find(h=>h.company.toLowerCase()===action.company?.toLowerCase());
      if(!hq){setMsgs(prev=>[...prev,{role:"system",content:`❌ Company not found: ${action.company}`}]);return;}
      const hqPatch={};
      const f=action.fields||{};
      if(f.intelligence)hqPatch.intelligence=(hq.intelligence?hq.intelligence+"\n\n":"")+"[AI] "+f.intelligence;
      if(f.annualTurnover)hqPatch.annualTurnover=f.annualTurnover;
      if(f.employees)hqPatch.employees=f.employees;
      if(f.seasonality)hqPatch.seasonality=f.seasonality;
      if(Object.keys(hqPatch).length>0){
        onUpdateHQ(hq.id,hqPatch);
        setMsgs(prev=>[...prev,{role:"system",content:`✅ Updated company ${hq.company}: ${Object.keys(f).join(", ")}`}]);
      }
    }
    setPending(null);
  };

  const applyCreate=async(action)=>{
    if(!onSaveHQ||!onSaveLoc){
      setMsgs(prev=>[...prev,{role:"system",content:"❌ Cannot create leads from this context. Use the main 🤖 AI tab."}]);
      return;
    }
    const a=action;
    try{
      // Find or create HQ
      let parentId=null;
      const existingHQ=hqs.find(h=>h.company?.toLowerCase()===a.hq_company?.toLowerCase());
      if(existingHQ){
        parentId=existingHQ.id;
        setMsgs(prev=>[...prev,{role:"system",content:`ℹ️ Company "${a.hq_company}" already exists — adding new location.`}]);
      } else {
        const newHQ={...EMPTY_HQ,company:a.hq_company||"",industry:a.hq_industry||"",address:a.hq_address||"",employees:a.hq_employees||"",intelligence:a.hq_intelligence||"",id:null};
        const created=await onSaveHQ(newHQ);
        parentId=created?.id||Date.now();
        setMsgs(prev=>[...prev,{role:"system",content:`✅ New company created: ${a.hq_company}`}]);
      }
      // Create location
      const spin={s:a.spin_s||"",p:a.spin_p||"",i:a.spin_i||"",n:a.spin_n||""};
      const newLoc={...EMPTY_LOC,
        parentId,company:a.hq_company||"",location:a.loc_location||a.hq_company||"",
        county:a.loc_county||"",address:a.loc_address||"",workers:a.loc_workers||"",
        workerType:a.loc_worker_type||"",service:a.loc_service||"Outsourcing",
        contact:a.loc_contact||"",role:a.loc_role||"",phone:a.loc_phone||"",email:a.loc_email||"",
        notes:a.loc_notes||"",spin,painSummary:a.spin_p||"",
        stage:"New",temp:"❄️ Cold",salesId:cur?.id,id:null
      };
      await onSaveLoc(newLoc,null);
      setMsgs(prev=>[...prev,{role:"system",content:`✅ New lead created: ${a.hq_company} / ${a.loc_location}`}]);
      setPending(null);
    }catch(e){
      setMsgs(prev=>[...prev,{role:"system",content:"❌ Error creating lead: "+e.message}]);
    }
  };

  const send=async()=>{
    const text=input.trim(); if(!text||loading) return;
    const newMsgs=[...msgs,{role:"user",content:text}]; setMsgs(newMsgs); setInput(""); setLoading(true); setPending(null);
    try{
      const res=await fetch(AI_PROXY,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${SB_KEY}`},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:2000,system:ctx(),messages:newMsgs.filter(m=>m.role!=="system").map(m=>({role:m.role,content:m.content}))})});
      const d=await res.json(); const raw=d.content?.[0]?.text||"Error.";
      const action=parseAction(raw); const clean=stripAction(raw);
      setMsgs(prev=>[...prev,{role:"assistant",content:clean}]);
      if(action){
        if(action.action==="create_lead") applyCreate(action); // auto-execute create
        else setPending(action); // show Apply button for updates
      }
    }catch(e){setMsgs(prev=>[...prev,{role:"assistant",content:"Error: "+e.message}]);}
    setLoading(false);
  };

  const parseMd=(t)=>t.replace(/\*\*(.*?)\*\*/g,"<strong style='color:"+C.txt+"'>$1</strong>").replace(/\*(.*?)\*/g,"<em>$1</em>").replace(/^[•\-] (.+)$/gm,"<div style='padding:1px 0 1px 12px;position:relative'><span style='position:absolute;left:0;color:"+C.blue+"'>›</span>$1</div>").replace(/^(\d+)\. (.+)$/gm,"<div style='padding:1px 0 1px 14px'><span style='color:"+C.blue+";margin-right:4px'>$1.</span>$2</div>").replace(/^#{1,3} (.+)$/gm,"<div style='color:"+C.blue+";font-weight:700;margin:8px 0 4px;font-size:13px'>$1</div>").replace(/\n\n/g,"<div style='height:6px'></div>");

  const quicks=[
    {l:"📊 Pipeline review",t:"Analyze my full pipeline. What are the top 3 priorities today?"},
    {l:"🔥 Hot deals",t:"Which hot deals are most likely to close this month? What should I do for each?"},
    {l:"📈 Strategy",t:"Based on the pipeline, what should be my sales focus for the next 2 weeks?"},
    {l:"✉️ Draft email",t:"Draft a follow-up email for the deal most likely to close this week."},
    {l:"📋 Weekly report",t:"Prepare a brief weekly pipeline report for my management in Warsaw."},
  ];

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"8px 12px",borderBottom:`1px solid ${C.border}`,flexShrink:0,background:C.bg0}}>
        <div style={{fontSize:10,color:C.teal,fontWeight:700,letterSpacing:"0.08em",marginBottom:6}}>🤖 AI PIPELINE ASSISTANT</div>
        <div style={{display:"flex",gap:5,overflowX:"auto"}}>
          {quicks.map(q=>(
            <button key={q.l} className="btn" onClick={()=>{setInput(q.t);taRef.current?.focus();}} style={{background:C.bg3,border:`1px solid ${C.border}`,color:C.txt3,padding:"5px 10px",borderRadius:6,fontSize:11,flexShrink:0}}>
              {q.l}
            </button>
          ))}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>
        {msgs.length===0&&(
          <div style={{padding:"30px 20px",textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:12}}>🤖</div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:15,color:C.txt,fontWeight:600,marginBottom:8}}>AI Pipeline Assistant</div>
            <div style={{fontSize:13,color:C.txt3,lineHeight:1.7}}>Full access to your pipeline data.<br/>Ask in any language — Polish, Romanian, Russian, English.</div>
          </div>
        )}
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",gap:6}}>
            {m.role==="assistant"&&<div style={{width:26,height:26,borderRadius:6,background:`linear-gradient(135deg,${C.blue},${C.indigo})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,marginTop:2}}>🤖</div>}
            <div style={{maxWidth:"88%",background:m.role==="user"?`${C.blue}15`:C.bg2,border:`1px solid ${m.role==="user"?C.blue+"33":C.border}`,borderRadius:10,padding:"10px 14px",fontSize:13,lineHeight:1.7,color:C.txt2}} dangerouslySetInnerHTML={{__html:parseMd(m.content)}}/>
          </div>
        ))}
        {loading&&<div style={{display:"flex",gap:6}}><div style={{width:26,height:26,borderRadius:6,background:`linear-gradient(135deg,${C.blue},${C.indigo})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>🤖</div><div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",display:"flex",gap:4}}>{[0,0.2,0.4].map((d,i)=><span key={i} style={{width:6,height:6,background:C.blue,borderRadius:"50%",animation:`pulse 1s infinite ${d}s`}}/>)}</div></div>}
        <div ref={bottomRef}/>
      </div>
      {pending&&(
        <div style={{borderTop:`1px solid ${C.teal}44`,background:`${C.teal}08`,padding:"10px 12px",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{fontSize:11,fontWeight:700,color:C.teal}}>🤖 SUGGESTED UPDATE — {pending.action==="update_hq"?"Company":"Deal"}: <span style={{color:C.txt}}>{pending.company}{pending.location?` / ${pending.location}`:""}</span></div>
            <div style={{display:"flex",gap:5}}>
              <button className="btn" onClick={()=>applyAction(pending)} style={{background:`linear-gradient(135deg,${C.green},${C.teal})`,color:"#fff",padding:"6px 14px",fontSize:12,borderRadius:7}}>✅ Apply</button>
              <button className="btn" onClick={()=>setPending(null)} style={{background:C.bg4,color:C.txt3,padding:"6px 10px",fontSize:12,borderRadius:7,border:`1px solid ${C.border}`}}>✕</button>
            </div>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {Object.entries(pending.fields||{}).map(([k,v])=>(
              <div key={k} style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 8px",fontSize:11}}>
                <span style={{color:C.teal,fontWeight:600}}>{k.replace(/_/g," ")}: </span>
                <span style={{color:C.txt2}}>{String(v).substring(0,60)}{String(v).length>60?"...":""}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{borderTop:`1px solid ${C.border}`,padding:"10px 12px",display:"flex",gap:8,alignItems:"flex-end",flexShrink:0,background:C.bg0}}>
        <textarea ref={taRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Ask about your pipeline... (Enter to send)" rows={2} style={{flex:1,background:C.bg3,border:`1px solid ${C.border}`,color:C.txt,borderRadius:8,padding:"10px 12px",fontSize:13,fontFamily:"'Inter',sans-serif",resize:"none",lineHeight:1.5,outline:"none"}}/>
        <button className="btn" onClick={send} disabled={loading||!input.trim()} style={{background:loading||!input.trim()?C.bg4:`linear-gradient(135deg,${C.blue},${C.indigo})`,color:loading||!input.trim()?C.txt3:"#fff",width:40,height:40,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>↑</button>
      </div>
    </div>
  );
}


// ─── KPI TAB ─────────────────────────────────────────────────────
function KPITab({locs,hqs,users,cur,isAdmin,isTeamLead}) {
  const [aiAnalysis,setAiAnalysis]=useState(""); const [aiLoading,setAiLoading]=useState(false);
  const myLocs = (isAdmin||isTeamLead) ? locs : locs.filter(l=>l.salesId===cur.id);
  const active=myLocs.filter(l=>!["Closed Won","Closed Lost"].includes(l.stage));
  const won=myLocs.filter(l=>l.stage==="Closed Won");
  const lost=myLocs.filter(l=>l.stage==="Closed Lost");
  const placed=won.reduce((s,l)=>s+(parseInt(l.workers)||0),0);
  const pipe=active.filter(l=>l.stage==="Negotiation"||l.stage==="Proposal Sent").reduce((s,l)=>s+(parseInt(l.workers)||0)*5800,0);
  const overdue=active.filter(l=>isOD(l.nextStepDate,l.stage));
  const hot=active.filter(l=>l.temp==="🔥 Hot");
  const noStep=active.filter(l=>!l.nextStep&&l.temp==="🔥 Hot");
  const stageCount=STAGES.reduce((a,s)=>({...a,[s]:myLocs.filter(l=>l.stage===s).length}),{});
  const byUser=(isAdmin||isTeamLead)?users.filter(u=>u.active).map(u=>{const ul=myLocs.filter(l=>l.salesId===u.id);return{name:u.name,total:ul.length,won:ul.filter(l=>l.stage==="Closed Won").length,placed:ul.filter(l=>l.stage==="Closed Won").reduce((s,l)=>s+(parseInt(l.workers)||0),0),active:ul.filter(l=>!["Closed Won","Closed Lost"].includes(l.stage)).length};}):{};

  const loadAnalysis=async()=>{
    setAiLoading(true);
    const stageStr=STAGES.map(s=>`${s}: ${stageCount[s]||0}`).join(", ");
    const ctx=`Pipeline for ${cur.name} at Gremi Personal Romania:
Total: ${myLocs.length} locations. Won: ${won.length}. Lost: ${lost.length}. Active: ${active.length}.
Workers placed: ${placed}. Pipeline value (Negotiation+Proposal): ~${(pipe/1000).toFixed(0)}k RON.
Hot deals: ${hot.length}. Overdue follow-ups: ${overdue.length}. Hot with no next step: ${noStep.length}.
Stage distribution: ${stageStr}
Win rate: ${myLocs.length>0?Math.round(won.length/myLocs.length*100):0}%.
Top hot deals: ${hot.slice(0,5).map(l=>`${l.company} (${l.workers||"?"}w, ${l.stage})`).join("; ")}`;
    const text=await aiCall(
      `You are a sales analyst for Gremi Personal Romania. Write a 4-5 sentence pipeline intelligence brief. Identify: top bottleneck in the funnel, which stage has too many stuck deals, biggest revenue opportunity, specific action recommendation. Be direct and specific. Answer in the same language as the context.`,
      ctx, 500
    );
    setAiAnalysis(text);
    setAiLoading(false);
  };

  useEffect(()=>{loadAnalysis();},[]);

  const Stat=({label,value,color,sub})=>(
    <div style={{background:C.bg2,border:`1px solid ${color||C.border}44`,borderTop:`3px solid ${color||C.border2}`,borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
      <div style={{fontSize:24,fontWeight:700,color:color||C.txt,fontFamily:"'Space Grotesk',sans-serif"}}>{value}</div>
      <div style={{fontSize:10,color:C.txt3,marginTop:3}}>{label}</div>
      {sub&&<div style={{fontSize:11,color:color||C.txt2,marginTop:4,fontWeight:500}}>{sub}</div>}
    </div>
  );

  return(
    <div style={{flex:1,overflowY:"auto",padding:12,display:"flex",flexDirection:"column",gap:12}}>
      {/* AI Intelligence */}
      <div style={{background:`linear-gradient(135deg,${C.bg2},${C.bg3})`,border:`1px solid ${C.teal}44`,borderRadius:12,padding:14}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:aiAnalysis||aiLoading?10:0}}>
          <div style={{width:26,height:26,borderRadius:7,background:`linear-gradient(135deg,${C.blue},${C.teal})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>🤖</div>
          <div style={{flex:1}}><div style={{fontSize:11,fontWeight:700,color:C.teal,letterSpacing:"0.06em"}}>PIPELINE INTELLIGENCE</div></div>
          <button className="btn" onClick={loadAnalysis} disabled={aiLoading} style={{background:`${C.teal}18`,color:C.teal,padding:"5px 10px",fontSize:10,borderRadius:6,border:`1px solid ${C.teal}33`}}>{aiLoading?"...":"↻"}</button>
        </div>
        {aiLoading&&<div style={{display:"flex",gap:4}}>{[0,0.2,0.4].map((d,i)=><span key={i} style={{width:6,height:6,background:C.teal,borderRadius:"50%",animation:`pulse 1s infinite ${d}s`}}/>)}</div>}
        {aiAnalysis&&!aiLoading&&<div style={{fontSize:13,color:C.txt2,lineHeight:1.7}}>{aiAnalysis}</div>}
      </div>

      {/* Top stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <Stat label="LOCATIONS TOTAL" value={myLocs.length} color={C.txt2}/>
        <Stat label="CLOSED WON" value={won.length} color={C.green} sub={`${myLocs.length>0?Math.round(won.length/myLocs.length*100):0}% win rate`}/>
        <Stat label="WORKERS PLACED" value={placed} color={C.teal}/>
        <Stat label="PIPELINE VALUE" value={`${(pipe/1000).toFixed(0)}k`} color={C.amber} sub="RON (monthly est.)"/>
        <Stat label="OVERDUE" value={overdue.length} color={overdue.length>0?C.red:C.green}/>
        <Stat label="HOT DEALS" value={hot.length} color={C.orange}/>
      </div>

      {/* Stage funnel */}
      <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
        <div className="lbl" style={{marginBottom:10}}>STAGE FUNNEL</div>
        {STAGES.filter(s=>stageCount[s]>0).map(s=>{
          const cnt=stageCount[s]; const pct=Math.round(cnt/myLocs.length*100); const c=getSC()[s]||C.txt3;
          return(
            <div key={s} style={{display:"flex",alignItems:"center",gap:10,marginBottom:7}}>
              <div style={{fontSize:11,color:c,fontWeight:600,width:130,flexShrink:0}}>{s}</div>
              <div style={{flex:1,background:C.bg4,borderRadius:3,height:6,overflow:"hidden"}}><div style={{width:pct+"%",background:c,height:6,borderRadius:3,transition:"width 0.4s"}}/></div>
              <div style={{fontSize:11,color:C.txt3,width:30,textAlign:"right",flexShrink:0}}>{cnt}</div>
            </div>
          );
        })}
      </div>

      {/* Worker type breakdown */}
      {(()=>{
        const types={};myLocs.forEach(l=>{if(l.workerType){const t=l.workerType.split(",")[0].trim();types[t]=(types[t]||0)+(parseInt(l.workers)||0);}});
        const entries=Object.entries(types).sort((a,b)=>b[1]-a[1]);
        if(entries.length===0)return null;
        return(
          <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
            <div className="lbl" style={{marginBottom:10}}>WORKERS BY TYPE</div>
            {entries.map(([t,n])=>(
              <div key={t} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{fontSize:12,color:C.txt2}}>{t}</div>
                <div style={{fontWeight:700,color:C.teal,fontFamily:"'Space Grotesk',sans-serif"}}>{n}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Team breakdown */}
      {(isAdmin||isTeamLead)&&Array.isArray(byUser)&&byUser.length>0&&(
        <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
          <div className="lbl" style={{marginBottom:10}}>TEAM BREAKDOWN</div>
          {byUser.map(u=>(
            <div key={u.name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,padding:"8px",borderRadius:8,background:C.bg3}}>
              <div style={{fontWeight:600,fontSize:13,color:C.txt}}>{u.name}</div>
              <div style={{display:"flex",gap:10,fontSize:11}}>
                <span style={{color:C.txt3}}>{u.active} active</span>
                <span style={{color:C.green,fontWeight:600}}>{u.won}W</span>
                <span style={{color:C.teal,fontWeight:600}}>{u.placed}w</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── DASHBOARD TAB (Today actions + KPI stats merged) ────────────
function DashboardTab({locs, hqs, users, cur, onSelectLoc, isAdmin, isTeamLead}) {
  const [summary,setSummary]=useState(""); const [summaryLoading,setSummaryLoading]=useState(false);
  const [aiAnalysis,setAiAnalysis]=useState(""); const [aiLoading,setAiLoading]=useState(false);
  const [section,setSection]=useState("actions"); // actions | stats
  const today=new Date();
  const uN=id=>users.find(u=>u.id===id)?.name||"—";
  const myLocs=(isAdmin||isTeamLead)?locs:locs.filter(l=>l.salesId===cur.id);
  const active=myLocs.filter(l=>!["Closed Won","Closed Lost"].includes(l.stage));
  const won=myLocs.filter(l=>l.stage==="Closed Won");
  const lost=myLocs.filter(l=>l.stage==="Closed Lost");
  const placed=won.reduce((s,l)=>s+(parseInt(l.workers)||0),0);
  const pipe=active.filter(l=>l.stage==="Negotiation"||l.stage==="Proposal Sent").reduce((s,l)=>s+(parseInt(l.workers)||0)*5800,0);
  const overdue=active.filter(l=>l.nextStepDate&&new Date(l.nextStepDate)<today);
  const noContact7=active.filter(l=>{if(!l.lastContact)return true;return Math.ceil((today-new Date(l.lastContact))/86400000)>7&&!overdue.find(o=>o.id===l.id);});
  const meetingsToday=active.filter(l=>{if(!l.nextStepDate)return false;const diff=Math.abs(Math.ceil((new Date(l.nextStepDate)-today)/86400000));return diff<=1&&l.stage==="Meeting Scheduled";});
  const hotNoStep=active.filter(l=>l.temp==="🔥 Hot"&&!l.nextStep&&!overdue.find(o=>o.id===l.id));
  const newUnqualified=active.filter(l=>l.stage==="New"&&!l.contact);
  const hot=active.filter(l=>l.temp==="🔥 Hot");
  const stageCount=STAGES.reduce((a,s)=>({...a,[s]:myLocs.filter(l=>l.stage===s).length}),{});
  const byUser=(isAdmin||isTeamLead)?users.filter(u=>u.active).map(u=>{const ul=myLocs.filter(l=>l.salesId===u.id);return{name:u.name,total:ul.length,won:ul.filter(l=>l.stage==="Closed Won").length,placed:ul.filter(l=>l.stage==="Closed Won").reduce((s,l)=>s+(parseInt(l.workers)||0),0),active:ul.filter(l=>!["Closed Won","Closed Lost"].includes(l.stage)).length};}):[];

  const loadSummary=async()=>{
    setSummaryLoading(true);
    const ctx=`Pipeline for ${cur.name}: Overdue: ${overdue.length} ${overdue.slice(0,3).map(l=>`${l.company}(${l.stage})`).join("; ")}. Meetings today: ${meetingsToday.length}. Hot/no-step: ${hotNoStep.length}. Top deals: ${active.filter(l=>parseInt(l.workers)>0).sort((a,b)=>(parseInt(b.workers)||0)-(parseInt(a.workers)||0)).slice(0,3).map(l=>`${l.company} ${l.workers}w ${l.stage}`).join("; ")}`;
    const t=await aiCall("You are a sales AI for Gremi Personal Romania. Write a 2-3 sentence morning briefing. Be direct, specific, name the highest-priority deal. One clear recommendation. No fluff.",ctx,400);
    setSummary(t);setSummaryLoading(false);
  };
  const loadAnalysis=async()=>{
    setAiLoading(true);
    const ctx=`Pipeline: ${myLocs.length} locs, ${won.length} won, ${active.length} active, ${placed} workers placed. Pipeline RON: ${Math.round(pipe/1000)}k. Hot: ${hot.length}. Overdue: ${overdue.length}. Stages: ${STAGES.map(s=>`${s}:${stageCount[s]||0}`).join(",")}`;
    const t=await aiCall("Sales analyst for Gremi Personal Romania. 4-5 sentences: top bottleneck, stuck stage, biggest opportunity, specific action recommendation. Direct and specific.",ctx,500);
    setAiAnalysis(t);setAiLoading(false);
  };
  useEffect(()=>{loadSummary();loadAnalysis();},[]);

  const DealRow=({l})=>{
    const sc=getSC()[l.stage]||C.txt3;const od=isOD(l.nextStepDate,l.stage);
    return(
      <div className="row-hover" onClick={()=>onSelectLoc(l)} style={{padding:"9px 14px",borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10}}>
        <HealthDot loc={l} size={7}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:600,fontSize:13,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.company}</div>
          <div style={{fontSize:11,color:C.txt3}}>📍 {l.location}{l.workers?` · 👷${l.workers}`:""}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2,flexShrink:0}}>
          <span className="pill" style={{background:sc+"22",color:sc,border:`1px solid ${sc}44`,fontSize:9}}>{l.stage}</span>
          {l.nextStepDate&&<span style={{fontSize:9,color:od?C.red:C.txt3,fontWeight:od?700:400}}>{od?"⚠ ":""}{fmtDate(l.nextStepDate)}</span>}
        </div>
      </div>
    );
  };

  const ActionGroup=({icon,title,color,items})=>{
    if(!items.length)return null;
    return(
      <div style={{background:C.bg2,border:`1px solid ${color}33`,borderLeft:`3px solid ${color}`,borderRadius:10,marginBottom:8}}>
        <div style={{padding:"8px 14px",background:`${color}10`,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14}}>{icon}</span>
          <span style={{fontSize:10,fontWeight:700,color:color,letterSpacing:"0.06em"}}>{title.toUpperCase()}</span>
          <span style={{marginLeft:"auto",background:`${color}22`,color:color,borderRadius:20,padding:"1px 8px",fontSize:11,fontWeight:700}}>{items.length}</span>
        </div>
        {items.map(l=><DealRow key={l.id} l={l}/>)}
      </div>
    );
  };

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0}}>
      {/* Section toggle */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,background:C.bg0,flexShrink:0}}>
        {[["actions","⚡ Today's Actions"],["stats","📊 Pipeline Stats"]].map(([id,label])=>(
          <button key={id} className="tab" onClick={()=>setSection(id)}
            style={{flex:1,background:section===id?`${C.blue}12`:"transparent",color:section===id?C.blue2:C.txt3,borderBottom:`2px solid ${section===id?C.blue:"transparent"}`}}>
            {label}
          </button>
        ))}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:12,paddingBottom:70,display:"flex",flexDirection:"column",gap:10}}>
        {/* AI Brief — shown in both sections */}
        <div style={{background:`linear-gradient(135deg,${C.bg2},${C.bg3})`,border:`1px solid ${C.teal}44`,borderRadius:12,padding:14}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:(summaryLoading||summary||aiLoading||aiAnalysis)?10:0}}>
            <div style={{width:26,height:26,borderRadius:7,background:`linear-gradient(135deg,${C.blue},${C.teal})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>🤖</div>
            <div style={{flex:1}}>
              <div style={{fontSize:11,fontWeight:700,color:C.teal,letterSpacing:"0.06em"}}>{section==="actions"?"AI MORNING BRIEF":"PIPELINE INTELLIGENCE"}</div>
              <div style={{fontSize:10,color:C.txt3}}>{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"2-digit",month:"long"})}</div>
            </div>
            <button className="btn" onClick={section==="actions"?loadSummary:loadAnalysis} disabled={summaryLoading||aiLoading}
              style={{background:`${C.teal}18`,color:C.teal,padding:"5px 10px",fontSize:10,borderRadius:6,border:`1px solid ${C.teal}33`}}>
              {(summaryLoading||aiLoading)?"...":"↻"}
            </button>
          </div>
          {(summaryLoading||aiLoading)&&<div style={{display:"flex",gap:4}}>{[0,.2,.4].map((d,i)=><span key={i} style={{width:6,height:6,background:C.teal,borderRadius:"50%",animation:`pulse 1s infinite ${d}s`}}/>)}</div>}
          {section==="actions"&&summary&&!summaryLoading&&<div style={{fontSize:13,color:C.txt2,lineHeight:1.7}}>{summary}</div>}
          {section==="stats"&&aiAnalysis&&!aiLoading&&<div style={{fontSize:13,color:C.txt2,lineHeight:1.7}}>{aiAnalysis}</div>}
        </div>

        {section==="actions"&&(
          <>
            {/* Quick stats row */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {[[overdue.length,"Overdue",C.red,"⚠"],[meetingsToday.length,"Meetings",C.amber,"📅"],[hotNoStep.length,"Hot/NoStep",C.orange,"🔥"]].map(([v,l,c,icon])=>(
                <div key={l} style={{background:C.bg2,border:`1px solid ${v>0?c+"44":C.border}`,borderTop:`3px solid ${v>0?c:C.border2}`,padding:"10px",textAlign:"center",borderRadius:10}}>
                  <div style={{fontSize:20,fontWeight:700,color:v>0?c:C.txt3,fontFamily:"'Space Grotesk',sans-serif"}}>{v}</div>
                  <div style={{fontSize:9,color:C.txt3,marginTop:2}}>{l.toUpperCase()}</div>
                </div>
              ))}
            </div>
            <ActionGroup icon="⚠" title="Overdue Follow-ups" color={C.red} items={overdue}/>
            <ActionGroup icon="📅" title="Meetings Today/Tomorrow" color={C.amber} items={meetingsToday}/>
            <ActionGroup icon="🔥" title="Hot — No Next Step" color={C.orange} items={hotNoStep}/>
            <ActionGroup icon="📭" title="No Contact > 7 days" color={C.blue} items={noContact7}/>
            <ActionGroup icon="🆕" title="New Unqualified" color={C.teal} items={newUnqualified}/>
            {!overdue.length&&!meetingsToday.length&&!hotNoStep.length&&(
              <div style={{padding:40,textAlign:"center",color:C.green,fontSize:14}}>✅ Pipeline is clean — no urgent actions</div>
            )}
          </>
        )}

        {section==="stats"&&(
          <>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[[myLocs.length,"Total",C.txt2],[won.length,"Won",C.green],[placed,"Placed",C.teal],[`${Math.round(pipe/1000)}k`,"Pipeline RON",C.amber],[overdue.length,"Overdue",overdue.length>0?C.red:C.green],[hot.length,"Hot",C.orange]].map(([v,l,c])=>(
                <div key={l} style={{background:C.bg2,border:`1px solid ${c}44`,borderTop:`3px solid ${c}`,borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
                  <div style={{fontSize:22,fontWeight:700,color:c,fontFamily:"'Space Grotesk',sans-serif"}}>{v}</div>
                  <div style={{fontSize:10,color:C.txt3,marginTop:3}}>{l.toUpperCase()}</div>
                </div>
              ))}
            </div>
            {/* Stage funnel */}
            <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
              <div className="lbl" style={{marginBottom:10}}>STAGE FUNNEL</div>
              {STAGES.filter(s=>stageCount[s]>0).map(s=>{
                const cnt=stageCount[s];const pct=Math.round(cnt/myLocs.length*100);const c=getSC()[s]||C.txt3;
                return(
                  <div key={s} style={{display:"flex",alignItems:"center",gap:10,marginBottom:7}}>
                    <div style={{fontSize:11,color:c,fontWeight:600,width:130,flexShrink:0}}>{s}</div>
                    <div style={{flex:1,background:C.bg4,borderRadius:3,height:6,overflow:"hidden"}}><div style={{width:pct+"%",background:c,height:6,borderRadius:3,transition:"width 0.4s"}}/></div>
                    <div style={{fontSize:11,color:C.txt3,width:30,textAlign:"right",flexShrink:0}}>{cnt}</div>
                  </div>
                );
              })}
            </div>
            {(isAdmin||isTeamLead)&&byUser.length>0&&(
              <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
                <div className="lbl" style={{marginBottom:10}}>TEAM</div>
                {byUser.map(u=>(
                  <div key={u.name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,padding:"8px",borderRadius:8,background:C.bg3}}>
                    <div style={{fontWeight:600,fontSize:13,color:C.txt}}>{u.name}</div>
                    <div style={{display:"flex",gap:10,fontSize:11}}>
                      <span style={{color:C.txt3}}>{u.active} active</span>
                      <span style={{color:C.green,fontWeight:600}}>{u.won}W</span>
                      <span style={{color:C.teal,fontWeight:600}}>{u.placed}w</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── SETTINGS TAB ────────────────────────────────────────────────
function SettingsTab({curUser,users,setUsers,services,setServices,entities,setEntities,playbook,setPlaybook,isAdmin,onChangePwd,onAdmin,theme,setTheme}) {
  return(
    <div style={{flex:1,overflowY:"auto",padding:12,display:"flex",flexDirection:"column",gap:10}}>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:11,color:C.txt3,letterSpacing:"0.1em",marginBottom:2}}>ACCOUNT</div>
      <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
        {[["Change Password",()=>onChangePwd(),C.blue,"🔑"],
          ...(isAdmin?[["Admin Panel",()=>onAdmin(),C.purple,"⚙"]]:[]),
        ].map(([l,fn,c,icon])=>(
          <div key={l} className="row-hover" onClick={fn} style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:16}}>{icon}</span>
              <span style={{fontSize:13,color:C.txt,fontWeight:500}}>{l}</span>
            </div>
            <span style={{color:c,fontSize:14}}>›</span>
          </div>
        ))}
      </div>

      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:11,color:C.txt3,letterSpacing:"0.1em",marginTop:4,marginBottom:2}}>THEME</div>
      {Object.entries(THEME_GROUPS).map(([group,keys])=>(
        <div key={group}>
          <div style={{fontSize:10,fontWeight:600,color:C.txt3,letterSpacing:"0.08em",marginBottom:6,padding:"0 2px"}}>{group.toUpperCase()}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {keys.map(k=>{const t=THEMES[k];if(!t)return null;return(
              <button key={k} className="btn" onClick={()=>setTheme(k)}
                style={{padding:"10px 12px",borderRadius:10,border:`2px solid ${theme===k?C.blue:t.border}`,background:t.bg2,color:t.txt,textAlign:"left",boxShadow:theme===k?`0 0 0 3px ${C.blue}33`:"none",transition:"all 0.15s"}}>
                <div style={{fontWeight:600,fontSize:12,marginBottom:5,color:t.txt}}>{t.name}{theme===k?" ✓":""}</div>
                <div style={{display:"flex",gap:3}}>
                  {[t.bg0,t.bg2,t.blue,t.green,t.amber,t.red].map((cl,i)=>(
                    <div key={i} style={{width:14,height:14,borderRadius:3,background:cl,border:`1px solid ${t.border}`}}/>
                  ))}
                </div>
              </button>
            );})}
          </div>
        </div>
      ))}

      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:11,color:C.txt3,letterSpacing:"0.1em",marginTop:4,marginBottom:2}}>CUSTOMIZATION</div>
      <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:12,padding:14,display:"flex",flexDirection:"column",gap:12}}>
        <EditableList label="SERVICES" items={services} setItems={setServices} color={C.blue}/>
        <EditableList label="LEGAL ENTITIES" items={entities} setItems={setEntities} color={C.teal}/>
      </div>
      <div style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
        <div className="lbl">LOGGED IN AS</div>
        <div style={{fontWeight:600,fontSize:14,color:C.txt}}>{curUser.name}</div>
        <div style={{fontSize:11,color:C.txt3}}>@{curUser.username} · {curUser.role}</div>
      </div>
      <div style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
        <div className="lbl">VERSION</div>
        <div style={{fontSize:13,color:C.txt2}}>Gremi Sales CRM v7.0</div>
        <div style={{fontSize:11,color:C.txt3}}>AI-First Edition · {new Date().getFullYear()}</div>
      </div>
    </div>
  );
}

// ─── ARCHIVE TAB ─────────────────────────────────────────────────
function ArchiveTab({archive,onRestore,isAdmin}) {
  const [search,setSearch]=useState("");
  const filtered=archive.filter(a=>a.company?.toLowerCase().includes(search.toLowerCase())||a.location?.toLowerCase().includes(search.toLowerCase()));
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"10px 12px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <input className="fi" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search archive..."/>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:12,display:"flex",flexDirection:"column",gap:8}}>
        {filtered.length===0&&<div style={{textAlign:"center",padding:40,color:C.txt3,fontSize:13}}>Archive is empty</div>}
        {filtered.map((a,i)=>(
          <div key={a.id||i} style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,fontSize:13,color:C.txt3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.company}</div>
              {a.location&&<div style={{fontSize:11,color:C.txt3}}>📍 {a.location}</div>}
              <div style={{fontSize:10,color:C.txt3}}>{a.industry} · {a.archivedAt?new Date(a.archivedAt).toLocaleDateString("en-GB"):""}</div>
            </div>
            {isAdmin&&<button className="btn" onClick={()=>onRestore(a)} style={{background:`${C.blue}18`,color:C.blue2,padding:"7px 12px",fontSize:11,borderRadius:7,border:`1px solid ${C.blue}44`,flexShrink:0,marginLeft:10}}>↩ Restore</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── THEME TAB ───────────────────────────────────────────────────
function ThemeTab({curTheme,setTheme}) {
  return(
    <div style={{flex:1,overflowY:"auto",padding:12,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:11,color:C.txt3,letterSpacing:"0.1em"}}>CHOOSE YOUR THEME</div>
      {Object.entries(THEME_GROUPS).map(([group,keys])=>(
        <div key={group}>
          <div style={{fontSize:10,fontWeight:600,color:C.txt3,letterSpacing:"0.08em",marginBottom:6,padding:"0 2px"}}>{group.toUpperCase()}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {keys.map(k=>{const t=THEMES[k];if(!t)return null;return(
              <button key={k} className="btn" onClick={()=>setTheme(k)}
                style={{padding:"12px",borderRadius:10,border:`2px solid ${curTheme===k?C.blue:t.border}`,background:t.bg2,color:t.txt,fontSize:12,fontWeight:curTheme===k?700:400,textAlign:"left",boxShadow:curTheme===k?`0 0 0 3px ${C.blue}33`:"none",transition:"all 0.15s"}}>
                <div style={{fontWeight:600,fontSize:12,marginBottom:6,color:t.txt}}>{t.name}{curTheme===k?" ✓":""}</div>
                <div style={{display:"flex",gap:4}}>
                  {[t.bg0,t.bg2,t.blue,t.green,t.amber,t.red].map((cl,i)=>(
                    <div key={i} style={{width:16,height:16,borderRadius:4,background:cl,border:`1px solid ${t.border}`}}/>
                  ))}
                </div>
              </button>
            );})}
          </div>
        </div>
      ))}
    </div>
  );
}


// ─── MAIN APP ─────────────────────────────────────────────────────
export default function GremiCRM() {
  const [curUser,setCurUser]=useState(null);
  const [hqs,setHqs]=useState([]);
  const [locs,setLocs]=useState([]);
  const [users,setUsers]=useState(INIT_USERS);
  const [services,setServices]=useState(DEF_SERVICES);
  const [entities,setEntities]=useState(DEF_ENTITIES);
  const [playbook,setPlaybook]=useState(INIT_PLAYBOOK);
  const [templates,setTemplates]=useState(TPL_DATA);
  const [archive,setArchive]=useState([]);
  const [theme,setTheme]=useState(()=>{ try { return localStorage.getItem("gremi_theme")||"navy"; } catch(e){ return "navy"; } });
  const [tab,setTab]=useState("dashboard");
  const [search,setSearch]=useState("");
  const [filters,setFilters]=useState({stage:"All",temp:"All",service:"All",entity:"All",county:"All",industry:"All",salesId:"All",overdueOnly:false,myOnly:false,showLocs:true});
  const [selHQ,setSelHQ]=useState(null);
  const [selLoc,setSelLoc]=useState(null);
  const [editLoc,setEditLoc]=useState(null);
  const [editHQ,setEditHQ]=useState(null);
  const [showPwd,setShowPwd]=useState(false);
  const [showAdmin,setShowAdmin]=useState(false);
  const [showQuickAI,setShowQuickAI]=useState(false);
  const [quickAITab,setQuickAITab]=useState("import");
  const [expandedHQs,setExpandedHQs]=useState({});
  const [dbReady,setDbReady]=useState(false);
  const [dbError,setDbError]=useState("");
  const [syncStatus,setSyncStatus]=useState("idle"); // idle | syncing | error
  const [isMobile,setIsMobile]=useState(()=>{ try { return window.innerWidth < 768; } catch(e){ return false; } });
  const [mobileForced,setMobileForced]=useState(null); // null = auto, true/false = forced

  useEffect(()=>{
    const handle=()=>{ if(mobileForced===null) setIsMobile(window.innerWidth<768); };
    window.addEventListener("resize",handle);
    return ()=>window.removeEventListener("resize",handle);
  },[mobileForced]);

  const mobile = mobileForced !== null ? mobileForced : isMobile;

  // ── Apply theme
  C = THEMES[theme]||THEMES.navy;

  // ── Load from Supabase
  const loadAll = useCallback(async () => {
    setSyncStatus("syncing");
    try {
      const [dbHQs,dbLocs,dbUsers,dbArchive]=await Promise.all([
        dbGet("crm_hqs","order=company.asc"),
        dbGet("crm_locs","order=company.asc"),
        dbGet("crm_users","order=name.asc").catch(()=>[]),
        dbGet("crm_archive","order=archived_at.desc").catch(()=>[]),
      ]);
      setHqs(dbHQs.map(hqFromDb));
      setLocs(dbLocs.map(locFromDb));
      if(dbUsers.length>0) setUsers(dbUsers);
      if(dbArchive.length>0) setArchive(dbArchive);
      setDbReady(true); setSyncStatus("idle");
    } catch(e) {
      console.error("DB load error:",e);
      setDbError(e.message);
      // fallback to seed data
      setHqs(INIT_HQS.map(h=>({...h})));
      setLocs(INIT_LOCS.map(l=>({...l})));
      setDbReady(true); setSyncStatus("error");
    }
  }, []);

  useEffect(()=>{ loadAll(); },[loadAll]);

  // ── Sync users to DB on change
  useEffect(()=>{
    if(!dbReady) return;
    users.forEach(async u=>{
      try {
        const existing=await dbGet("crm_users",`id=eq.${u.id}`);
        if(existing.length>0) await dbPatch("crm_users",`id=eq.${u.id}`,{name:u.name,username:u.username,password:u.password,role:u.role,active:u.active});
        else await dbPost("crm_users",{id:u.id,name:u.name,username:u.username,password:u.password,role:u.role,active:u.active||true});
      } catch(e){}
    });
  },[users,dbReady]);

  // ── Save HQ
  const saveHQ = async (hqData) => {
    const body = hqToDb(hqData);
    if(hqData.id) {
      await dbPatch("crm_hqs",`id=eq.${hqData.id}`,body);
      setHqs(prev=>prev.map(h=>h.id===hqData.id?hqData:h));
    } else {
      const [created]=await dbPost("crm_hqs",body);
      const newHQ={...hqData,id:created.id};
      setHqs(prev=>[...prev,newHQ]);
      return newHQ;
    }
  };

  // ── Save Location
  const saveLoc = async (locData, newHQData=null) => {
    let parentId=locData.parentId;
    if(newHQData&&newHQData.company) {
      const createdHQ = await saveHQ({...EMPTY_HQ,...newHQData,id:null});
      parentId=createdHQ.id;
    }
    const body=locToDb({...locData,parentId,company:newHQData?.company||locData.company||(hqs.find(h=>h.id===parentId)?.company||"")});
    if(locData.id) {
      await dbPatch("crm_locs",`id=eq.${locData.id}`,body);
      setLocs(prev=>prev.map(l=>l.id===locData.id?{...locData,parentId}:l));
    } else {
      const [created]=await dbPost("crm_locs",body);
      setLocs(prev=>[...prev,{...locData,id:created.id,parentId}]);
    }
  };

  // ── Update fields (partial)
  const updLoc = async (id, patch) => {
    const cur=locs.find(l=>l.id===id);
    if(!cur) return;
    const updated={...cur,...patch};
    setLocs(prev=>prev.map(l=>l.id===id?updated:l));
    if(selLoc?.id===id) setSelLoc(updated);
    try { await dbPatch("crm_locs",`id=eq.${id}`,locToDb(updated)); } catch(e){ console.error("updLoc error:",e); }
  };

  const updHQ = async (id, patch) => {
    const cur=hqs.find(h=>h.id===id);
    if(!cur) return;
    const updated={...cur,...patch};
    setHqs(prev=>prev.map(h=>h.id===id?updated:h));
    try { await dbPatch("crm_hqs",`id=eq.${id}`,hqToDb(updated)); } catch(e){ console.error("updHQ error:",e); }
  };

  // ── Archive
  const archiveLoc = async (loc) => {
    if(!confirm(`Archive ${loc.company} — ${loc.location}?`)) return;
    const item={...locToDb(loc),id:loc.id,type:"loc",archived_at:new Date().toISOString()};
    await dbPost("crm_archive",item).catch(()=>{});
    await dbDel("crm_locs",`id=eq.${loc.id}`);
    setLocs(prev=>prev.filter(l=>l.id!==loc.id));
    setArchive(prev=>[{...loc,type:"loc",archivedAt:new Date().toISOString()},...prev]);
    setSelLoc(null);
  };

  const archiveHQ = async (hq) => {
    const hqLocs=locs.filter(l=>l.parentId===hq.id);
    if(!confirm(`Archive ${hq.company} and ${hqLocs.length} location(s)?`)) return;
    for(const loc of hqLocs) {
      await dbDel("crm_locs",`id=eq.${loc.id}`).catch(()=>{});
      await dbPost("crm_archive",{...locToDb(loc),id:loc.id,type:"loc",archived_at:new Date().toISOString()}).catch(()=>{});
    }
    await dbDel("crm_hqs",`id=eq.${hq.id}`).catch(()=>{});
    await dbPost("crm_archive",{...hqToDb(hq),id:hq.id,type:"hq",archived_at:new Date().toISOString()}).catch(()=>{});
    setLocs(prev=>prev.filter(l=>l.parentId!==hq.id));
    setHqs(prev=>prev.filter(h=>h.id!==hq.id));
    setArchive(prev=>[{...hq,type:"hq",archivedAt:new Date().toISOString()},...prev]);
    setSelHQ(null);
  };

  // ── Restore from archive
  const restore = async (item) => {
    if(!confirm(`Restore ${item.company}?`)) return;
    await dbDel("crm_archive",`id=eq.${item.id}`).catch(()=>{});
    if(item.type==="hq"||item.isHQ) {
      await dbPost("crm_hqs",hqToDb({...EMPTY_HQ,...item}));
      setHqs(prev=>[...prev,{...EMPTY_HQ,...item}]);
    } else {
      await dbPost("crm_locs",locToDb({...EMPTY_LOC,...item}));
      setLocs(prev=>[...prev,{...EMPTY_LOC,...item}]);
    }
    setArchive(prev=>prev.filter(a=>a.id!==item.id));
  };

  // ── Conversational lead creation
  const handleConversationalCreate = async (preview) => {
    let hqData=preview.hq;
    let parentId=preview.loc.existingHqId||null;
    if(!parentId) {
      const createdHQ=await saveHQ({...EMPTY_HQ,...hqData,id:null});
      parentId=createdHQ.id;
    }
    await saveLoc({...EMPTY_LOC,...preview.loc,parentId,company:hqData.company||preview.loc.company,salesId:curUser.id,id:null},null);
    setTab("leads");
  };

  // ── XLSX Export
  const exportXLSX = () => {
    const rows=locs.map(l=>({
      Company:l.company,Location:l.location,County:l.county,Contact:l.contact,Role:l.role,
      Phone:l.phone,Email:l.email,Stage:l.stage,Temperature:l.temp,Workers:l.workers,
      WorkerType:l.workerType,Service:l.service,Entity:l.companyName,
      Source:l.source,LastContact:l.lastContact,NextStep:l.nextStep,NextStepDate:l.nextStepDate,
      PainScore:l.painScore,Industry:l.industry,Notes:l.notes,
      Salesperson:users.find(u=>u.id===l.salesId)?.name||"",
    }));
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),"Leads");
    XLSX.writeFile(wb,`Gremi_CRM_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // ── Filtering
  const isAdmin=curUser?.role==="admin";
  const isTeamLead=curUser?.role==="team_lead";
  const filtered = locs.filter(l=>{
    const q=search.toLowerCase();
    const hqForLoc = hqs.find(h=>h.id===l.parentId);
    const matchQ=!q||
      l.company.toLowerCase().includes(q)||
      l.location?.toLowerCase().includes(q)||
      l.contact?.toLowerCase().includes(q)||
      l.county?.toLowerCase().includes(q)||
      l.stage?.toLowerCase().includes(q)||
      l.notes?.toLowerCase().includes(q)||
      l.email?.toLowerCase().includes(q)||
      l.phone?.toLowerCase().includes(q)||
      l.workerType?.toLowerCase().includes(q)||
      l.nextStep?.toLowerCase().includes(q)||
      l.spin?.p?.toLowerCase().includes(q)||
      l.spin?.painSummary?.toLowerCase().includes(q)||
      hqForLoc?.intelligence?.toLowerCase().includes(q)||
      hqForLoc?.notes?.toLowerCase().includes(q);
    const matchStage=filters.stage==="All"||l.stage===filters.stage;
    const matchTemp=filters.temp==="All"||l.temp===filters.temp;
    const matchSvc=filters.service==="All"||l.service===filters.service;
    const matchEnt=filters.entity==="All"||l.companyName===filters.entity;
    const matchCty=filters.county==="All"||l.county===filters.county;
    const matchInd=filters.industry==="All"||l.industry===filters.industry;
    const matchSalesId=filters.salesId==="All"||String(l.salesId)===filters.salesId;
    const matchMy=!filters.myOnly||l.salesId===curUser?.id;
    const matchOD=!filters.overdueOnly||isOD(l.nextStepDate,l.stage);
    return matchQ&&matchStage&&matchTemp&&matchSvc&&matchEnt&&matchCty&&matchInd&&matchSalesId&&matchMy&&matchOD;
  }).sort((a,b)=>{
    const od=(l)=>isOD(l.nextStepDate,l.stage)?0:1;
    if(od(a)!==od(b))return od(a)-od(b);
    const tp={"🔥 Hot":0,"🟡 Warm":1,"❄️ Cold":2};
    return (tp[a.temp]||1)-(tp[b.temp]||1);
  });

  // ── Group by company
  const groupedByHQ = {};
  filtered.forEach(l=>{
    const key=l.parentId||"noparent";
    if(!groupedByHQ[key])groupedByHQ[key]=[];
    groupedByHQ[key].push(l);
  });

  if(!curUser) return <LoginScreen onLogin={u=>{setCurUser(u);}}/>;

  // KPI numbers
  const kpiActive = locs.filter(l=>!["Closed Won","Closed Lost"].includes(l.stage));
  const kpiWon = locs.filter(l=>l.stage==="Closed Won");
  const kpiPlaced = kpiWon.reduce((s,l)=>s+(parseInt(l.workers)||0),0);
  const kpiPipe = locs.filter(l=>l.stage==="Negotiation"||l.stage==="Proposal Sent").reduce((s,l)=>s+(parseInt(l.workers)||0)*5800,0);
  const kpiLate = kpiActive.filter(l=>isOD(l.nextStepDate,l.stage)).length;
  const kpiHot = kpiActive.filter(l=>l.temp==="🔥 Hot").length;
  const TABS_DEF = [
    {id:"dashboard",label:"DASHBOARD"},
    {id:"leads",label:"LEADS"},
    {id:"playbook",label:"PLAYBOOK"},
    {id:"team",label:"TEAM"},
    {id:"ai",label:"🤖 AI"},
    ...(isAdmin?[{id:"settings",label:"SETTINGS"}]:[]),
    ...(archive.length>0||isAdmin||isTeamLead?[{id:"archive",label:"ARCHIVE"+(archive.length?" ("+archive.length+")":"")}]:[]),
  ];

  // Mobile tab icons for bottom nav
  const TAB_ICONS = {dashboard:"📊",leads:"🏭",playbook:"📖",team:"👥",ai:"🤖",archive:"📦",settings:"⚙"};

  return(
    <div style={{fontFamily:"'Inter',sans-serif",background:C.bg1,height:"100vh",display:"flex",flexDirection:"column",overflow:"hidden",color:C.txt}}>
      <style>{getCSS()}</style>

      {/* HEADER */}
      <div style={{background:C.bg0,borderBottom:`1px solid ${C.border}`,padding:mobile?"9px 12px":"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:28,height:28,background:`linear-gradient(135deg,${C.blue},${C.indigo})`,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:13,color:"#fff"}}>G</div>
          {!mobile&&<div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:14,color:C.txt,lineHeight:1}}>Sales Team CRM</div><div style={{fontSize:9,color:C.txt3,letterSpacing:"0.1em"}}>GREMI · ROMANIA</div></div>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:mobile?5:7}}>
          {syncStatus==="syncing"&&<div style={{width:6,height:6,borderRadius:"50%",background:C.amber,animation:"pulse 1s infinite"}} title="Syncing"/>}
          {syncStatus==="error"&&<div style={{width:6,height:6,borderRadius:"50%",background:C.red}} title="DB error"/>}
          {syncStatus==="idle"&&dbReady&&<div style={{width:6,height:6,borderRadius:"50%",background:C.green}} title="Connected"/>}
          {/* Layout toggle button */}
          <button className="btn" title={mobile?"Switch to Desktop layout":"Switch to Mobile layout"}
            onClick={()=>setMobileForced(m=>m===null?(isMobile?false:true):m===true?false:true)}
            style={{background:C.bg3,color:C.txt3,padding:"5px 8px",fontSize:12,borderRadius:7,border:`1px solid ${C.border}`}}>
            {mobile?"🖥":"📱"}
          </button>
          {!mobile&&isAdmin&&<button className="btn" onClick={()=>setShowAdmin(true)} style={{background:`${C.purple}18`,color:C.purple,padding:"6px 10px",fontSize:11,borderRadius:7,border:`1px solid ${C.purple}44`}}>Admin</button>}
          {!mobile&&(isAdmin||isTeamLead)&&<button className="btn" onClick={exportXLSX} style={{background:`${C.green}18`,color:C.green,padding:"6px 10px",fontSize:11,borderRadius:7,border:`1px solid ${C.green}44`}}>Excel</button>}
          <button className="btn" onClick={loadAll} style={{background:C.bg3,color:C.txt3,padding:"5px 8px",fontSize:11,borderRadius:7,border:`1px solid ${C.border}`}} title="Refresh">↻</button>
          <div style={{cursor:"pointer",textAlign:"right"}} onClick={()=>setShowPwd(true)}>
            <div style={{fontSize:mobile?11:12,fontWeight:600,color:C.txt}}>{curUser.name}</div>
            {!mobile&&<div style={{fontSize:9,color:isAdmin?C.purple:isTeamLead?C.amber:C.blue}}>{isAdmin?"ADMIN":isTeamLead?"TL":"USER"} 🔑</div>}
          </div>
          <button className="btn" onClick={()=>setCurUser(null)} style={{background:C.bg3,color:C.txt3,padding:"5px 8px",fontSize:11,borderRadius:7,border:`1px solid ${C.border}`}}>↩</button>
        </div>
      </div>

      {/* KPI STRIP — desktop only */}
      {!mobile&&(
        <div style={{background:C.bg0,borderBottom:`1px solid ${C.border}`,display:"flex",overflowX:"auto",flexShrink:0}}>
          {[["HQs",hqs.length,C.blue],["LOCS",locs.length,C.indigo],["🔥 HOT",kpiHot,C.red],["PLACED",kpiPlaced,C.green],["PIPE ~k",Math.round(kpiPipe/1000),C.amber],["⚠ LATE",kpiLate,C.orange]].map(([l,v,c])=>(
            <div key={l} style={{flex:"1 0 60px",padding:"9px 5px",borderRight:`1px solid ${C.border}`,textAlign:"center"}}>
              <div style={{fontSize:17,fontWeight:700,color:c,fontFamily:"'Space Grotesk',sans-serif"}}>{v}</div>
              <div style={{fontSize:8,color:C.txt3,letterSpacing:"0.06em",marginTop:1}}>{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* TABS — desktop: top bar, mobile: hidden (bottom nav instead) */}
      {!mobile&&(
        <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,flexShrink:0,background:C.bg0,overflowX:"auto"}}>
          {TABS_DEF.map(t=>(
            <button key={t.id} className="tab" onClick={()=>setTab(t.id)}
              style={{background:tab===t.id?`${C.blue}12`:"transparent",color:tab===t.id?C.blue2:C.txt3,borderBottom:`2px solid ${tab===t.id?C.blue:"transparent"}`}}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab content */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {tab==="dashboard"&&<DashboardTab locs={locs} hqs={hqs} users={users} cur={curUser} onSelectLoc={l=>{setSelLoc(l);setTab("leads");}} isAdmin={isAdmin} isTeamLead={isTeamLead}/>}

        {tab==="leads"&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{padding:"9px 12px",borderBottom:`1px solid ${C.border}`,background:C.bg1,display:"flex",gap:8,flexShrink:0}}>
              <input dir="ltr" placeholder="Search company, contact, notes, intelligence..." value={search} onChange={e=>setSearch(e.target.value)} className="fi" style={{flex:1,padding:"9px 11px",fontSize:13}}/>
              <button className="btn" onClick={()=>setShowQuickAI(true)} style={{background:`${C.teal}18`,color:C.teal,padding:"9px 12px",fontSize:13,borderRadius:8,border:`1px solid ${C.teal}44`,flexShrink:0}} title="AI Import lead">🤖</button>
              <button className="btn" onClick={()=>setEditLoc({...EMPTY_LOC,salesId:curUser.id})} style={{background:`linear-gradient(135deg,${C.blue},${C.indigo})`,color:"#fff",padding:"9px 14px",fontSize:12,borderRadius:8,flexShrink:0}}>+ New Deal</button>
            </div>
            <ConversationalLeadInput hqs={hqs} locs={locs} users={users} curId={curUser.id} services={services} entities={entities} onCreated={handleConversationalCreate}/>
            <FilterBar filters={filters} setFilters={setFilters} users={users} isAdmin={isAdmin} isTeamLead={isTeamLead} curId={curUser.id} services={services} entities={entities}/>
            <div style={{flex:1,overflowY:"auto",padding:10}}>
              {filtered.length===0&&<div style={{textAlign:"center",padding:40,color:C.txt3,fontSize:13}}>No leads match the current filters</div>}
              {Object.entries(groupedByHQ).map(([hqId,locGroup])=>{
                const hq=hqs.find(h=>h.id===parseInt(hqId));
                const shown=locGroup.sort((a,b)=>{const tp={"🔥 Hot":0,"🟡 Warm":1,"❄️ Cold":2};return (tp[a.temp]||1)-(tp[b.temp]||1);});
                const isExpanded=expandedHQs[hqId]!==false; // default expanded
                const toggle=()=>setExpandedHQs(prev=>({...prev,[hqId]:!isExpanded}));
                const hasOverdue=shown.some(l=>isOD(l.nextStepDate,l.stage));
                const totalW=shown.reduce((s,l)=>s+(parseInt(l.workers)||0),0);
                const stages=[...new Set(shown.map(l=>l.stage))].slice(0,3);
                return(
                  <div key={hqId} style={{marginBottom:10,background:C.bg2,border:`1px solid ${hasOverdue?C.red+"33":C.border}`,borderRadius:12,overflow:"hidden"}}>
                    {/* HQ Header — always visible, click to expand/collapse */}
                    <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",cursor:"pointer",borderBottom:isExpanded?`1px solid ${C.border}`:"none",background:`${C.indigo}08`}}
                      onClick={()=>{ if(hq) setSelHQ(hq); }}>
                      <div style={{width:22,height:22,background:`${C.indigo}22`,border:`1px solid ${C.indigo}44`,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:C.indigo,flexShrink:0}}>🏢</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:12,fontWeight:700,color:C.indigo,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{hq?.company||"No Company"}</div>
                        <div style={{display:"flex",gap:6,alignItems:"center",marginTop:2,flexWrap:"wrap"}}>
                          <span style={{fontSize:10,color:C.txt3}}>{shown.length} deal{shown.length!==1?"s":""}</span>
                          {totalW>0&&<span style={{fontSize:10,color:C.amber}}>👷{totalW}</span>}
                          {stages.map(s=>{const sc=getSC()[s]||C.txt3;return <span key={s} style={{fontSize:9,color:sc,background:sc+"18",padding:"1px 6px",borderRadius:4,border:`1px solid ${sc}33`}}>{s}</span>;})}
                          {hasOverdue&&<span style={{fontSize:10,color:C.red,fontWeight:600}}>⚠ overdue</span>}
                        </div>
                      </div>
                      <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                        <button className="btn" onClick={e=>{e.stopPropagation();setExpandedHQs(prev=>({...prev,[hqId]:!isExpanded}));}}
                          style={{background:isExpanded?`${C.indigo}22`:C.bg3,color:isExpanded?C.indigo:C.txt3,padding:"4px 10px",fontSize:11,borderRadius:5,border:`1px solid ${isExpanded?C.indigo+"44":C.border}`,fontWeight:700}}>
                          {isExpanded?"−":"+"}
                        </button>
                      </div>
                    </div>
                    {/* Locations — collapsible, click HQ header to open HQ modal */}
                    {isExpanded&&(
                    <div>
                    {shown.map(l=>{
                      const sc=getSC()[l.stage]||C.txt3;
                      const od=isOD(l.nextStepDate,l.stage);
                      const h=calcHealth(l);
                      const sp=l.spin||{};
                      return(
                        <div key={l.id} className="row-hover" onClick={()=>setSelLoc(l)}
                          style={{background:C.bg2,border:`1px solid ${od?C.red+"55":C.border}`,borderLeft:`3px solid ${sc}`,borderRadius:10,padding:"11px 12px",marginBottom:7,cursor:"pointer"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
                                <HealthDot loc={l} size={7}/>
                                <div style={{fontWeight:600,fontSize:13,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.location||l.company}</div>
                              </div>
                              <div style={{fontSize:11,color:C.txt3,display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
                                <span>{l.contact||"—"}</span>
                                {l.county&&<span>· 📍{l.county}</span>}
                              </div>
                            </div>
                            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,flexShrink:0,marginLeft:8}}>
                              <span style={{fontSize:16}}>{l.temp}</span>
                              <span className="pill" style={{background:sc+"22",color:sc,border:`1px solid ${sc}44`,fontSize:9}}>{l.stage}</span>
                            </div>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                              {l.workers&&<span style={{fontSize:11,color:C.amber}}>👷{l.workers}</span>}
                              {l.service&&<span style={{fontSize:10,color:C.blue2,background:`${C.blue}15`,padding:"2px 6px",borderRadius:5}}>{l.service}</span>}
                              <SpinDots spin={sp}/>
                              <DaysInStage loc={l}/>
                            </div>
                            <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0}}>
                              <DaysAgo date={l.lastContact}/>
                              {l.nextStepDate&&<span style={{fontSize:9,color:od?C.red:C.txt3,fontWeight:od?700:400}}>{od?"⚠ ":""}{fmtDate(l.nextStepDate)}</span>}
                            </div>
                          </div>
                          {l.nextStep&&<div style={{marginTop:4,fontSize:11,color:C.amber,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>→ {l.nextStep}</div>}
                        </div>
                      );
                    })}
                    
                    </div>)}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab==="team"&&<TeamTab users={users} locs={locs} onSelect={l=>{setSelLoc(l);setTab("leads");}}/>}
        {tab==="playbook"&&<PlaybookTab playbook={playbook} setPlaybook={setPlaybook} isAdmin={isAdmin} templates={templates} setTemplates={setTemplates}/>}
        {tab==="ai"&&<AIChatTab locs={locs} hqs={hqs} users={users} cur={curUser} onUpdateLoc={updLoc} onUpdateHQ={updHQ} onSaveLoc={saveLoc} onSaveHQ={saveHQ}/>}
        {tab==="archive"&&<ArchiveTab archive={archive} onRestore={restore} isAdmin={isAdmin}/>}
        {tab==="settings"&&<SettingsTab curUser={curUser} users={users} setUsers={setUsers} services={services} setServices={setServices} entities={entities} setEntities={setEntities} playbook={playbook} setPlaybook={setPlaybook} isAdmin={isAdmin} onChangePwd={()=>setShowPwd(true)} onAdmin={()=>setShowAdmin(true)} theme={theme} setTheme={t=>{setTheme(t);C=THEMES[t]||THEMES.navy;try{localStorage.setItem("gremi_theme",t);}catch(e){}}}/>}
      </div>

      {/* MOBILE BOTTOM NAV */}
      {mobile&&(
        <div style={{background:C.bg0,borderTop:`1px solid ${C.border}`,display:"flex",flexShrink:0,overflowX:"auto"}}>
          {TABS_DEF.map(t=>(
            <button key={t.id} className="btn" onClick={()=>setTab(t.id)}
              style={{flex:"1 0 44px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"7px 2px",background:tab===t.id?`${C.blue}15`:C.bg0,color:tab===t.id?C.blue2:C.txt3,border:"none",borderTop:`2px solid ${tab===t.id?C.blue:"transparent"}`,cursor:"pointer",minWidth:44}}>
              <span style={{fontSize:14}}>{TAB_ICONS[t.id]||"●"}</span>
              <span style={{fontSize:8,fontWeight:600,letterSpacing:"0.04em",whiteSpace:"nowrap"}}>{t.label.length>6?t.label.slice(0,5)+"…":t.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* QUICK AI PANEL — AI import + pipeline chat from leads */}
      {showQuickAI&&(
        <div className="modal" style={{zIndex:200}}>
          <div className="mh">
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:26,height:26,borderRadius:7,background:`linear-gradient(135deg,${C.blue},${C.teal})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>🤖</div>
              <div style={{fontWeight:700,fontSize:15,color:C.txt}}>AI Assistant</div>
            </div>
            <button className="xb" onClick={()=>setShowQuickAI(false)}>×</button>
          </div>
          {/* Two sub-tabs: Import | Pipeline Chat */}
          <>
            <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,flexShrink:0,background:C.bg0}}>
              {[["import","🤖 AI Import Lead"],["chat","💬 Pipeline Chat"]].map(([id,label])=>(
                <button key={id} className="tab" onClick={()=>setQuickAITab(id)}
                  style={{flex:1,background:quickAITab===id?`${C.blue}12`:"transparent",color:quickAITab===id?C.blue2:C.txt3,borderBottom:`2px solid ${quickAITab===id?C.blue:"transparent"}`}}>
                  {label}
                </button>
              ))}
            </div>
            {quickAITab==="import"?(
              <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                <ConversationalLeadInput hqs={hqs} locs={locs} users={users} curId={curUser.id} services={services} entities={entities}
                  onCreated={(preview)=>{handleConversationalCreate(preview);setShowQuickAI(false);}} forceOpen={true}/>
              </div>
            ):(
              <AIChatTab locs={locs} hqs={hqs} users={users} cur={curUser} onUpdateLoc={updLoc} onUpdateHQ={updHQ} onSaveLoc={saveLoc} onSaveHQ={saveHQ}/>
            )}
          </>
        </div>
      )}

      {/* Modals */}
      {selLoc&&(
        <LocDetailModal loc={selLoc} hqs={hqs} users={users} isAdmin={isAdmin} canArchive={isAdmin} canEdit={isAdmin||isTeamLead||selLoc.salesId===curUser.id}
          onClose={()=>setSelLoc(null)}
          onEdit={()=>{setEditLoc({...selLoc});setSelLoc(null);}}
          onArchive={()=>archiveLoc(selLoc)}
          onUpdate={updLoc}
          onUpdateHQ={updHQ}/>
      )}
      {selHQ&&(
        <HQDetailModal hq={selHQ} locs={locs} users={users} isAdmin={isAdmin}
          onClose={()=>setSelHQ(null)}
          onEditHQ={()=>{setEditHQ({...selHQ});setSelHQ(null);}}
          onDeleteHQ={()=>archiveHQ(selHQ)}
          onAddLoc={()=>{setEditLoc({...EMPTY_LOC,parentId:selHQ.id,company:selHQ.company,salesId:curUser.id});setSelHQ(null);}}
          onSelectLoc={l=>setSelLoc(l)}
          onSaveChecklist={patch=>updHQ(selHQ.id,patch)}
          onUpdateHQ={updHQ} onUpdateLoc={updLoc} curUser={curUser}/>
      )}
      {editLoc&&(
        <LocFormModal form={editLoc} setForm={setEditLoc} hqs={hqs} users={users} isAdmin={isAdmin} services={services} entities={entities} editMode={!!editLoc.id}
          onClose={()=>setEditLoc(null)}
          onSave={async(newHQ)=>{
            await saveLoc(editLoc,newHQ);
            if(editLoc.id&&selLoc) setSelLoc({...editLoc});
            setEditLoc(null);
          }}/>
      )}
      {editHQ&&(
        <HQFormModal form={editHQ} setForm={setEditHQ}
          onClose={()=>setEditHQ(null)}
          onSave={async()=>{await saveHQ(editHQ);setSelHQ(editHQ);setEditHQ(null);}}/>
      )}
      {showPwd&&<ChangePwdModal cur={curUser} users={users} setUsers={setUsers} setCur={setCurUser} isAdmin={isAdmin} onClose={()=>setShowPwd(false)}/>}
      {showAdmin&&<AdminPanel users={users} setUsers={setUsers} cur={curUser} services={services} setServices={setServices} entities={entities} setEntities={setEntities} onClose={()=>setShowAdmin(false)}/>}
    </div>
  );
}
