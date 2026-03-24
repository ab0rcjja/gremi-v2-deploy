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
    {id:"new",stage:"New",icon:"1",title:"Lead Qualification & Contact Discovery",target:"Complete within 24h of lead entry",tasks:"STEP 1 — COMPANY RESEARCH:\n— Termene.ro / ListaFirme.ro: revenue, employee count, CUI, registered address\n— Company website: products, locations, management page\n— eJobs / BestJobs / OLX: are they posting vacancies?\n\nSTEP 2 — FIND THE DECISION MAKER:\nWHO TO FIND (in order of priority):\n1. HR Director / HR Manager\n2. Plant Manager / Production Manager\n3. Operations Director\n4. Owner / General Manager\n\nHOW TO FIND THEM:\n— LinkedIn: search '[Company] + Romania'\n— Company website: 'Despre noi' / 'Echipa'\n— Google: '[Company] director HR Romania'\n\nSTEP 4 — CRM ENTRY:\n— Create HQ record: company, industry, address, website\n— Set worker type (UA / Asia / Mix)\n— Do NOT move to 'Contacted' until you have a SPECIFIC PERSON with name and contact"},
    {id:"contacted",stage:"Contacted",icon:"2",title:"First Contact Sequence",target:"3 contact attempts within 7 business days",tasks:"PREREQUISITE: You have a specific person's NAME, ROLE, and contact method.\n\nDAY 1 — FIRST TOUCH:\n— CALL the direct number (morning 9-11 or afternoon 14-16)\n— SAME DAY: send introductory EMAIL\n\nDAY 3 — SECOND TOUCH:\n— CALL again at a DIFFERENT time\n— If still no answer: send LinkedIn connection request\n\nDAY 7 — THIRD TOUCH:\n— Follow-up EMAIL\n— If LinkedIn accepted: send message there\n\nIF NO RESPONSE AFTER 3 ATTEMPTS:\n— Move to 'No Answer'\n— Set follow-up reminder for 30 days"},
    {id:"interested",stage:"Interested",icon:"3",title:"Discovery & Meeting Preparation",target:"Meeting scheduled within 5 days",tasks:"SPIN DISCOVERY (fill ALL four fields):\nS — SITUATION: Headcount, shifts, current suppliers, open positions\nP — PROBLEM: Time to fill, turnover rate, compliance concerns\nI — IMPLICATION: Cost of delays, impact on orders, ITM risk\nN — NEED-PAYOFF: Stable team, predictable costs, zero admin\n\nIF MEETING IS ON-SITE:\n— Ask for a factory tour. Count the empty workstations. That's your number."},
    {id:"meeting",stage:"Meeting Scheduled",icon:"4",title:"Meeting Execution",target:"Zero no-shows. Always confirm 24h before.",tasks:"24H BEFORE:\n— Confirm: 'Confirm intalnirea de maine la [ORA].'\n\nMEETING STRUCTURE (30 min):\nFIRST 5 MIN — Rapport: Thank them. Do NOT pitch.\nNEXT 15 MIN — SPIN Discovery: Let THEM talk about THEIR problems.\nLAST 10 MIN — Present solution: ONLY after you understand their situation\n\nAFTER: Same day: update Activity Log + SPIN fields"},
    {id:"done",stage:"Meeting Done",icon:"5",title:"Proposal Preparation & Delivery",target:"Offer sent within 24h of meeting",tasks:"WITHIN 24 HOURS:\n— Send follow-up email (use post-meeting template)\n— Attach customized offer: worker count, rate, service, timeline, terms\n— Include company presentation and references\n\nCRM: Update stage → 'Proposal Sent'. Set Next Action: follow-up in 3 days."},
    {id:"proposal",stage:"Proposal Sent",icon:"6",title:"Follow-up Sequence",target:"Decision within 14 days",tasks:"DAY 3: CALL the decision maker directly.\nDAY 7: EMAIL with additional value.\nDAY 14: FINAL ATTEMPT — breakup message.\n\nIF NO RESPONSE AFTER 14 DAYS:\n— Move to 'Closed Lost' or 'No Answer'\n— Set follow-up reminder for 3 months"},
    {id:"negotiation",stage:"Negotiation",icon:"7",title:"Terms Discussion & Closing",target:"Close or escalate within 10 days",tasks:"HANDLE OBJECTIONS:\n— Use Objection Response templates\n— Always acknowledge the concern before responding\n— Focus on total cost, not just hourly rate\n\nESCALATE TO WALERY IF:\n— Discount > 5%\n— Non-standard terms\n— Order > 50 workers"},
    {id:"won",stage:"Closed Won",icon:"✓",title:"Handover & Account Development",target:"Operational handover within 48h",tasks:"IMMEDIATE:\n— Update all CRM fields: final worker count, rate, service, entity, start date\n— Notify operations team\n— Send 'thank you and next steps' email\n\nACCOUNT DEVELOPMENT:\n— Ask for referral after month 1\n— Schedule quarterly review"},
    {id:"lost",stage:"Closed Lost",icon:"✕",title:"Post-Mortem & Re-entry Plan",target:"Analyse, learn, plan return",tasks:"IMMEDIATELY AFTER LOSING:\n— Fill in Lost Reason in CRM — required\n— Update all SPIN fields with real info\n\nRE-ENTRY PLAN:\n— Lost to competitor → Check back in 6 months\n— Lost due to timing → Set follow-up for next season\n— Lost due to price → Note their budget ceiling"},
    {id:"noanswer",stage:"No Answer",icon:"—",title:"Re-engagement Protocol",target:"Re-engage without being annoying",tasks:"PROTOCOL:\nAttempt 1 — Day 1: Call, no voicemail\nAttempt 2 — Day 3: Call + LinkedIn message\nAttempt 3 — Day 7: Call + email\nAttempt 4 — Day 14: Final call + final email\n\nAFTER 4 ATTEMPTS:\n— Pain Score → 1\n— Next Step: return in 60 days"},
  ],
  extras:[
    {id:"dm",title:"Decision Maker Approach",color:"indigo",text:"HR DIRECTOR / HR MANAGER\nCares about: compliance, ITM risk, contract terms, worker documentation\n\nPLANT MANAGER / PRODUCTION MANAGER\nCares about: capacity, speed of delivery, worker quality, shift coverage\n\nOPERATIONS DIRECTOR\nCares about: total cost, scalability, supplier reliability\n\nOWNER / CEO / GENERAL MANAGER\nCares about: bottom line, risk, strategic partnership, long-term value"},
    {id:"daily",title:"Daily Activity Standard",color:"amber",text:"MINIMUM DAILY TARGETS:\n— 15 outreach actions (calls + emails + LinkedIn)\n— 3 meaningful conversations with decision makers\n— 1 meeting scheduled or proposal sent"},
    {id:"principles",title:"Key Principles",color:"txt",text:"1. LISTEN MORE THAN YOU TALK\n2. NEVER SEND AN OFFER WITHOUT DISCOVERY\n3. LOG EVERYTHING — If it is not in the CRM, it did not happen.\n4. FOLLOW UP OR FOLLOW OUT\n5. RESPECT THE PROCESS\n6. ASK FOR HELP — Escalation is not weakness.\n7. PROTECT THE RELATIONSHIP"},
    {id:"objectionHandler",title:"Objection Handler",color:"red",text:"TOP 5 OBJECTIONS:\n\n1. WE ALREADY HAVE AN AGENCY\n→ 'Great — it means you see the value. My question: are they fully meeting your needs? Most clients came to us while still working with another agency — more volume, faster delivery, or different worker profile. Would comparing make sense?'\n\n2. FOREIGN WORKERS ARE TOO COMPLICATED LEGALLY\n→ 'That is exactly why clients choose us instead of handling it themselves. We manage 100% of the legal process — permits, ITM, contracts. You don't touch any of it.'\n\n3. NOT THE RIGHT SEASON NOW\n→ 'That is why I am calling now. Our best clients start 6–8 weeks before peak. If April is your peak, we start in February. Can we do a discovery call so you are ready?'\n\n4. TOO EXPENSIVE\n→ 'Let us look at the full picture. What is your current cost per worker — including recruitment, turnover, onboarding, admin, compliance? Our all-inclusive model is typically cheaper once you add everything.'\n\n5. SEND IT BY EMAIL\n→ 'Of course. Before I do — so I send something relevant, not a generic brochure — can I ask: how many people do you need, and what is the timeline?'"},
    {id:"firstMeetingAgenda",title:"First Meeting Agenda (On-Site / Physical)",color:"green",text:"THIS IS THE PHYSICAL ON-SITE MEETING — not the phone discovery call.\nSequence: Discovery Call (phone) → qualify → THEN schedule this meeting.\n\nFIRST MEETING STRUCTURE:\n\n[0–3 min] ENTRY + SMALL TALK\nCompliment something specific. Do NOT start with 'Let me tell you about our company.'\n\n[3–5 min] COMPANY INTRO — max 2 minutes\n→ One sentence: 'We place Ukrainian and Asian workers in Romanian manufacturing.'\n→ Scale: 'We work with 50+ companies, 500+ workers under management.'\n→ One relevant case for their industry. Then STOP pitching.\n\n[5–10 min] TRANSITION TO DISCOVERY\n'That is enough about us — tell me about your staffing challenges.'\nListen. Take notes. Do not interrupt.\n\n[10–30 min] SPIN DISCOVERY\nFollow the Discovery Call Structure: S → P → I → N.\n\n[30–33 min] PAIN SUMMARY — verify you understood\n'Let me check I understood correctly. You have [X] open positions, it takes [Y] weeks to fill them, and the cost of that gap is roughly [Z]. Is that right?'\nIf they confirm — you have your SPIN-P for the proposal.\n\n[33–36 min] NEXT STEP — be specific\nNever say 'I will send you something.'\nSay: 'Based on what I heard, I want to prepare a specific proposal for [X] workers by [DATE]. Can we do 20 minutes on [SPECIFIC DATE] to walk through it?'\nGet a YES or a specific alternative. No 'maybe'.\n\n[36 min] EXIT\nLeave immediately after the commitment. Do not linger.\n\nAFTER THE MEETING (same day):\n— Update SPIN with real answers\n— Set Next Step date in CRM\n— Update Last Contact\n— Send thank-you email with summary of what you heard"},
    {id:"preDiscoveryPrep",title:"Pre-Discovery Preparation",color:"blue",text:"STEP 2 OF PREPARATION — Do This 15 Minutes Before Dialing\n(Step 1 = Pre-Call Research Checklist, done the day before. This is the final review.)\n\nWHAT TO DO IN 15 MINUTES BEFORE THE CALL:\n\n1. REVIEW INTELLIGENCE\nRe-read HQ Intelligence. Revenue, dynamics, vacancies, DM LinkedIn. If you did not write it — go back and find it first.\n\n2. CHECK PRE-CALL CHECKLIST\nResearch < 80% → collect missing info before calling. Do not call blind.\n\n3. WRITE YOUR PAIN HYPOTHESIS\nOne sentence: what is most likely hurting this client right now.\nWrite it in SPIN-P BEFORE the call. This is your starting assumption.\nExample: 'They posted 8 vacancies 10 weeks ago and still cannot fill them — peak season is coming.'\n\n4. PREPARE 3 IMPLICATION QUESTIONS\nWrite them specifically for this client, this industry, this size.\nWrite them in SPIN-I before the call.\nExample: 'If the line is not full in April — what happens to your Q2 delivery plan?'\n\n5. SET YOUR CALL GOAL\nOne specific next step you want to get from this call.\nMeeting? Intro to economic buyer? Agreement to receive a proposal?\nKnow it before you dial.\n\n6. KNOW YOUR OFFER\nWhich service? Ukrainian or Asian workers? What timeline can you commit to?\nDo not make promises you cannot keep.\n\nRULE: If you cannot write the pain hypothesis — you are not ready to call."},
    {id:"coldCallOpener",title:"Cold Call Opener",color:"blue",text:"THE FIRST 20 SECONDS DETERMINE EVERYTHING\n\nBAD OPENER (do not do this):\n'Buna ziua, suntem o agentie de personal si oferim muncitori pentru productie...'\nWhy it fails: starts with 'we', pitches before asking, no reason to listen.\n\nGOOD OPENER (use this structure):\n'Buna ziua, ma numesc Walery, sunt de la Gremi Personal. Am vazut ca compania dvs. s-a extins semnificativ in ultimii doi ani. Voiam sa va intreb — cum gestionati nevoia de personal in sezonul de varf?'\nWhy it works: shows you studied them, asks a question, does not pitch.\n\nSTRUCTURE (3 sentences):\n1. Who you are + company (1 sentence)\n2. Why you are calling THEM specifically — one concrete fact about their business (1 sentence)\n3. Question or insight that opens the conversation (1 sentence)\n\nRULES:\n— First 20 seconds: do NOT pitch, ask a question\n— Show you studied the company — one specific fact\n— Goal of the call: not to sell, to get the next step\n— If gatekeeper: 'Am trimis un email dl-ului [NAME] referitor la personal operational. Puteti sa ma transferati?'\n— If voicemail: do NOT leave one. Call again at a different time."},
    {id:"linkedinOutreach",title:"LinkedIn Outreach",color:"blue",text:"FIRST MESSAGE TO DECISION MAKER ON LINKEDIN — max 5 sentences\n\nTHREE ELEMENTS:\n1. Hook — their post, company news, shared context (shows you did research)\n2. Useful insight — for them, not about you\n3. One question — no pitch\n\nEXAMPLES BY DM TYPE:\n\nHR DIRECTOR:\n'Am vazut ca recrutati operatori de linie de cateva luni. Companiile din productie cu care lucram au redus timpul de recrutare cu 60% trecand la outsourcing. Va intreb — cat timp aloca echipa dvs. lunar pentru recrutare?'\n\nOPERATIONS DIRECTOR:\n'Felicitari pentru extinderea liniei de productie. Din experienta cu producatori similari — cel mai mare risc in primele 3 luni este stabilitatea echipei. Cum gestionati asta momentan?'\n\nRULES:\n— Never mention your company in the first message\n— Never pitch in the first message\n— One question only — not two\n— If they reply → move to Discovery Call\n— If no reply after 7 days → send one follow-up with a different angle\n— If no reply after second message → move to Cold Call approach"},
    {id:"proposalStructure",title:"Proposal Structure",color:"teal",text:"WHAT YOUR PROPOSAL MUST CONTAIN (in this order):\n\n1. PAIN SUMMARY (1 paragraph)\nRepeat back what you heard. Show you understood their situation.\nUse their words, not yours.\nSource: your SPIN-P + Pain Summary field in CRM.\nExample: 'Based on our conversation: your Cluj location needs 15 operators for April peak. You have posted these roles for 10 weeks without success. Each week of delay costs approximately X RON in reduced output.'\n\n2. SOLUTION — SPECIFIC\nNot 'we provide workers'. Specific: how many, what profiles, what timeline.\n→ 15 operators, production profile, available April 1\n→ UA workers on temporary protection, 2-week onboarding\n→ Gremi Personal as official employer\n\n3. FINANCIAL MODEL\n→ RON/hour rate, all-inclusive breakdown\n→ Comparison with direct hire total cost (show the math)\n→ Break-even point\n\n4. PROCESS — HOW IT WORKS\n→ Signing → IGI submission → worker selection → onboarding\n→ Replacement guarantee terms\n→ Your dedicated coordinator\n\n5. PROOF — ONE CASE STUDY\nSame industry + similar size. Real numbers if possible.\n'Cris-Tim Ilfov: 42 workers placed in 3 weeks, contract extended 6 months later.'\n\n6. NEXT STEP\nDo not end the proposal without a specific ask.\n'I propose a 20-minute call on [DATE] to walk through this together. Are you available?'\n\nCRITICAL: Never send a proposal without a scheduled follow-up call. A proposal without a next step is a dead proposal."},
    {id:"closingTechniques",title:"Closing Techniques",color:"green",text:"SEQUENCE: First CLOSE (ask for the decision) → only if they resist on price → then NEGOTIATE (negotiationTechniques).\nDo not go to negotiation before attempting to close. Most deals close without price objection.\n\nWHEN TO CLOSE\nClose only when:\n— Client confirmed the pain (Pain Score 4–5)\n— Economic Buyer is involved\n— Proposal has been sent AND discussed\n— No open objections remaining\n\nDo NOT close after the first call. Do NOT close by email.\n\nCLOSING TECHNIQUES:\n\n1. ASSUMPTIVE CLOSE\n'Cand va este mai convenabil sa incepem — la inceputul lui aprilie sau la mijlocul lunii?'\nAssumes yes, asks only about timing. Works when pain is confirmed.\n\n2. SUMMARY CLOSE\n'Am convenit: 50 de persoane, start 1 aprilie, pret X RON/ora. Semnam?'\nSummarizes all agreements. Removes ambiguity. Asks for signature.\n\n3. URGENCY CLOSE\n'Cota de lucratori pentru mai se inchide. Companiile care au depus cererea mai devreme primesc deja oameni.'\nUse only when true. Never invent urgency.\n\n4. TRIAL CLOSE\n'Daca rezolvam problema cu partea juridica — sunteti pregatiti sa mergeti mai departe?'\nTests readiness without full commitment. Good for handling last objection.\n\nAFTER EVERY CLOSING ATTEMPT:\n— They say YES → immediately confirm in writing\n— They say NOT YET → ask 'What is missing for you to decide?'\n— They say NO → ask 'What changed since our last conversation?' then update Lost Reason in CRM"},
    {id:"negotiationTechniques",title:"Negotiation Techniques",color:"orange",text:"ENTER NEGOTIATION ONLY AFTER attempting to close.\nIf they said yes → do not negotiate, confirm and sign.\nIf they pushed back on price or terms → now negotiate.\n\nPRINCIPLES:\n— Never give a concession without getting something in return\n— First concession sets the anchor — make it small\n— Know your walk-away number before the call\n— Silence is a tool — after making an offer, wait\n\nCOMMON REQUESTS + HOW TO RESPOND:\n\nRequest: 'Can you lower the rate?'\nResponse: 'I can look at the rate if we can confirm the volume. If you commit to [X] workers for [Y] months, I can offer [adjusted rate]. Does that work?'\n\nRequest: 'We need a trial period.'\nResponse: 'Understood. We can do a 30-day pilot with [X] workers. After 30 days, if you are satisfied, we sign the full contract. If not — no penalty. Fair?'\n\nRequest: 'Competitor offered cheaper.'\nResponse: 'What is the total cost they quoted — including all fees, housing, transport, admin? Our rate is all-inclusive. Let us compare on the same basis.'\n\nESCALATION RULES — involve Walery when:\n— Discount requested > 5%\n— Non-standard contract terms\n— Order volume > 50 workers\n— Client requests exclusivity\n— Payment terms beyond 30 days"},
    {id:"competitorComparison",title:"Competitor Comparison",color:"purple",text:"HOW GREMI / ANTFORCE DIFFERS FROM ADECCO, MANPOWER, LUGERA, TRENKWALDER\n\nSPECIALIZATION:\nLarge agencies: wide profile, all segments, white collar + blue collar\nGremi/Antforce: focus on foreign workers for manufacturing. We go deep, not wide.\n→ Your pitch: 'They handle everything. We handle foreign workers for production better than anyone.'\n\nSPEED:\nLarge agencies: standard process, internal bureaucracy, 4–8 week timelines\nGremi/Antforce: direct recruitment channels, faster onboarding, 2–4 weeks UA\n→ Your pitch: 'We delivered 35 workers to Dacia Parts in 18 days.'\n\nLEGAL SUPPORT:\nLarge agencies: standard HR compliance\nGremi/Antforce: full IGI support, work permits, ITM documentation, we are the official employer\n→ Your pitch: 'ITM comes to us. Not to you.'\n\nFLEXIBILITY:\nLarge agencies: fixed packages, minimum volumes, long-term contracts\nGremi/Antforce: customized to client, pilot batches possible, no minimum commitment\n→ Your pitch: 'Start with 5 workers. No risk. Scale when it works.'\n\nCONTACT:\nLarge agencies: account manager changes every 6 months\nGremi/Antforce: dedicated coordinator for the lifetime of the contract\n→ Your pitch: 'You will have one phone number for everything.'\n\nWHEN CLIENT SAYS 'WE ALREADY WORK WITH ADECCO':\n'I understand. Many of our best clients also work with large agencies — for their local needs. We complement, not replace. Our niche is foreign workers. They cannot match our speed and legal expertise in this area.'"},
    {id:"postDealOnboarding",title:"Post-Deal Onboarding",color:"green",text:"WHAT HAPPENS AFTER SIGNING — first 30 days\nHandlowiec must know this process to make correct promises to clients.\n\nDAY 1–3: CONTRACT SIGNING + HANDOVER\nWho: Handlowiec + Operations\n— Sign contract, collect all client specs (location, shift, tasks, start date)\n— Introduce client to their dedicated coordinator\n— Handover briefing to Ops team\n\nDAY 3–7: IGI SUBMISSION + RECRUITMENT START\nWho: Operations\n— Submit worker documentation to IGI (for non-UA workers)\n— Start worker selection from database or launch recruitment\n— Confirm start date with client\n\nDAY 7–21: WORKER PROCESSING\nWho: Operations + Coordinator\n— Medical checks, contracts signing, safety briefing\n— Housing and transport arrangement\n— Client briefed on worker profiles\n\nDAY 21–30: FIRST WORKERS ON SITE\nWho: Coordinator\n— First day on-site: coordinator present\n— Onboarding checklist completed\n— Any issues resolved within 24h\n\nDAY 30+: REGULAR CHECK-IN\nWho: Handlowiec\n— Monthly call with client: satisfaction, any issues, expansion opportunity\n— Update CRM: Last Contact, Next Action\n— Ask for referral: 'Do you know other companies with similar needs?'\n\nCRITICAL DATES TO PROMISE CORRECTLY:\n— Ukrainian workers: 2–4 weeks from signing to on-site\n— Asian workers: 4–6 MONTHS from signing to on-site\n— Never promise Asian workers in 4 weeks. It is not possible."},
    {id:"accountManagementUpsell",title:"Account Management & Upsell",color:"green",text:"AFTER THE DEAL IS SIGNED — the relationship starts, not ends\n\nCHECK-IN SCHEDULE:\n— Week 1: coordinator on-site first day, any issues resolved within 24h\n— Week 2: call with client contact — how are the workers settling in?\n— Month 1: formal check-in — satisfaction, any performance issues, upcoming needs\n— Month 3: strategic review — what is working, what can improve, expansion?\n— Ongoing: every 2 weeks, at minimum monthly contact\n\nWHAT TO TRACK:\n— Worker turnover rate on the client's site\n— Client complaints (speed of resolution = trust)\n— Client satisfaction score (ask directly: 1–10, what would make it 10?)\n\nUPSELL TRIGGERS — listen for these:\n→ 'We are opening a new production line' = new location deal\n→ 'We are adding a night shift' = more workers same location\n→ 'Peak season is coming earlier this year' = volume increase\n→ 'Our Prahova plant has the same problem' = new HQ + location\n→ 'My colleague at [Company X] has the same issue' = referral lead\n\nHOW TO ASK FOR REFERRAL:\n'We really enjoyed working together on this. Do you know other companies — suppliers, partners, industry contacts — who might have similar staffing needs?'\nAsk after month 1, when you have delivered results.\n\nRULE: Keeping a client costs 5x less than finding a new one. Every deal is the start of a long relationship, not a transaction."},
    {id:"meetingConfirmation",title:"Meeting Confirmation",color:"green",text:"SEND 24 HOURS BEFORE THE MEETING:\n\nSubject: Confirmare intalnire maine — [Ora] — Walery / Gremi Personal\n\n'Buna ziua [Nume], confirm intalnirea noastra de maine, [Data] la ora [Ora] la sediul dvs. din [Adresa]. Agenda: ~30 minute pentru a intelege situatia dvs. cu personalul de productie si a vedea daca va putem fi de folos. Daca apare ceva neprevazut, va rog sa ma anuntati la [telefon]. Ne vedem maine. Cu stima, Walery'\n\nRULES:\n— Send 24 hours before — not 5 minutes before\n— No pitch in the confirmation\n— State the duration — client plans their time\n— If online meeting — include Zoom / Meet link immediately\n— If no confirmation received → call to verify\n\nWHY THIS MATTERS:\nA confirmed meeting is 3x less likely to be cancelled than an unconfirmed one.\nIt also shows professionalism from first contact."},
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
      const rows=await dbGet("crm_users",`username=eq.${encodeURIComponent(u.toLowerCase().trim())}&limit=1`);
      const user=rows[0];
      if(!user||user.password!==p){setErr("Incorrect username or password.");setLoading(false);return;}
      if(!user.active){setErr("Account blocked. Contact your administrator.");setLoading(false);return;}
      onLogin(user);
    }catch(e){setErr("Connection error — check internet.");}
    setLoading(false);
  };
  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,${C.bg0} 0%,${C.bg1} 60%)`,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:12,marginBottom:8}}>
            <div style={{width:44,height:44,background:`linear-gradient(135deg,${C.blue},${C.indigo})`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:20,color:"#fff",boxShadow:`0 4px 20px ${C.blue}44`}}>G</div>
            <div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:22,color:C.txt}}>Sales Team CRM</div><div style={{fontSize:10,color:C.txt3,letterSpacing:"0.12em"}}>GREMI · ROMANIA</div></div>
          </div>
        </div>
        <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:16,padding:28,display:"flex",flexDirection:"column",gap:16,boxShadow:`0 8px 40px ${C.bg0}`}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:20,color:C.txt}}>Welcome back</div>
          <div><div className="lbl">USERNAME</div><input className="fi" type="text" value={u} onChange={e=>setU(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="username" autoCapitalize="none"/></div>
          <div><div className="lbl">PASSWORD</div><input className="fi" type="password" value={p} onChange={e=>setP(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="••••••••"/></div>
          {err&&<div style={{background:`${C.red}18`,border:`1px solid ${C.red}44`,color:C.red,padding:"10px 12px",borderRadius:8,fontSize:12}}>{err}</div>}
          <button className="btn" onClick={go} disabled={loading} style={{background:`linear-gradient(135deg,${C.blue},${C.indigo})`,color:"#fff",padding:"13px",fontSize:15,borderRadius:10,boxShadow:`0 4px 16px ${C.blue}44`,opacity:loading?0.7:1}}>{loading?"Signing in...":"Sign In →"}</button>
        </div>
      </div>
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
    <div style={{flex:1,overflowY:"auto",padding:12,display:"flex",flexDirection:"column",gap:10}}>
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
function ConversationalLeadInput({hqs, locs, users, curId, services, entities, onCreated}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null); // {hq:{...}, loc:{...}}
  const [editMode, setEditMode] = useState(false);
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

  if(!open) return (
    <div style={{padding:"10px 12px",borderBottom:`1px solid ${C.border}`,background:C.bg0}}>
      <button className="btn" onClick={()=>{setOpen(true);setTimeout(()=>taRef.current?.focus(),50);}}
        style={{width:"100%",background:`${C.teal}12`,border:`1.5px dashed ${C.teal}44`,color:C.teal,padding:"11px 14px",fontSize:12,borderRadius:9,textAlign:"left",display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:16}}>🤖</span>
        <span>Paste company data or describe a new lead in any language...</span>
      </button>
    </div>
  );

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
    if(hqFields.length>0&&hq&&onUpdateHQ){const hqPatch={};if(fields.HQ_INTELLIGENCE)hqPatch.intelligence=(hq.intelligence?hq.intelligence+"\n\n":"")+"[AI] "+fields.HQ_INTELLIGENCE;if(fields.HQ_ANNUAL_TURNOVER)hqPatch.annualTurnover=fields.HQ_ANNUAL_TURNOVER;if(fields.HQ_EMPLOYEES)hqPatch.employees=fields.HQ_EMPLOYEES;if(fields.HQ_SEASONALITY)hqPatch.seasonality=fields.HQ_SEASONALITY;onUpdateHQ(hq.id,hqPatch);}
    setPending(null);setMsgs(prev=>[...prev,{role:"system",content:"✅ Fields applied to CRM."}]);
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
function HQDetailModal({hq,locs,users,isAdmin,onClose,onEditHQ,onDeleteHQ,onAddLoc,onSelectLoc,onSaveChecklist}) {
  const hqLocs=locs.filter(l=>l.parentId===hq.id);
  const totalW=hqLocs.reduce((s,l)=>s+(parseInt(l.workers)||0),0);
  const stages=[...new Set(hqLocs.map(l=>l.stage))];
  const [showDanger,setShowDanger]=useState(false);
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
      <div className="mf">
        <button className="btn" onClick={onEditHQ} style={{width:"100%",background:C.bg3,color:C.txt2,padding:"13px",fontSize:13,borderRadius:10,border:`1px solid ${C.border}`}}>✎ Edit HQ Info</button>
      </div>
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
  const [pendingStage,setPendingStage]=useState(null);
  const [stagePrompt,setStagePrompt]=useState("");

  const handleStageChange = (newStage) => {
    if(newStage===loc.stage) return;
    // Smart stage transition logic
    if(newStage==="Meeting Done") {
      setShowDebrief(true);
    } else if(newStage==="Closed Lost") {
      if(confirm("Mark as Closed Lost?\n\nWe'll open Edit so you can fill Lost Reason — this data helps the team.")) {
        onUpdate(loc.id,{stage:newStage});
        onEdit();
      }
    } else if(newStage==="Closed Won") {
      onUpdate(loc.id,{stage:newStage});
    } else if(newStage==="Proposal Sent") {
      const d3 = new Date(); d3.setDate(d3.getDate()+3);
      onUpdate(loc.id,{stage:newStage,nextStep:"Follow-up on proposal",nextStepDate:d3.toISOString().slice(0,10)});
    } else {
      onUpdate(loc.id,{stage:newStage});
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
          <select value={loc.temp} onChange={e=>onUpdate(loc.id,{temp:e.target.value})} className="fi" style={{width:105,fontSize:13}}>{TEMPS.map(t=><option key={t}>{t}</option>)}</select>
        </div>

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

        {loc.notes&&<div style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}><div className="lbl">NOTES</div><div style={{fontSize:13,color:C.txt2,lineHeight:1.7}}>{loc.notes}</div></div>}
        <ActivityLog loc={loc} onUpdate={onUpdate}/>
        {hq&&<div style={{background:C.bg3,border:`1px solid ${C.indigo}44`,borderRadius:10,padding:12,cursor:"pointer"}} onClick={onClose}><div className="lbl">PARENT COMPANY</div><div style={{fontWeight:600,fontSize:13,color:C.indigo}}>🏢 {hq.company}</div><div style={{fontSize:11,color:C.txt3,marginTop:2}}>{hq.centralContact} · {hq.industry}</div></div>}
        {canArchive&&(
          <div>
            <button className="btn" onClick={()=>setShowDanger(!showDanger)} style={{width:"100%",background:"transparent",color:C.txt3,padding:"8px",fontSize:10,borderRadius:7,border:`1px dashed ${C.border2}`}}>{showDanger?"▲ Hide":"▼ More actions..."}</button>
            {showDanger&&<div style={{marginTop:8,background:`${C.red}08`,border:`1px solid ${C.red}33`,borderRadius:10,padding:12}}><div style={{fontSize:10,color:C.red,fontWeight:600,marginBottom:8}}>ARCHIVE</div><div style={{fontSize:11,color:C.txt3,marginBottom:10}}>Move this location to archive.</div><button className="btn" onClick={onArchive} style={{width:"100%",background:`${C.red}18`,color:C.red,padding:"10px",fontSize:12,borderRadius:8,border:`1px solid ${C.red}44`}}>📦 Archive this location</button></div>}
          </div>
        )}
      </div>
      <div className="mf" style={{display:"flex",gap:8}}>
        <button className="btn" onClick={()=>setShowDebrief(true)} style={{background:`${C.blue}18`,color:C.blue2,padding:"12px 14px",fontSize:13,borderRadius:10,border:`1px solid ${C.blue}33`}}>📞</button>
        <button className="btn" onClick={()=>setShowEmail(true)} style={{background:`${C.teal}18`,color:C.teal,padding:"12px 14px",fontSize:13,borderRadius:10,border:`1px solid ${C.teal}33`}}>✉️</button>
        {canEdit?<button className="btn" onClick={onEdit} style={{flex:1,background:`linear-gradient(135deg,${C.blue},${C.indigo})`,color:"#fff",padding:"13px",fontSize:14,borderRadius:10}}>✎ Edit</button>
        :<div style={{flex:1,padding:"13px",fontSize:12,color:C.txt3,textAlign:"center"}}>View only</div>}
        <button className="btn" onClick={()=>setShowAI(!showAI)} style={{background:showAI?`${C.teal}28`:`${C.teal}18`,color:C.teal,padding:"13px 16px",fontSize:14,borderRadius:10,border:`1px solid ${showAI?C.teal:C.teal+"44"}`}}>🤖</button>
      </div>
      {showAI&&<InlineAI loc={loc} hq={hq} onUpdate={onUpdate} onUpdateHQ={onUpdateHQ}/>}
      {showDebrief&&<PostCallDebrief loc={loc} hq={hq} onClose={()=>setShowDebrief(false)} onApply={onUpdate}/>}
      {showEmail&&<EmailDraftModal loc={loc} hq={hq} onClose={()=>setShowEmail(false)}/>}
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
    <div style={{flex:1,overflowY:"auto",padding:12,display:"flex",flexDirection:"column",gap:10}}>
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
              <button className="btn" onClick={()=>{setNewCo(true);setForm({...form,parentId:null,company:""})} } style={{flex:1,padding:"8px",fontSize:12,borderRadius:7,background:newCo?`${C.green}22`:C.bg4,color:newCo?C.green:C.txt3,border:`1.5px solid ${newCo?C.green:C.border}`}}>+ New Company</button>
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
                <div><div className="lbl">CENTRAL CONTACT</div><input type="text" value={newHQ.centralContact} onChange={e=>setNewHQ({...newHQ,centralContact:e.target.value})} className="fi" placeholder="Main decision maker"/></div>
              </div>
            )}
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={{gridColumn:"1/-1"}}><div className="lbl">LOCATION NAME *</div><input type="text" value={form.location} onChange={e=>setForm({...form,location:e.target.value})} className="fi" placeholder="e.g. Factory Timișoara"/></div>
          <div><div className="lbl">COUNTY</div><select value={form.county} onChange={e=>setForm({...form,county:e.target.value})} className="fi"><option value="">— select —</option>{COUNTIES.map(c=><option key={c}>{c}</option>)}</select></div>
          <div><div className="lbl">INDUSTRY</div><select value={form.industry||""} onChange={e=>setForm({...form,industry:e.target.value})} className="fi"><option value="">— select —</option>{INDUSTRIES.map(i=><option key={i}>{i}</option>)}</select></div>
        </div>
        <div><div className="lbl">ADDRESS</div><input type="text" value={form.address||""} onChange={e=>setForm({...form,address:e.target.value})} className="fi"/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><div className="lbl">CONTACT NAME</div><input type="text" value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} className="fi"/></div>
          <div>
            <div className="lbl">CONTACT ROLE</div>
            <div style={{display:"flex",gap:6}}>
              <select value={["HR Director","HR Manager","Plant Manager","Production Manager","Operations Director","General Manager","Owner","CEO"].includes(form.role)?form.role:"__custom"} onChange={e=>{if(e.target.value!=="__custom")setForm({...form,role:e.target.value});else setForm({...form,role:""}); }} className="fi" style={{flex:"0 0 auto",width:"50%"}}>
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
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><div className="lbl">SERVICE</div><select value={form.service||""} onChange={e=>setForm({...form,service:e.target.value})} className="fi"><option value="">— select —</option>{services.map(s=><option key={s}>{s}</option>)}</select></div>
          <div><div className="lbl">LEGAL ENTITY</div><select value={form.companyName||""} onChange={e=>setForm({...form,companyName:e.target.value})} className="fi"><option value="">— select —</option>{entities.map(e=><option key={e}>{e}</option>)}</select></div>
        </div>
        <div><div className="lbl">WORKERS NEEDED</div><input type="text" value={form.workers||""} onChange={e=>setForm({...form,workers:e.target.value})} className="fi" placeholder="e.g. 25"/></div>
        <div><div className="lbl">WORKER TYPE</div><WorkerTypeSelect value={form.workerType||""} onChange={v=>setForm({...form,workerType:v})}/></div>
        <div><div className="lbl">LEAD SOURCE</div><select value={form.source||""} onChange={e=>setForm({...form,source:e.target.value})} className="fi"><option value="">— select —</option>{LEAD_SOURCES.map(s=><option key={s}>{s}</option>)}</select></div>
        {isAdmin&&<div><div className="lbl">SALESPERSON</div><select value={form.salesId||""} onChange={e=>setForm({...form,salesId:Number(e.target.value)||null})} className="fi"><option value="">— select —</option>{users.filter(u=>u.active).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={{gridColumn:"1/-1"}}><div className="lbl">NEXT STEP</div><input type="text" value={form.nextStep||""} onChange={e=>setForm({...form,nextStep:e.target.value})} className="fi" placeholder="Specific action..."/></div>
          <div><div className="lbl">NEXT STEP DATE</div><input type="date" value={form.nextStepDate||""} onChange={e=>setForm({...form,nextStepDate:e.target.value})} className="fi"/></div>
          <div><div className="lbl">LAST CONTACT</div><input type="date" value={form.lastContact||""} onChange={e=>setForm({...form,lastContact:e.target.value})} className="fi"/></div>
        </div>
        <div style={{background:C.bg3,border:`1px solid ${C.indigo}33`,borderRadius:10,padding:12,display:"flex",flexDirection:"column",gap:10}}>
          <div style={{fontSize:10,color:C.indigo,fontWeight:600,letterSpacing:"0.08em"}}>SPIN — DISCOVERY</div>
          <SpinField label="S — SITUATION" hint={["Current headcount and shifts","Do they work with a staffing agency?","Number of open positions"]} value={form.spin?.s||""} onChange={v=>setForm({...form,spin:{...form.spin,s:v}})}/>
          <SpinField id="location-spin-p" label="P — PROBLEM" hint={["How long does it take to fill a vacancy?","What is the turnover rate?","Any ITM/compliance issues?"]} value={form.spin?.p||""} onChange={v=>setForm({...form,spin:{...form.spin,p:v}})}/>
          <SpinField label="I — IMPLICATION" hint={["What happens to orders when understaffed?","Estimated cost of one day production loss?","What if this continues next quarter?"]} value={form.spin?.i||""} onChange={v=>setForm({...form,spin:{...form.spin,i:v}})}/>
          <SpinField label="N — NEED-PAYOFF" hint={["If we deliver X workers in 3 weeks — how does that change things?","What would stable staffing mean for you?","Would outsourcing the HR admin help?"]} value={form.spin?.n||""} onChange={v=>setForm({...form,spin:{...form.spin,n:v}})}/>
          <div><div className="lbl">PAIN SUMMARY (for proposal)</div><textarea value={form.spin?.painSummary||""} onChange={e=>setForm({...form,spin:{...form.spin,painSummary:e.target.value}})} rows={2} className="fi" style={{fontSize:12}} placeholder='e.g. "Need 20 operators by April, posted for 10 weeks, no success via local agencies."'/></div>
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
            <div><div className="lbl">RECHECK DATE</div><input type="date" value={form.nextStepDate||""} onChange={e=>setForm({...form,nextStepDate:e.target.value})} className="fi"/></div>
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
  {id:"cold_call_opener",category:"Cold Call",title:"Cold Call Opener",text:`Bună ziua, [PRENUME]!

Mă numesc Walery, sunt Director de Dezvoltare la Gremi Personal — colaborăm cu producători din România pentru a rezolva problema de personal cu lucrători calificați din Ucraina și Asia.

Am văzut că [COMPANIA] are [X] posturi deschise pe eJobs de [Y] săptămâni.

Am un minut să vă explic cum am rezolvat o situație similară la o fabrică din [JUDEȚ]?`},
  {id:"voicemail",category:"Cold Call",title:"Voicemail Script",text:`Bună ziua, [PRENUME].

Sunt Walery de la Gremi Personal. Am văzut că [COMPANIA] caută personal de producție.

Vă sun să vă prezint o soluție care a redus timpul de recrutare la 3 săptămâni pentru fabrici similare din [JUDEȚ].

Vă sun din nou marți la 10:00 — sau puteți nota numărul meu: [TELEFON].

Succes!`},
  {id:"first_email",category:"Email",title:"First Contact Email",text:`Subiect: Personal calificat pentru [COMPANIA] — soluție în 3 săptămâni

Bună ziua, [PRENUME],

Am observat că [COMPANIA] are mai multe posturi deschise pentru operatori producție. Știu că găsirea de personal stabil pe piața locală devine din ce în ce mai dificilă.

La Gremi Personal, rezolvăm exact această problemă — livrăm lucrători calificați din Ucraina și Asia, gata de muncă, cu toată documentația legală în regulă.

Un exemplu concret: am livrat 35 de lucrători pentru o fabrică de piese auto din Argeș în 18 zile.

Aș aprecia 20 de minute pentru un apel să înțeleg situația dumneavoastră. Sunteți disponibil joi sau vineri?

Cu respect,
Walery
Director Dezvoltare — Gremi Personal Romania
[TELEFON]`},
  {id:"post_meeting",category:"Email",title:"Post-Meeting Follow-up",text:`Subiect: Mulțumesc pentru întâlnire — Next steps [COMPANIA]

Bună ziua, [PRENUME],

Vă mulțumesc pentru timp și pentru discuția deschisă de azi.

Am înțeles că principala provocare este [PROBLEMA]. Pe baza celor discutate, voi pregăti o ofertă personalizată pentru [X] lucrători [TIP], cu termen de start [DATA].

Trimit oferta până [DATA+1]. Dacă aveți întrebări între timp, sunt la dispoziție.

Cu respect,
Walery`},
  {id:"follow_up_3",category:"Email",title:"Follow-up Day 3 (after Proposal)",text:`Subiect: Re: Oferta Gremi Personal — [COMPANIA]

Bună ziua, [PRENUME],

Revin cu un scurt mesaj după oferta trimisă acum 3 zile.

Vreau să mă asigur că ați primit documentele și să răspund la orice întrebări.

Suntem flexibili pe termeni — dacă ceva nu se potrivește, discutăm.

Sunteți disponibil pentru un scurt apel azi sau mâine?

Cu respect,
Walery`},
  {id:"breakup",category:"Email",title:"Breakup Message (Day 14)",text:`Subiect: Ultima încercare — [COMPANIA]

Bună ziua, [PRENUME],

Am încercat să vă contactez de câteva ori în ultimele două săptămâni, fără succes.

Înțeleg că prioritățile se schimbă. Îmi permit să închid dosarul [COMPANIA] din sistemul nostru.

Dacă situația se schimbă și problema de personal revine pe agendă, sunt disponibil.

O zi bună,
Walery`},
  {id:"objection_price",category:"Objection",title:"Price Objection",text:`Înțeleg preocuparea legată de preț — și apreciez că sunteți direct.

Înainte să comparăm cifrele, haideți să punem pe masă costul total:
— [X] posturi neocupate × [Y] RON/zi producție pierdută = [Z] RON/lună
— Timp HR alocat recrutării: [H] ore × cost/oră
— Fluctuație: cost de înlocuire per angajat ≈ 2-3 salarii

La Gremi, garantăm: lucrătorii vin gata documentați, nu plătiți recrutare, nu vă ocupați de housing dacă nu doriți.

Care este cifra pe care o comparați cu oferta noastră?`},
  {id:"objection_quality",category:"Objection",title:"Quality / Reliability Objection",text:`Înțeleg — ați auzit povești despre probleme de calitate cu lucrătorii străini.

Iată ce facem diferit:
1. Selecție strictă în țara de origine — interviu tehnic + test practic
2. Coordonator român/ucrainian dedicat pe site
3. Garanție de înlocuire în 72h dacă cineva nu se adaptează
4. Referințe disponibile: [CLIENT DIN ACELAȘI JUDEȚ/INDUSTRIE]

Aș putea aranja o vizită la un client actual din [JUDEȚ/INDUSTRIE] similară?`},
  {id:"linkedin_connect",category:"LinkedIn",title:"LinkedIn Connection Request",text:`Bună ziua, [PRENUME].

Am văzut că [COMPANIA] se extinde — posturi noi pe eJobs. Activez în staffing industrial în România și cred că ar putea fi un context de colaborare.

Vreau să rămânem conectați.

Walery Gremi Personal`},
  {id:"linkedin_follow",category:"LinkedIn",title:"LinkedIn Message (after connection)",text:`Bună ziua, [PRENUME],

Vă mulțumesc pentru conectare.

Lucrez cu fabrici similare din [JUDEȚ/INDUSTRIE] pe subiectul de personal foreign — mai ales sezon sau extindere rapidă.

Nu vă propun nimic acum — doar o întrebare: este problema de personal ceva activ la [COMPANIA] în perioada asta?

Cu respect, Walery`},
];

function TemplatesTab() {
  const cats=[...new Set(TPL_DATA.map(t=>t.category))];
  const [selCat,setSelCat]=useState(cats[0]);
  const [selTpl,setSelTpl]=useState(null);
  const [editText,setEditText]=useState("");
  const [copied,setCopied]=useState(false);
  const filtered=TPL_DATA.filter(t=>t.category===selCat);
  const select=(tpl)=>{setSelTpl(tpl);setEditText(tpl.text);setCopied(false);};
  const copy=()=>{navigator.clipboard.writeText(editText).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});};
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{display:"flex",gap:6,padding:"10px 12px",borderBottom:`1px solid ${C.border}`,overflowX:"auto",flexShrink:0}}>
        {cats.map(c=>(
          <button key={c} className="btn" onClick={()=>{setSelCat(c);setSelTpl(null);}}
            style={{padding:"6px 14px",fontSize:12,borderRadius:7,background:selCat===c?`${C.blue}22`:C.bg3,color:selCat===c?C.blue2:C.txt3,border:`1.5px solid ${selCat===c?C.blue:C.border}`,flexShrink:0}}>
            {c}
          </button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:12,display:"flex",flexDirection:"column",gap:8}}>
        {!selTpl&&filtered.map(t=>(
          <div key={t.id} className="card" style={{padding:"12px 14px",cursor:"pointer"}} onClick={()=>select(t)}>
            <div style={{fontWeight:600,fontSize:13,color:C.txt,marginBottom:3}}>{t.title}</div>
            <div style={{fontSize:11,color:C.txt3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.text.substring(0,80)}...</div>
          </div>
        ))}
        {selTpl&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <button className="btn" onClick={()=>setSelTpl(null)} style={{background:C.bg3,color:C.txt3,padding:"6px 12px",fontSize:11,borderRadius:7,border:`1px solid ${C.border}`}}>← Back</button>
              <div style={{fontWeight:700,fontSize:14,color:C.txt}}>{selTpl.title}</div>
            </div>
            <textarea value={editText} onChange={e=>setEditText(e.target.value)} rows={16}
              style={{width:"100%",background:C.bg3,border:`1px solid ${C.border}`,color:C.txt,borderRadius:10,padding:"12px",fontSize:13,fontFamily:"'Inter',sans-serif",resize:"vertical",lineHeight:1.8,outline:"none"}}/>
            <button className="btn" onClick={copy}
              style={{width:"100%",background:copied?`${C.green}22`:`linear-gradient(135deg,${C.teal},${C.blue})`,color:copied?C.green:"#fff",padding:"12px",fontSize:14,borderRadius:9,border:copied?`1px solid ${C.green}44`:"none"}}>
              {copied?"✓ Copied!":"📋 Copy Template"}
            </button>
            <div style={{fontSize:10,color:C.txt3,fontStyle:"italic",textAlign:"center"}}>Customize the [VARIABLES] before sending</div>
          </div>
        )}
      </div>
    </div>
  );
}


// ─── PLAYBOOK TAB ─────────────────────────────────────────────────
function PlaybookTab({playbook,setPlaybook,isAdmin}) {
  const [tab,setTab]=useState("stages");
  const [selStage,setSelStage]=useState(null);
  const [selExtra,setSelExtra]=useState(null);
  const [editStage,setEditStage]=useState(null);
  const stages=playbook.stages||INIT_PLAYBOOK.stages;
  const extras=playbook.extras||INIT_PLAYBOOK.extras;
  const getStageDot=(s)=>{const c=getSC()[s.stage]||C.txt3;return c;};
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        {["stages","extras"].map(t=>(
          <button key={t} className="tab" onClick={()=>setTab(t)} style={{background:tab===t?C.bg2:C.bg0,color:tab===t?C.txt:C.txt3,borderBottomColor:tab===t?C.blue:"transparent",flex:"unset",padding:"10px 20px"}}>
            {t==="stages"?"Pipeline Stages":"Reference Cards"}
          </button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:12,display:"flex",flexDirection:"column",gap:8}}>
        {tab==="stages"&&!selStage&&stages.map(s=>{
          const c=getStageDot(s);
          return(
            <div key={s.id} className="card" style={{padding:"12px 14px",cursor:"pointer",borderLeft:`3px solid ${c}`}} onClick={()=>setSelStage(s)}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                <div style={{fontWeight:600,fontSize:13,color:C.txt}}>{s.stage}</div>
                <span style={{background:c+"22",color:c,border:`1px solid ${c}44`,borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700}}>{s.icon}</span>
              </div>
              <div style={{fontWeight:500,fontSize:12,color:C.txt2,marginBottom:3}}>{s.title}</div>
              <div style={{fontSize:11,color:C.txt3,fontStyle:"italic"}}>{s.target}</div>
            </div>
          );
        })}
        {tab==="stages"&&selStage&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button className="btn" onClick={()=>setSelStage(null)} style={{background:C.bg3,color:C.txt3,padding:"6px 12px",fontSize:11,borderRadius:7,border:`1px solid ${C.border}`}}>← Back</button>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:14,color:C.txt}}>{selStage.stage}</div>
            </div>
            <div style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
              <div style={{fontWeight:600,fontSize:13,color:C.txt,marginBottom:4}}>{selStage.title}</div>
              <div style={{display:"inline-block",background:`${C.amber}18`,color:C.amber,border:`1px solid ${C.amber}33`,borderRadius:7,padding:"4px 10px",fontSize:11,marginBottom:12}}>🎯 {selStage.target}</div>
              <pre style={{fontFamily:"'Inter',sans-serif",fontSize:12,color:C.txt2,lineHeight:1.9,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{selStage.tasks}</pre>
            </div>
          </div>
        )}
        {tab==="extras"&&!selExtra&&extras.map(e=>(
          <div key={e.id} className="card" style={{padding:"12px 14px",cursor:"pointer",borderLeft:`3px solid ${C[e.color]||C.txt3}`}} onClick={()=>setSelExtra(e)}>
            <div style={{fontWeight:600,fontSize:13,color:C.txt}}>{e.title}</div>
          </div>
        ))}
        {tab==="extras"&&selExtra&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button className="btn" onClick={()=>setSelExtra(null)} style={{background:C.bg3,color:C.txt3,padding:"6px 12px",fontSize:11,borderRadius:7,border:`1px solid ${C.border}`}}>← Back</button>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:14,color:C.txt}}>{selExtra.title}</div>
            </div>
            <div style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
              <pre style={{fontFamily:"'Inter',sans-serif",fontSize:12,color:C.txt2,lineHeight:1.9,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{selExtra.text}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AI CHAT TAB ─────────────────────────────────────────────────
function AIChatTab({locs,hqs,users,cur}) {
  const [msgs,setMsgs]=useState([]); const [input,setInput]=useState(""); const [loading,setLoading]=useState(false);
  const bottomRef=useRef(null); const taRef=useRef(null);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,loading]);

  const ctx=()=>{
    const active=locs.filter(l=>!["Closed Won","Closed Lost"].includes(l.stage));
    const won=locs.filter(l=>l.stage==="Closed Won");
    const placed=won.reduce((s,l)=>s+(parseInt(l.workers)||0),0);
    const hot=active.filter(l=>l.temp==="🔥 Hot");
    const overdue=active.filter(l=>isOD(l.nextStepDate,l.stage));
    return `You are the internal sales AI for Gremi Personal Romania. You are talking with ${cur.name} (${cur.role}).
Pipeline: ${locs.length} total locations, ${active.length} active, ${won.length} won, ${placed} workers placed.
Hot deals: ${hot.length}, Overdue: ${overdue.length}
Companies: ${hqs.length} companies. Key clients: ${hqs.slice(0,5).map(h=>h.company).join(", ")}
Active stages: ${STAGES.map(s=>{const c=active.filter(l=>l.stage===s).length;return c>0?`${s}(${c})`:null}).filter(Boolean).join(", ")}
Respond in the user's language. Be specific, direct, and helpful.`;
  };

  const send=async()=>{
    const text=input.trim(); if(!text||loading) return;
    const newMsgs=[...msgs,{role:"user",content:text}]; setMsgs(newMsgs); setInput(""); setLoading(true);
    try{
      const res=await fetch(AI_PROXY,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${SB_KEY}`},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:2000,system:ctx(),messages:newMsgs.map(m=>({role:m.role,content:m.content}))})});
      const data=await res.json(); const raw=data.content?.[0]?.text||"Error.";
      setMsgs(prev=>[...prev,{role:"assistant",content:raw}]);
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


// ─── SETTINGS TAB ────────────────────────────────────────────────
function SettingsTab({curUser,users,setUsers,services,setServices,entities,setEntities,playbook,setPlaybook,isAdmin,onChangePwd,onAdmin}) {
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
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:11,color:C.txt3,letterSpacing:"0.1em",marginTop:6,marginBottom:2}}>CUSTOMIZATION</div>
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
    <div style={{flex:1,overflowY:"auto",padding:12}}>
      <div style={{fontSize:11,color:C.txt3,letterSpacing:"0.1em",marginBottom:14,fontWeight:600}}>SELECT THEME</div>
      {Object.entries(THEME_GROUPS).map(([group,keys])=>(
        <div key={group} style={{marginBottom:20}}>
          <div style={{fontSize:10,color:C.txt3,fontWeight:700,letterSpacing:"0.1em",marginBottom:10}}>{group.toUpperCase()}</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {keys.map(k=>{
              const th=THEMES[k]; const isA=curTheme===k;
              return(
                <div key={k} onClick={()=>setTheme(k)} style={{background:isA?`${C.blue}18`:C.bg2,border:`2px solid ${isA?C.blue:C.border}`,borderRadius:12,padding:"12px 14px",cursor:"pointer",transition:"all 0.15s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div style={{fontWeight:isA?700:500,fontSize:13,color:isA?C.blue2:C.txt}}>{th.name}</div>
                    {isA&&<span style={{background:`${C.blue}22`,color:C.blue2,border:`1px solid ${C.blue}44`,borderRadius:5,padding:"2px 8px",fontSize:10,fontWeight:700}}>✓ Active</span>}
                  </div>
                  <div style={{display:"flex",gap:5}}>
                    {[th.bg1,th.blue,th.teal,th.green,th.amber,th.red,th.indigo].map((c,i)=>(
                      <div key={i} style={{width:22,height:22,borderRadius:5,background:c,border:`1px solid ${th.border}`}}/>
                    ))}
                  </div>
                </div>
              );
            })}
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
  const [archive,setArchive]=useState([]);
  const [theme,setTheme]=useState(()=>{ try { return localStorage.getItem("gremi_theme")||"navy"; } catch(e){ return "navy"; } });
  const [tab,setTab]=useState("today");
  const [search,setSearch]=useState("");
  const [filters,setFilters]=useState({stage:"All",temp:"All",service:"All",entity:"All",county:"All",industry:"All",salesId:"All",overdueOnly:false,myOnly:false,showLocs:true});
  const [selHQ,setSelHQ]=useState(null);
  const [selLoc,setSelLoc]=useState(null);
  const [editLoc,setEditLoc]=useState(null);
  const [editHQ,setEditHQ]=useState(null);
  const [showPwd,setShowPwd]=useState(false);
  const [showAdmin,setShowAdmin]=useState(false);
  const [dbReady,setDbReady]=useState(false);
  const [dbError,setDbError]=useState("");
  const [syncStatus,setSyncStatus]=useState("idle"); // idle | syncing | error

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
    const matchQ=!q||l.company.toLowerCase().includes(q)||l.location?.toLowerCase().includes(q)||l.contact?.toLowerCase().includes(q)||l.county?.toLowerCase().includes(q)||l.stage?.toLowerCase().includes(q);
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
    const tp={["🔥 Hot"]:0,["🟡 Warm"]:1,["❄️ Cold"]:2};
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

  const TABS=[
    {id:"today",label:"Today",icon:"📊"},
    {id:"leads",label:"Leads",icon:"🏭"},
    {id:"team",label:"Team",icon:"👥"},
    {id:"kpi",label:"KPI",icon:"📈"},
    {id:"playbook",label:"Book",icon:"📖"},
    {id:"templates",label:"Scripts",icon:"💬"},
    {id:"ai",label:"AI",icon:"🤖"},
    {id:"archive",label:"Archive",icon:"📦"},
    {id:"theme",label:"Theme",icon:"🎨"},
    {id:"settings",label:"Settings",icon:"⚙"},
  ];

  const NavBar=()=>(
    <div style={{background:C.bg0,borderTop:`1px solid ${C.border}`,display:"flex",flexShrink:0,overflowX:"auto"}}>
      {TABS.map(t=>(
        <button key={t.id} className="tab" onClick={()=>setTab(t.id)}
          style={{background:tab===t.id?C.bg2:C.bg0,color:tab===t.id?C.txt:C.txt3,borderBottomColor:tab===t.id?C.blue:"transparent",minWidth:52,flexDirection:"column",gap:2,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:14}}>{t.icon}</span>
          <span style={{fontSize:9}}>{t.label}</span>
        </button>
      ))}
    </div>
  );

  return(
    <div style={{maxWidth:480,margin:"0 auto",height:"100svh",display:"flex",flexDirection:"column",background:C.bg1,fontFamily:"'Inter',sans-serif",position:"relative"}}>
      <style>{getCSS()}</style>
      {/* Header */}
      <div style={{background:`linear-gradient(90deg,${C.bg0},${C.bg1})`,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{width:30,height:30,background:`linear-gradient(135deg,${C.blue},${C.indigo})`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:15,color:"#fff",boxShadow:`0 2px 10px ${C.blue}40`}}>G</div>
          <div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:14,color:C.txt,lineHeight:1}}>Gremi</div>
            <div style={{fontSize:9,color:C.txt3,letterSpacing:"0.12em"}}>CRM · ROMANIA</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {syncStatus==="syncing"&&<div style={{width:6,height:6,borderRadius:"50%",background:C.amber,animation:"pulse 1s infinite"}}/>}
          {syncStatus==="error"&&<div style={{width:6,height:6,borderRadius:"50%",background:C.red}} title="DB error"/>}
          {syncStatus==="idle"&&dbReady&&<div style={{width:6,height:6,borderRadius:"50%",background:C.green}}/>}
          {tab==="leads"&&(
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <input className="fi" value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search..." style={{width:120,padding:"6px 10px",fontSize:12}}/>
              <button className="btn" onClick={()=>setEditLoc({...EMPTY_LOC,salesId:curUser.id})} style={{background:`linear-gradient(135deg,${C.green},${C.teal})`,color:"#fff",padding:"6px 12px",fontSize:12,borderRadius:7,boxShadow:`0 2px 8px ${C.green}44`}}>+ New</button>
              {(isAdmin||isTeamLead)&&<button className="btn" onClick={exportXLSX} style={{background:C.bg3,color:C.txt3,padding:"6px 10px",fontSize:11,borderRadius:7,border:`1px solid ${C.border}`}}>↓ XLS</button>}
            </div>
          )}
          <button className="btn" onClick={()=>setCurUser(null)} style={{background:C.bg3,color:C.txt3,padding:"5px 9px",fontSize:11,borderRadius:7,border:`1px solid ${C.border}`}}>↩</button>
        </div>
      </div>

      {/* Tab content */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {tab==="today"&&<TodayTab locs={locs} hqs={hqs} users={users} cur={curUser} onSelectLoc={l=>{setSelLoc(l);setTab("leads");}} isAdmin={isAdmin} isTeamLead={isTeamLead}/>}

        {tab==="leads"&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <ConversationalLeadInput hqs={hqs} locs={locs} users={users} curId={curUser.id} services={services} entities={entities} onCreated={handleConversationalCreate}/>
            <FilterBar filters={filters} setFilters={setFilters} users={users} isAdmin={isAdmin} isTeamLead={isTeamLead} curId={curUser.id} services={services} entities={entities}/>
            <div style={{flex:1,overflowY:"auto",padding:10}}>
              {filtered.length===0&&<div style={{textAlign:"center",padding:40,color:C.txt3,fontSize:13}}>No leads match the current filters</div>}
              {Object.entries(groupedByHQ).map(([hqId,locGroup])=>{
                const hq=hqs.find(h=>h.id===parseInt(hqId));
                const shown=locGroup.sort((a,b)=>{const tp={["🔥 Hot"]:0,["🟡 Warm"]:1,["❄️ Cold"]:2};return (tp[a.temp]||1)-(tp[b.temp]||1);});
                return(
                  <div key={hqId} style={{marginBottom:14}}>
                    {hq&&(
                      <div className="row-hover" onClick={()=>setSelHQ(hq)} style={{display:"flex",alignItems:"center",gap:7,padding:"6px 2px",marginBottom:4}}>
                        <div style={{width:20,height:20,background:`${C.indigo}22`,border:`1px solid ${C.indigo}44`,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:C.indigo,flexShrink:0}}>🏢</div>
                        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:11,fontWeight:700,color:C.indigo,letterSpacing:"0.05em"}}>{hq.company}</div>
                        <div style={{fontSize:9,color:C.txt3,flexShrink:0}}>{shown.length} loc</div>
                      </div>
                    )}
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
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab==="team"&&<TeamTab users={users} locs={locs} onSelect={l=>{setSelLoc(l);setTab("leads");}}/>}
        {tab==="kpi"&&<KPITab locs={locs} hqs={hqs} users={users} cur={curUser} isAdmin={isAdmin} isTeamLead={isTeamLead}/>}
        {tab==="playbook"&&<PlaybookTab playbook={playbook} setPlaybook={setPlaybook} isAdmin={isAdmin}/>}
        {tab==="templates"&&<TemplatesTab/>}
        {tab==="ai"&&<AIChatTab locs={locs} hqs={hqs} users={users} cur={curUser}/>}
        {tab==="archive"&&<ArchiveTab archive={archive} onRestore={restore} isAdmin={isAdmin}/>}
        {tab==="theme"&&<ThemeTab curTheme={theme} setTheme={t=>{setTheme(t);C=THEMES[t]||THEMES.navy;try{localStorage.setItem("gremi_theme",t);}catch(e){}}}/>}
        {tab==="settings"&&<SettingsTab curUser={curUser} users={users} setUsers={setUsers} services={services} setServices={setServices} entities={entities} setEntities={setEntities} playbook={playbook} setPlaybook={setPlaybook} isAdmin={isAdmin} onChangePwd={()=>setShowPwd(true)} onAdmin={()=>setShowAdmin(true)}/>}
      </div>

      <NavBar/>

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
          onSaveChecklist={patch=>updHQ(selHQ.id,patch)}/>
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
          onSave={async()=>{await saveHQ(editHQ);setEditHQ(null);}}/>
      )}
      {showPwd&&<ChangePwdModal cur={curUser} users={users} setUsers={setUsers} setCur={setCurUser} isAdmin={isAdmin} onClose={()=>setShowPwd(false)}/>}
      {showAdmin&&<AdminPanel users={users} setUsers={setUsers} cur={curUser} services={services} setServices={setServices} entities={entities} setEntities={setEntities} onClose={()=>setShowAdmin(false)}/>}
    </div>
  );
}
