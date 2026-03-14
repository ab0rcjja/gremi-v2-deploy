import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";

// ─── SUPABASE ────────────────────────────────────────────────────
const SB_URL = "https://ojzqehgvmsftdztdtxrj.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qenFlaGd2bXNmdGR6dGR0eHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDA1OTUsImV4cCI6MjA4ODMxNjU5NX0.Oh99nXmVlPVaAOk1URvy0880x7-zwU3mmZYQWpzbuaw";

const sbFetch = async (path, opts = {}) => {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      "apikey": SB_KEY,
      "Authorization": `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      "Prefer": opts.prefer ?? "return=representation",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  const t = await res.text();
  return t ? JSON.parse(t) : [];
};
const dbGet   = (t, q="")     => sbFetch(`${t}?${q}`,   { method:"GET", prefer:"" });
const dbPost  = (t, b)        => sbFetch(t,              { method:"POST", body:JSON.stringify(b) });
const dbPatch = (t, match, b) => sbFetch(`${t}?${match}`,{ method:"PATCH", body:JSON.stringify(b) });
const dbDel   = (t, match)    => sbFetch(`${t}?${match}`,{ method:"DELETE", prefer:"return=minimal", headers:{} });

// ── Mappers: camelCase ↔ snake_case ──
const hqToDb  = ({id,isHQ,_type,...h}) => ({
  company:h.company, industry:h.industry, notes:h.notes, address:h.address||"", website:h.website||"",
  central_contact:h.centralContact||"", central_role:h.centralRole||"",
  central_phone:h.centralPhone||"", central_email:h.centralEmail||"",
});
const hqFromDb = (r) => ({
  id:r.id, isHQ:true, company:r.company||"", industry:r.industry||"",
  centralContact:r.central_contact||"", centralRole:r.central_role||"",
  centralPhone:r.central_phone||"", centralEmail:r.central_email||"",
  address:r.address||"", website:r.website||"", notes:r.notes||"",
});
const locToDb = ({id,isHQ,_type,...l}) => ({
  parent_id:l.parentId||null, company:l.company||"", location:l.location||"",
  address:l.address||"", contact:l.contact||"", role:l.role||"",
  phone:l.phone||"", email:l.email||"", county:l.county||"",
  industry:l.industry||"", employees:l.employees||"", stage:l.stage||"New",
  temp:l.temp||"❄️ Cold", workers:l.workers||"", worker_type:l.workerType||"",
  next_action:l.nextAction||"", last_contact:l.lastContact||"",
  source:l.source||"", service:l.service||"", company_name:l.companyName||"",
  sales_id:l.salesId||null, notes:l.notes||"",
  activities:JSON.stringify(l.activities||[]), spin:JSON.stringify(l.spin||{s:"",p:"",i:"",n:""}),
});
const locFromDb = (r) => ({
  id:r.id, isHQ:false, parentId:r.parent_id||null, company:r.company||"",
  location:r.location||"", address:r.address||"", contact:r.contact||"",
  role:r.role||"", phone:r.phone||"", email:r.email||"", county:r.county||"",
  industry:r.industry||"", employees:r.employees||"", stage:r.stage||"New",
  temp:r.temp||"❄️ Cold", workers:r.workers||"", workerType:r.worker_type||"",
  nextAction:r.next_action||"", lastContact:r.last_contact||"",
  source:r.source||"", service:r.service||"", companyName:r.company_name||"",
  salesId:r.sales_id||null, notes:r.notes||"",
  activities:typeof r.activities==="string"?JSON.parse(r.activities||"[]"):r.activities||[],
  spin:typeof r.spin==="string"?JSON.parse(r.spin||"{}"):r.spin||{s:"",p:"",i:"",n:""},
});


const THEME_GROUPS = {
  "Dark Classic":["navy","graphite","obsidian","steel","slate"],
  "Dark Accent":["espresso","midnight","emerald"],
  "Light":["corporate","ivory","nordic","sand"],
};
const THEMES = {
  navy: {
    name:"Navy",
    bg0:"#060d18",bg1:"#0b1525",bg2:"#101e30",bg3:"#152540",bg4:"#1a2d4a",
    border:"#1e3554",border2:"#2a4a6e",
    txt:"#dce8f8",txt2:"#7a9fc4",txt3:"#435e7a",
    blue:"#2f7fd4",blue2:"#5299e8",indigo:"#5b5fef",teal:"#0fa896",
    green:"#0ea572",amber:"#e8960a",orange:"#f07020",
    red:"#e03c3c",purple:"#9b7cf8",pink:"#e86ca0",
  },
  graphite: {
    name:"Graphite",
    bg0:"#101014",bg1:"#18181c",bg2:"#212126",bg3:"#2a2a30",bg4:"#34343c",
    border:"#3c3c44",border2:"#52525e",
    txt:"#ececf0",txt2:"#9898a8",txt3:"#5c5c6e",
    blue:"#5088e0",blue2:"#6ca0f0",indigo:"#6e6ef0",teal:"#18b8a0",
    green:"#20c070",amber:"#e8a020",orange:"#e87838",
    red:"#e84848",purple:"#a080f8",pink:"#e870a0",
  },
  obsidian: {
    name:"Obsidian",
    bg0:"#0a0a0a",bg1:"#111111",bg2:"#191919",bg3:"#222222",bg4:"#2b2b2b",
    border:"#333333",border2:"#444444",
    txt:"#f0f0f0",txt2:"#a0a0a0",txt3:"#606060",
    blue:"#3b9af5",blue2:"#5cb0ff",indigo:"#7070ff",teal:"#00d4aa",
    green:"#00cc66",amber:"#ffaa00",orange:"#ff7733",
    red:"#ff4444",purple:"#b088ff",pink:"#ff6699",
  },
  espresso: {
    name:"Espresso",
    bg0:"#0e0b08",bg1:"#171210",bg2:"#201a16",bg3:"#2a2220",bg4:"#342c28",
    border:"#3e3430",border2:"#544840",
    txt:"#f0e8e0",txt2:"#b8a090",txt3:"#6e5e50",
    blue:"#4890d0",blue2:"#60a8e8",indigo:"#7068e0",teal:"#18b090",
    green:"#20a868",amber:"#d89818",orange:"#d87030",
    red:"#d84040",purple:"#9878d8",pink:"#d06888",
  },
  midnight: {
    name:"Midnight Blue",
    bg0:"#080810",bg1:"#0e0e1a",bg2:"#151524",bg3:"#1c1c30",bg4:"#24243c",
    border:"#2e2e4a",border2:"#404060",
    txt:"#e0e0f8",txt2:"#8888b8",txt3:"#505078",
    blue:"#4488e0",blue2:"#60a0f8",indigo:"#6060f0",teal:"#10c0a0",
    green:"#18b870",amber:"#e0a020",orange:"#e07830",
    red:"#e04848",purple:"#9070f0",pink:"#e060a0",
  },
  corporate: {
    name:"Corporate Light",
    bg0:"#e4e8ee",bg1:"#edf0f5",bg2:"#ffffff",bg3:"#f6f8fb",bg4:"#e8ecf2",
    border:"#cdd4de",border2:"#b0bac8",
    txt:"#1a2030",txt2:"#4a5670",txt3:"#8090a8",
    blue:"#2060c0",blue2:"#3078e0",indigo:"#4840c8",teal:"#0e8880",
    green:"#0e8850",amber:"#c88810",orange:"#d06818",
    red:"#cc2828",purple:"#6838b8",pink:"#c82868",
  },
  ivory: {
    name:"Executive Ivory",
    bg0:"#e2ddd6",bg1:"#f0ece6",bg2:"#faf8f5",bg3:"#f5f2ee",bg4:"#eae6e0",
    border:"#d0cac0",border2:"#b8b0a4",
    txt:"#28201a",txt2:"#605040",txt3:"#908070",
    blue:"#2860a8",blue2:"#3878c8",indigo:"#4840b0",teal:"#108878",
    green:"#18804a",amber:"#b87808",orange:"#c06018",
    red:"#b82828",purple:"#6030a8",pink:"#b02058",
  },
  steel: {
    name:"Steel Blue",
    bg0:"#0c1018",bg1:"#121822",bg2:"#1a222e",bg3:"#222c3a",bg4:"#2a3648",
    border:"#344058",border2:"#445878",
    txt:"#d8e4f0",txt2:"#8098b8",txt3:"#506880",
    blue:"#3888d8",blue2:"#50a0f0",indigo:"#5868e8",teal:"#10b8a0",
    green:"#10b070",amber:"#e09818",orange:"#e07028",
    red:"#e04040",purple:"#9078f0",pink:"#e06898",
  },
  slate: {
    name:"Slate",
    bg0:"#0f1318",bg1:"#161b22",bg2:"#1e242c",bg3:"#262e38",bg4:"#303a46",
    border:"#38424e",border2:"#4a5668",
    txt:"#e0e6ee",txt2:"#8898ac",txt3:"#566478",
    blue:"#4090d8",blue2:"#58a8f0",indigo:"#6068e8",teal:"#14b8a0",
    green:"#18b070",amber:"#e0a018",orange:"#e07828",
    red:"#e04444",purple:"#9478f0",pink:"#e06898",
  },
  nordic: {
    name:"Nordic Frost",
    bg0:"#e8edf2",bg1:"#f0f4f8",bg2:"#fafbfd",bg3:"#f4f6f9",bg4:"#e6ecf2",
    border:"#cad4e0",border2:"#aab8ca",
    txt:"#1a2840",txt2:"#486088",txt3:"#7890b0",
    blue:"#2870c8",blue2:"#3888e0",indigo:"#4848d0",teal:"#0e9088",
    green:"#0e8858",amber:"#c08808",orange:"#d06818",
    red:"#cc2828",purple:"#6838c0",pink:"#c02868",
  },
  emerald: {
    name:"Emerald Dark",
    bg0:"#060e0c",bg1:"#0a1814",bg2:"#10221c",bg3:"#162c26",bg4:"#1c3830",
    border:"#244838",border2:"#346050",
    txt:"#d8f0e8",txt2:"#78b8a0",txt3:"#488068",
    blue:"#3898d0",blue2:"#50b0e8",indigo:"#5878e8",teal:"#10d0a8",
    green:"#18c878",amber:"#d8a018",orange:"#d87828",
    red:"#d84848",purple:"#8878e8",pink:"#d86890",
  },
  sand: {
    name:"Sand",
    bg0:"#e0d8ce",bg1:"#ece6dc",bg2:"#f8f4ee",bg3:"#f2ede6",bg4:"#e6e0d6",
    border:"#cec4b6",border2:"#b0a694",
    txt:"#2a221a",txt2:"#665848",txt3:"#9a8a78",
    blue:"#2c6cb0",blue2:"#3c84cc",indigo:"#4c44b8",teal:"#108880",
    green:"#148850",amber:"#b87808",orange:"#c06018",
    red:"#c03030",purple:"#6838b8",pink:"#b82860",
  },
};
let C = THEMES.navy;

const STAGES    = ["New","Contacted","Interested","Meeting Scheduled","Meeting Done","Proposal Sent","Negotiation","Closed Won","Closed Lost","No Answer"];
const TEMPS     = ["🔥 Hot","🟡 Warm","❄️ Cold"];
const SOURCES   = ["PL Client Referral","RO Client Referral","PL Sales Team","Cold Call","Cold Email","LinkedIn Outreach","Industry Event","Website Inquiry","Job Portal (eJobs/OLX)","ANOFM Database","Partner Agency","Personal Network","Inbound Request","Other"];
const INDUSTRIES= ["Auto Parts","Textile","Food Production","Metal Fabrication","Electronics","Logistics","Construction","Pharma","Retail","Agriculture","Other"];
const COUNTIES  = ["Alba","Arad","Argeș","Bacău","Bihor","Bistrița-Năsăud","Botoșani","Brăila","Brașov","București","Buzău","Călărași","Caraș-Severin","Cluj","Constanța","Covasna","Dâmbovița","Dolj","Galați","Giurgiu","Gorj","Harghita","Hunedoara","Ialomița","Iași","Ilfov","Maramureș","Mehedinți","Mureș","Neamț","Olt","Prahova","Sălaj","Satu Mare","Sibiu","Suceava","Teleorman","Timiș","Tulcea","Vaslui","Vâlcea","Vrancea"];
const WORKER_TYPES = ["\u{1F1FA}\u{1F1E6} Ukrainian","\u{1F30F} Asian","\u{1F1FA}\u{1F1E6}+\u{1F30F} Mix"];
const DEF_SERVICES = ["Outsourcing","Leasing","Permanent Recruitment"];
const DEF_ENTITIES = ["Gremi Personal SRL","Antforce SRL"];

const getSC = () => ({
  "New":C.txt3,"Contacted":C.blue,"Interested":C.indigo,
  "Meeting Scheduled":C.amber,"Meeting Done":C.orange,"Proposal Sent":C.teal,
  "Negotiation":C.pink,"Closed Won":C.green,"Closed Lost":C.red,"No Answer":C.txt3,
});

// ─── DATA MODEL ──────────────────────────────────────────────────
// HQ records: company info + central contact only, NO stage/deal fields
// Location records: actual deals — each has its own stage, workers, contact

const INIT_PLAYBOOK = {
  stages: [
    {id:"new",stage:"New",icon:"1",title:"Lead Qualification & Contact Discovery",target:"Complete within 24h of lead entry",tasks:"STEP 1 — COMPANY RESEARCH:\n— Termene.ro / ListaFirme.ro: revenue, employee count, CUI, registered address\n— Company website: products, locations, management page\n— eJobs / BestJobs / OLX: are they posting vacancies? (= they need people)\n\nSTEP 2 — FIND THE DECISION MAKER (by name!):\nDo NOT call the general number and ask 'who handles staffing'. You need a NAME before you call.\n\nWHO TO FIND (in order of priority):\n1. HR Director / HR Manager — owns the staffing budget and process\n2. Plant Manager / Production Manager — feels the pain daily, can escalate\n3. Operations Director — strategic view, approves larger projects\n4. Owner / General Manager — final decision on 50+ workers\n\nHOW TO FIND THEM:\n— LinkedIn: search '[Company] + Romania' → People tab → filter by title\n— Company website: 'Despre noi' / 'Echipa' / 'Management' section\n— Google: '[Company] director HR Romania' — interviews, articles, conferences\n— ONRC (Registrul Comertului): administrator name = usually Owner/GM\n— Ask reception: 'Buna ziua, as dori sa trimit un email directorului HR. Puteti sa-mi dati adresa corecta?'\n\nSTEP 3 — FIND DIRECT CONTACT:\n— LinkedIn profile → sometimes phone/email visible\n— Hunter.io: enter company domain → see email pattern (name.surname@company.ro)\n— Apollo.io (free plan): email + phone from LinkedIn profile\n— Reception call: 'Buna ziua, incerc sa-l contactez pe dl. [NAME]. Puteti sa ma transferati sau sa-mi dati numarul direct?'\n\nSTEP 4 — CRM ENTRY:\n— Create HQ record: company, industry, address, website, central contact NAME + ROLE\n— Add location with address, county, employee count\n— Set worker type (UA / Asia / Mix)\n— IMPORTANT: Do NOT move to 'Contacted' until you have a SPECIFIC PERSON with name and at least one contact method\n\nQUALITY CHECK:\n— Do I have a NAME? (not just 'HR department')\n— Do I know their ROLE?\n— Do I have at least ONE way to reach them directly?\n— If NO — keep researching. A lead without a name is not a lead."},
    {id:"contacted",stage:"Contacted",icon:"2",title:"First Contact Sequence",target:"3 contact attempts within 7 business days",tasks:"PREREQUISITE: You have a specific person's NAME, ROLE, and contact method.\n\nWHO ARE YOU CONTACTING?\n— If you found HR Director → call/email HR Director directly\n— If you found Plant Manager → call/email Plant Manager directly\n— If you only found Owner/GM → email first (they are busy), then call\n— If you found NO decision maker → call reception and ask to be transferred\n\nDAY 1 — FIRST TOUCH:\n— CALL the direct number (morning 9-11 or afternoon 14-16 works best)\n— If no answer → leave NO voicemail (call again Day 3)\n— SAME DAY: send introductory EMAIL to their personal email (not info@company)\n— Use the template matching their role\n\nDAY 3 — SECOND TOUCH:\n— CALL again at a DIFFERENT time of day\n— If gatekeeper answers: 'Am trimis un email dl-ului/d-nei [NAME] saptamana trecuta referitor la personal operational.'\n— If still no answer → send LinkedIn connection request with SHORT note\n\nDAY 7 — THIRD TOUCH:\n— Follow-up EMAIL (use Follow-up #1 template)\n— If they accepted LinkedIn → send message there\n— This is the LAST attempt in this cycle\n\nIF NO RESPONSE AFTER 3 ATTEMPTS:\n— Move to 'No Answer'\n— Set follow-up reminder for 30 days\n— Try finding a DIFFERENT person at the same company"},
    {id:"interested",stage:"Interested",icon:"3",title:"Discovery & Meeting Preparation",target:"Meeting scheduled within 5 days of interest confirmation",tasks:"WHO ARE YOU MEETING?\n— HR Director/Manager → they ask about: contracts, compliance, ITM, costs\n— Plant Manager → they ask about: speed, skills, shift coverage, quality\n— Operations Director → they ask about: total cost, scalability, SLA\n— Owner/GM → they ask about: partnership terms, risk, long-term value\n\nPREPARE ACCORDINGLY:\n— For HR: contract template overview, compliance checklist\n— For Plant Manager: worker profiles, delivery timeline, replacement guarantee\n— For Operations: cost simulation (their current cost vs our all-inclusive)\n— For Owner: company presentation, references, strategic partnership\n\nSPIN DISCOVERY (fill ALL four fields):\nS — SITUATION: Headcount, shifts, current suppliers, open positions\nP — PROBLEM: Time to fill, turnover rate, compliance concerns\nI — IMPLICATION: Cost of delays, impact on orders, ITM risk\nN — NEED-PAYOFF: Stable team, predictable costs, zero admin\n\nIF MEETING IS ON-SITE:\n— Ask for a factory tour. Count the empty workstations. That's your number."},
    {id:"meeting",stage:"Meeting Scheduled",icon:"4",title:"Meeting Execution",target:"Zero no-shows. Always confirm 24h before.",tasks:"24H BEFORE:\n— Confirm: 'Confirm intalnirea de maine la [ORA]. Astept cu interes.'\n\nMEETING STRUCTURE (30 min):\n\nFIRST 5 MIN — Rapport:\n— Thank them. Ask about operations. Show genuine interest. Do NOT pitch.\n\nNEXT 15 MIN — SPIN Discovery:\n— Let THEM talk about THEIR problems.\n— Match questions to their role:\n  HR: 'Ce provocari aveti cu conformitatea?'\n  Plant Mgr: 'Cand nu aveti echipa completa, cum afecteaza productia?'\n  Operations: 'Cat estimati ca va costa rotatia pe an?'\n  Owner: 'Ce ar insemna daca echipa ar fi stabila 2 ani?'\n\nLAST 10 MIN — Present solution:\n— ONLY after you understand their situation\n— Ask directly: 'How many people? When? What budget range?'\n\nAFTER:\n— Same day: update Activity Log + SPIN fields\n— Note everyone present in the meeting"},
    {id:"done",stage:"Meeting Done",icon:"5",title:"Proposal Preparation & Delivery",target:"Offer sent within 24h of meeting",tasks:"WITHIN 24 HOURS:\n— Send follow-up email (use post-meeting template)\n— Attach customized offer: worker count, rate, service, timeline, terms\n— Include company presentation and references\n\nOFFER MUST INCLUDE:\n— Clear pricing: RON/hour or RON/month, all-inclusive\n— What is included (contracts, payroll, ITM, housing/transport)\n— Delivery timeline\n— Replacement guarantee terms\n\nCRM: Update stage → 'Proposal Sent'. Set Next Action: follow-up in 3 days."},
    {id:"proposal",stage:"Proposal Sent",icon:"6",title:"Follow-up Sequence",target:"Decision within 14 days",tasks:"Always follow up with the SAME person you met.\n\nDAY 3: CALL the decision maker directly.\n— 'Revin referitor la oferta trimisa. Ati avut posibilitatea sa o analizati?'\n\nDAY 7: EMAIL with additional value.\n— A reference, updated availability, or answer to a concern from the meeting\n\nDAY 14: FINAL ATTEMPT — breakup message.\n\nIF THEY SAY 'I need to discuss with [BOSS]':\n— Offer: 'Would it help if I joined a short call with [BOSS]?'\n— Note the BOSS name in CRM — this is the real decision maker\n\nIF NO RESPONSE AFTER 14 DAYS:\n— Move to 'Closed Lost' or 'No Answer'\n— Set follow-up reminder for 3 months"},
    {id:"negotiation",stage:"Negotiation",icon:"7",title:"Terms Discussion & Closing",target:"Close or escalate within 10 days",tasks:"HANDLE OBJECTIONS:\n— Use Objection Response templates\n— Always acknowledge the concern before responding\n— Focus on total cost, not just hourly rate\n\nESCALATE TO WALERY IF:\n— Discount > 5%\n— Non-standard terms (payment > 30 days, liability)\n— Order > 50 workers\n— Client demands exclusivity or penalties\n— Any request you are not sure how to handle\n\nCLOSING:\n— Confirm all terms in writing before signing\n— Move to 'Closed Won' only after contract signature"},
    {id:"won",stage:"Closed Won",icon:"✓",title:"Handover & Account Development",target:"Operational handover within 48h",tasks:"IMMEDIATE:\n— Update all CRM fields: final worker count, rate, service, entity, start date\n— Notify operations team\n— Send 'thank you and next steps' email\n\nFIRST 30 DAYS:\n— Check in after 1 week\n— Address any issues immediately\n\nACCOUNT DEVELOPMENT:\n— Ask for referral: 'Do you know other companies with similar needs?'\n— Explore expansion: other locations, additional headcount\n— Schedule quarterly review\n\nA won deal is the beginning, not the end."},
  ],
  extras: [
    {id:"dm",title:"Decision Maker Approach",color:"indigo",text:"HR DIRECTOR / HR MANAGER\nCares about: compliance, ITM risk, contract terms, worker documentation\nSpeak their language: conformitate, contracte conforme, zero risc legal\nKey question: 'Ce se intampla daca ITM vine cu o inspectie?'\n\nPLANT MANAGER / PRODUCTION MANAGER\nCares about: capacity, speed of delivery, worker quality, shift coverage\nSpeak their language: capacitate, termen de livrare, calitate, schimburi complete\nKey question: 'Cat va costa o zi in care linia nu functioneaza la capacitate?'\n\nOPERATIONS DIRECTOR\nCares about: total cost, scalability, supplier reliability, process efficiency\nSpeak their language: cost total, flexibilitate, fiabilitate, eficienta\nKey question: 'Cum arata costul real al rotatiei de personal per an?'\n\nOWNER / CEO / GENERAL MANAGER\nCares about: bottom line, risk, strategic partnership, long-term value\nSpeak their language: ROI, parteneriat strategic, zero risc, crestere\nKey question: 'Ce ar insemna pentru business daca ati avea echipa stabila pe 2 ani?'\n\nRULE: Never pitch the same way to all four."},
    {id:"daily",title:"Daily Activity Standard",color:"amber",text:"MINIMUM DAILY TARGETS:\n— 15 outreach actions (calls + emails + LinkedIn)\n— 3 meaningful conversations with decision makers\n— 1 meeting scheduled or proposal sent\n\nWEEKLY REVIEW:\n— Pipeline review with team leader every Monday\n— Update all Next Action dates\n— Identify and address stale deals (14+ days no contact)\n\nMONTHLY:\n— KPI review: conversion rate, average deal size, time-to-close\n— Template review: what messaging works, what does not\n— Client satisfaction check on all active contracts"},
    {id:"principles",title:"Key Principles",color:"txt",text:"1. LISTEN MORE THAN YOU TALK — Discovery is about understanding, not pitching.\n2. NEVER SEND AN OFFER WITHOUT DISCOVERY — A proposal without SPIN data is a guess.\n3. LOG EVERYTHING — If it is not in the CRM, it did not happen.\n4. FOLLOW UP OR FOLLOW OUT — No response is not rejection. Most deals close after follow-up #3.\n5. RESPECT THE PROCESS — Skip a step and the deal quality drops.\n6. ASK FOR HELP — Escalation is not weakness. It is professionalism.\n7. PROTECT THE RELATIONSHIP — One honest 'I do not know, let me check' is worth more than a wrong promise."},
  ],
};

const INIT_USERS = [
  {id:1,name:"Walery",username:"walery",password:"admin123",role:"admin",active:true,protected:true},
  {id:2,name:"Ana",   username:"ana",   password:"ana123",  role:"user", active:true,protected:false},
];

// HQ = {id, isHQ:true, company, industry, centralContact, centralRole, centralPhone, centralEmail, notes}
// LOC = {id, isHQ:false, parentId, company, location, address, contact, role, phone, email, county, employees, stage, temp, workers, nextAction, lastContact, source, service, companyName, salesId, notes}

const INIT_HQS = [
  {id:100,isHQ:true,company:"Autoliv Romania",industry:"Auto Parts",centralContact:"Ion Popescu",centralRole:"HR Director",centralPhone:"+40 721 000 001",centralEmail:"i.popescu@autoliv.ro",address:"Bd. Pipera 42, Voluntari, Ilfov",website:"www.autoliv.com",notes:"Group HQ in Bucharest. Central procurement."},
  {id:101,isHQ:true,company:"Dacia Parts",industry:"Auto Parts",centralContact:"Andrei Marin",centralRole:"Production Director",centralPhone:"+40 723 000 003",centralEmail:"a.marin@daciaparts.ro",address:"Str. Industriilor 5, Pitesti, Arges",website:"",notes:""},
  {id:102,isHQ:true,company:"Mondostar Textiles",industry:"Textile",centralContact:"Elena Dumitrescu",centralRole:"HR Manager",centralPhone:"",centralEmail:"",address:"",website:"www.mondostar.ro",notes:"Posted 15 jobs on eJobs."},
  {id:103,isHQ:true,company:"Cris-Tim",industry:"Food Production",centralContact:"Bogdan Stancu",centralRole:"General Manager",centralPhone:"+40 724 000 005",centralEmail:"b.stancu@cristim.ro",address:"Sos. Bucuresti-Ploiesti 42, Ilfov",website:"www.cristim.ro",notes:"Group decision maker."},
];

const INIT_LOCS = [
  {id:1,isHQ:false,parentId:100,company:"Autoliv Romania",location:"Plant Ploiești",address:"Str. Fabricii 12, Ploiesti, Prahova",contact:"Mihai Dinu",role:"Plant Manager",county:"Prahova",employees:"220",stage:"Contacted",temp:"🟡 Warm",workers:"8",workerType:"🇺🇦 Ukrainian",nextAction:"2026-03-08",lastContact:"2026-03-02",source:"ANOFM Database",service:"Outsourcing",companyName:"Gremi Personal SRL",salesId:1,phone:"",email:"",activities:[],spin:{s:"",p:"",i:"",n:""},notes:"Seat components line. Needs 8 operators."},
  {id:2,isHQ:false,parentId:100,company:"Autoliv Romania",location:"Warehouse Ilfov",address:"Sos. Afumati 88, Voluntari, Ilfov",contact:"Radu Popa",role:"Logistics Manager",county:"Ilfov",employees:"80",stage:"Meeting Scheduled",temp:"🔥 Hot",workers:"12",workerType:"🇺🇦 Ukrainian",nextAction:"2026-03-10",lastContact:"2026-03-05",source:"ANOFM Database",service:"Outsourcing",companyName:"Gremi Personal SRL",salesId:1,phone:"",email:"",activities:[],spin:{s:"",p:"",i:"",n:""},notes:"New warehouse, ramp-up in April."},
  {id:3,isHQ:false,parentId:101,company:"Dacia Parts",location:"Factory Pitești",address:"Str. Industriilor 5, Pitesti, Arges",contact:"Andrei Marin",role:"Production Director",county:"Argeș",employees:"320",stage:"Proposal Sent",temp:"🔥 Hot",workers:"35",workerType:"🇺🇦 Ukrainian",nextAction:"2026-03-12",lastContact:"2026-03-04",source:"LinkedIn Outreach",service:"Outsourcing",companyName:"Antforce SRL",salesId:2,phone:"",email:"",activities:[],spin:{s:"",p:"",i:"",n:""},notes:"35 workers @ 6200 RON. Awaiting sign."},
  {id:4,isHQ:false,parentId:102,company:"Mondostar Textiles",location:"Factory Cluj",address:"Str. Fabricii 20, Cluj-Napoca",contact:"Elena Dumitrescu",role:"HR Manager",county:"Cluj",employees:"250",stage:"New",temp:"❄️ Cold",workers:"15",workerType:"🌏 Asian",nextAction:"2026-03-15",lastContact:"",source:"Job Portal (eJobs/OLX)",service:"Leasing",companyName:"Gremi Personal SRL",salesId:2,phone:"",email:"",activities:[],spin:{s:"",p:"",i:"",n:""},notes:"Posted 15 jobs on eJobs."},
  {id:5,isHQ:false,parentId:103,company:"Cris-Tim",location:"Plant Ilfov",address:"Sos. Bucuresti-Ploiesti 42, Ilfov",contact:"Bogdan Stancu",role:"General Manager",county:"Ilfov",employees:"600",stage:"Closed Won",temp:"🔥 Hot",workers:"42",workerType:"🇺🇦 Ukrainian",nextAction:"",lastContact:"2026-02-28",source:"RO Client Referral",service:"Outsourcing",companyName:"Gremi Personal SRL",salesId:1,phone:"",email:"",activities:[],spin:{s:"",p:"",i:"",n:""},notes:"Contract signed. 42 workers Apr 1."},
  {id:6,isHQ:false,parentId:103,company:"Cris-Tim",location:"Warehouse Prahova",address:"",contact:"Florin Negru",role:"Ops Manager",county:"Prahova",employees:"120",stage:"Interested",temp:"🟡 Warm",workers:"10",workerType:"🇺🇦 Ukrainian",nextAction:"2026-03-18",lastContact:"2026-03-01",source:"RO Client Referral",service:"Outsourcing",companyName:"Gremi Personal SRL",salesId:1,phone:"",email:"",activities:[],spin:{s:"",p:"",i:"",n:""},notes:"Interested after Ilfov contract."},
];

const EMPTY_LOC = {id:null,isHQ:false,parentId:null,company:"",location:"",address:"",contact:"",role:"",phone:"",email:"",county:"",industry:"",employees:"",stage:"New",temp:"❄️ Cold",workers:"",workerType:"",nextAction:"",lastContact:"",source:"",service:"Outsourcing",companyName:"Gremi Personal SRL",salesId:null,notes:"",activities:[],spin:{s:"",p:"",i:"",n:""}};
const EMPTY_HQ  = {id:null,isHQ:true,company:"",industry:"",centralContact:"",centralRole:"",centralPhone:"",centralEmail:"",address:"",website:"",notes:""};

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
  ::-webkit-scrollbar{width:4px;height:4px;}
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
`;

// ─── LOGIN ───────────────────────────────────────────────────────
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
function AdminPanel({users,setUsers,cur,onClose,services,setServices,entities,setEntities}) {
  const [showAdd,setShowAdd]=useState(false);
  const [nu,setNu]=useState({name:"",username:"",password:"",role:"user"});
  const [err,setErr]=useState("");
  const add=()=>{
    if(!nu.name||!nu.username||!nu.password){setErr("All fields required.");return;}
    if(users.find(u=>u.username===nu.username.toLowerCase())){setErr("Username exists.");return;}
    setUsers([...users,{...nu,id:Date.now(),username:nu.username.toLowerCase(),active:true,protected:false}]);
    setNu({name:"",username:"",password:"",role:"user"});setShowAdd(false);setErr("");
  };
  const canModify=(u)=>!u.protected&&u.id!==cur.id;
  return(
    <div className="modal" style={{zIndex:200}}>
      <div className="mh"><div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:16,color:C.txt}}>Admin Panel</div><div style={{fontSize:11,color:C.txt3}}>User Management</div></div><button className="xb" onClick={onClose}>×</button></div>
      <div className="ms">
        {users.map(u=>(
          <div key={u.id} style={{background:C.bg3,border:`1px solid ${u.active?C.border:C.red+"55"}`,borderLeft:`3px solid ${u.protected?C.amber:u.active?C.green:C.red}`,borderRadius:10,padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <div><div style={{fontWeight:600,fontSize:14,color:C.txt}}>{u.name} {u.protected&&"🔒"}</div><div style={{fontSize:11,color:C.txt3}}>@{u.username}</div></div>
              <div style={{display:"flex",gap:5}}>
                <span className="pill" style={{background:u.role==="admin"?`${C.purple}22`:u.role==="team_lead"?`${C.amber}22`:C.bg4,color:u.role==="admin"?C.purple:u.role==="team_lead"?C.amber:C.blue,border:`1px solid ${u.role==="admin"?C.purple+"55":u.role==="team_lead"?C.amber+"55":C.border}`}}>{u.role==="admin"?"ADMIN":u.role==="team_lead"?"TEAM LEAD":"USER"}</span>
                <span className="pill" style={{background:u.active?`${C.green}18`:`${C.red}18`,color:u.active?C.green:C.red,border:`1px solid ${u.active?C.green+"44":C.red+"44"}`}}>{u.active?"ACTIVE":"BLOCKED"}</span>
              </div>
            </div>
            {u.protected?<div style={{fontSize:11,color:C.amber,fontStyle:"italic"}}>Protected account — cannot be modified</div>
            :u.id===cur.id?<div style={{fontSize:11,color:C.txt3,fontStyle:"italic"}}>Your account</div>
            :canModify(u)?(
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <button className="btn" onClick={()=>setUsers(users.map(x=>x.id===u.id?{...x,active:!x.active}:x))} style={{flex:1,padding:"8px",fontSize:11,borderRadius:7,background:u.active?`${C.red}18`:`${C.green}18`,color:u.active?C.red:C.green,border:`1px solid ${u.active?C.red+"44":C.green+"44"}`}}>{u.active?"Block":"Unblock"}</button>
                <select value={u.role} onChange={e=>setUsers(users.map(x=>x.id===u.id?{...x,role:e.target.value}:x))} className="fi" style={{flex:1,fontSize:11,padding:"8px"}}>
                  <option value="user">User</option>
                  <option value="team_lead">Team Leader</option>
                  <option value="admin">Admin</option>
                </select>
                <button className="btn" onClick={()=>{if(confirm("Delete "+u.name+"? Their leads will NOT be deleted."))setUsers(users.filter(x=>x.id!==u.id))}} style={{padding:"8px 12px",fontSize:13,borderRadius:7,background:`${C.red}18`,color:C.red,border:`1px solid ${C.red}44`}}>✕</button>
              </div>
            ):null}
          </div>
        ))}
        {showAdd?(
          <div style={{background:C.bg3,border:`1px solid ${C.blue}55`,borderRadius:10,padding:14,display:"flex",flexDirection:"column",gap:10}}>
            <div style={{fontWeight:600,fontSize:13,color:C.blue}}>NEW USER</div>
            {[["FULL NAME","name","text"],["USERNAME","username","text"],["PASSWORD","password","password"]].map(([l,k,t])=>(
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
        {/* Services & Entities — moved to SETTINGS tab */}
      </div>
    </div>
  );
}

function EditableList({label,items,setItems,color}) {
  const [adding,setAdding]=useState(false);
  const [val,setVal]=useState("");
  const add=()=>{if(val.trim()&&!items.includes(val.trim())){setItems([...items,val.trim()]);setVal("");setAdding(false);}};
  const remove=(i)=>{if(confirm("Remove \""+items[i]+"\"?"))setItems(items.filter((_,j)=>j!==i));};
  return(
    <div style={{marginBottom:14}}>
      <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:10,fontWeight:600,color:C.txt3,letterSpacing:"0.08em",marginBottom:6}}>{label}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>
        {items.map((it,i)=>(
          <span key={i} className="chip" style={{background:`${color}18`,color:color,borderColor:`${color}44`}}>
            {it} <span onClick={()=>remove(i)} style={{marginLeft:4,cursor:"pointer",fontWeight:700}}>×</span>
          </span>
        ))}
      </div>
      {adding?(
        <div style={{display:"flex",gap:6}}>
          <input type="text" value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} className="fi" style={{flex:1,fontSize:12}} placeholder="New item..." autoFocus/>
          <button className="btn" onClick={add} style={{background:`${color}22`,color:color,padding:"8px 14px",fontSize:11,borderRadius:7,border:`1px solid ${color}44`}}>Add</button>
          <button className="btn" onClick={()=>{setAdding(false);setVal("");}} style={{background:C.bg4,color:C.txt3,padding:"8px 10px",fontSize:11,borderRadius:7,border:`1px solid ${C.border}`}}>×</button>
        </div>
      ):(
        <button className="btn" onClick={()=>setAdding(true)} style={{background:"transparent",color:color,padding:"6px 12px",fontSize:11,borderRadius:7,border:`1px dashed ${color}44`}}>+ Add {label.toLowerCase()}</button>
      )}
    </div>
  );
}

// ─── FILTER BAR ──────────────────────────────────────────────────
function FilterBar({filters,setFilters,users,isAdmin,isTeamLead,curId,services,entities}) {
  const [open,setOpen]=useState(false);
  const active=Object.entries(filters).filter(([k,v])=>v&&v!=="All"&&v!==false&&k!=="showLocs").length;
  const Sel=({label,k,opts})=>(
    <div><div className="lbl">{label}</div>
      <select value={filters[k]||"All"} onChange={e=>setFilters({...filters,[k]:e.target.value})} className="fi" style={{fontSize:12}}>
        <option value="All">All</option>
        {opts.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}
      </select>
    </div>
  );
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
        <button className="btn" onClick={()=>setOpen(!open)} style={{background:open||active>0?`${C.blue}22`:C.bg3,color:open||active>0?C.blue2:C.txt3,padding:"6px 11px",fontSize:11,borderRadius:7,border:`1.5px solid ${open||active>0?C.blue:C.border}`,flexShrink:0}}>
          Filters{active>0?` (${active})`:""}
        </button>
        <button className="btn" onClick={()=>setFilters({...filters,myOnly:!filters.myOnly})} style={{background:filters.myOnly?`${C.purple}22`:C.bg3,color:filters.myOnly?C.purple:C.txt3,padding:"6px 11px",fontSize:11,borderRadius:7,border:`1.5px solid ${filters.myOnly?C.purple:C.border}`,flexShrink:0}}>
          {filters.myOnly?"My Leads":"My Leads"}
        </button>
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
        const ul=locs.filter(l=>l.salesId===u.id);
        const won=ul.filter(l=>l.stage==="Closed Won");
        const pipe=ul.filter(l=>l.stage!=="Closed Won"&&l.stage!=="Closed Lost");
        const late=ul.filter(l=>isOD(l.nextAction,l.stage));
        const placed=won.reduce((s,l)=>s+(parseInt(l.workers)||0),0);
        const isE=exp===u.id;
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
                <div style={{padding:"8px 14px 4px",display:"flex",justifyContent:"space-between",alignItems:"center",background:C.bg3}}>
                  <span style={{fontSize:10,color:C.txt3,fontWeight:600,letterSpacing:"0.08em"}}>{ul.length} LOCATION{ul.length!==1?"S":""}</span>
                </div>
                {ul.length===0&&<div style={{padding:"18px",textAlign:"center",color:C.txt3,fontSize:12}}>No locations assigned</div>}
                {ul.map(l=>{
                  const sc=getSC()[l.stage]||C.txt3; const od=isOD(l.nextAction,l.stage);
                  const dl=daysLeft(l.nextAction);
                  return(
                    <div key={l.id} className="row-hover" onClick={()=>onSelect(l)} style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:500,fontSize:13,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.company}</div>
                        <div style={{fontSize:11,color:C.txt3}}>📍 {l.location} · {l.county}</div>
                        <div style={{fontSize:10,color:C.txt3,marginTop:2}}>{l.service||""}{l.workers?" · 👷"+l.workers:""}{l.nextAction?" · "+fmtDate(l.nextAction):""}</div>
                      </div>
                      <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0,marginLeft:8,flexDirection:"column"}}>
                        <span className="pill" style={{background:sc+"22",color:sc,border:`1px solid ${sc}44`}}>{l.stage}</span>
                        <span style={{fontSize:14}}>{l.temp}</span>
                        {od&&<span className="pill" style={{background:`${C.red}18`,color:C.red,border:`1px solid ${C.red}44`}}>⚠</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── HQ DETAIL MODAL ─────────────────────────────────────────────
function HQDetailModal({hq,locs,users,isAdmin,onClose,onEditHQ,onDeleteHQ,onAddLoc,onSelectLoc}) {
  const hqLocs=locs.filter(l=>l.parentId===hq.id);
  const totalW=hqLocs.reduce((s,l)=>s+(parseInt(l.workers)||0),0);
  const stages=[...new Set(hqLocs.map(l=>l.stage))];
  const [showDanger,setShowDanger]=useState(false);
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
        {/* Central contact */}
        <div style={{background:C.bg3,border:`1px solid ${C.border}`,borderLeft:`3px solid ${C.indigo}`,borderRadius:10,padding:13}}>
          <div className="lbl">CENTRAL CONTACT (HQ)</div>
          <div style={{fontWeight:700,fontSize:15,color:C.txt}}>{hq.centralContact||"—"}</div>
          <div style={{fontSize:12,color:C.txt3,marginBottom:10}}>{hq.centralRole||"—"}</div>
          {hq.centralPhone&&<a href={"tel:"+hq.centralPhone} style={{display:"block",background:`${C.blue}18`,border:`1px solid ${C.blue}44`,color:C.blue2,padding:"10px",fontSize:13,fontWeight:600,textAlign:"center",marginBottom:8,textDecoration:"none",borderRadius:8}}>📞 {hq.centralPhone}</a>}
          {hq.centralEmail&&<a href={"mailto:"+hq.centralEmail} style={{display:"block",background:`${C.teal}18`,border:`1px solid ${C.teal}44`,color:C.teal,padding:"10px",fontSize:13,fontWeight:600,textAlign:"center",textDecoration:"none",borderRadius:8,marginBottom:8}}>✉ {hq.centralEmail}</a>}
          {hq.address&&<a href={mapsUrl(hq.address)} target="_blank" rel="noopener" style={{display:"block",background:`${C.green}18`,border:`1px solid ${C.green}44`,color:C.green,padding:"10px",fontSize:13,fontWeight:600,textAlign:"center",textDecoration:"none",borderRadius:8,marginBottom:8}}>📍 {hq.address}</a>}
          {hq.website&&<a href={webUrl(hq.website)} target="_blank" rel="noopener" style={{display:"block",background:`${C.indigo}18`,border:`1px solid ${C.indigo}44`,color:C.indigo,padding:"10px",fontSize:13,fontWeight:600,textAlign:"center",textDecoration:"none",borderRadius:8}}>🌐 {hq.website}</a>}
        </div>
        {/* Summary */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          <div className="kv" style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:700,color:C.blue,fontFamily:"'Space Grotesk',sans-serif"}}>{hqLocs.length}</div><div className="lbl" style={{marginBottom:0}}>Locations</div></div>
          <div className="kv" style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:700,color:C.amber,fontFamily:"'Space Grotesk',sans-serif"}}>{totalW}</div><div className="lbl" style={{marginBottom:0}}>Workers</div></div>
          <div className="kv" style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:700,color:C.green,fontFamily:"'Space Grotesk',sans-serif"}}>{hqLocs.filter(l=>l.stage==="Closed Won").length}</div><div className="lbl" style={{marginBottom:0}}>Won</div></div>
        </div>
        {/* Stage overview */}
        {stages.length>0&&(
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {stages.map(s=>{
              const cnt=hqLocs.filter(l=>l.stage===s).length; const c=getSC()[s]||C.txt3;
              return <span key={s} className="pill" style={{background:c+"22",color:c,border:`1px solid ${c}44`,fontSize:11,padding:"4px 10px"}}>{s} ({cnt})</span>;
            })}
          </div>
        )}
        {hq.notes&&<div style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}><div className="lbl">NOTES</div><div style={{fontSize:13,color:C.txt2,lineHeight:1.7}}>{hq.notes}</div></div>}
        {/* Locations list */}
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:11,fontWeight:600,color:C.txt3,letterSpacing:"0.08em"}}>LOCATIONS / DEALS ({hqLocs.length})</div>
            <button className="btn" onClick={onAddLoc} style={{background:`linear-gradient(135deg,${C.blue},${C.indigo})`,color:"#fff",padding:"6px 12px",fontSize:11,borderRadius:7}}>+ Add Location</button>
          </div>
          {hqLocs.length===0&&<div style={{fontSize:12,color:C.txt3,padding:"14px",background:C.bg3,borderRadius:8,border:`1px dashed ${C.border2}`,textAlign:"center"}}>No locations yet — add the first deal</div>}
          {hqLocs.map(l=>{
            const sc=getSC()[l.stage]||C.txt3; const od=isOD(l.nextAction,l.stage);
            const dl=daysLeft(l.nextAction);
            const uName=users.find(u=>u.id===l.salesId)?.name||"—";
            return(
              <div key={l.id} className="row-hover" onClick={()=>onSelectLoc(l)} style={{background:C.bg3,border:`1px solid ${C.border}`,borderLeft:`3px solid ${sc}`,borderRadius:10,padding:"12px 14px",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <div><div style={{fontWeight:600,fontSize:13,color:C.txt}}>📍 {l.location}</div><div style={{fontSize:11,color:C.txt3,marginTop:2}}>{l.contact} · {l.county} · <span style={{color:C.blue}}>{uName}</span></div></div>
                  <span style={{fontSize:16,flexShrink:0}}>{l.temp}</span>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
                  <span className="pill" style={{background:sc+"22",color:sc,border:`1px solid ${sc}44`}}>{l.stage}</span>
                  {l.service&&<span className="pill" style={{background:`${C.blue}18`,color:C.blue2,border:`1px solid ${C.blue}33`}}>{l.service}</span>}
                  {l.workers&&<span className="pill" style={{background:`${C.amber}18`,color:C.amber,border:`1px solid ${C.amber}33`}}>👷 {l.workers}</span>}
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.txt3}}>
                  {l.address?<span>📍 {l.address.substring(0,30)}{l.address.length>30?"...":""}</span>:<span/>}
                  <span style={{color:od?C.red:(dl!==null&&dl<=3)?C.amber:C.txt3,fontWeight:(od||(dl!==null&&dl<=3))?600:400}}>{od?"⚠ ":""}{fmtDate(l.nextAction)}{(!od&&dl!==null&&dl<=3)?" ("+dl+"d)":""}</span>
                </div>
              </div>
            );
          })}
        </div>
        {/* ARCHIVE — hidden behind More actions */}
        {isAdmin&&(
          <div>
            <button className="btn" onClick={()=>setShowDanger(!showDanger)} style={{width:"100%",background:"transparent",color:C.txt3,padding:"8px",fontSize:10,borderRadius:7,border:`1px dashed ${C.border2}`,letterSpacing:"0.05em"}}>{showDanger?"▲ Hide":"▼ More actions..."}</button>
            {showDanger&&(
              <div style={{marginTop:8,background:`${C.red}08`,border:`1px solid ${C.red}33`,borderRadius:10,padding:12}}>
                <div style={{fontSize:10,color:C.red,fontWeight:600,letterSpacing:"0.08em",marginBottom:8}}>ARCHIVE</div>
                <div style={{fontSize:11,color:C.txt3,marginBottom:10}}>Move this company and all its {hqLocs.length} location(s) to archive. Only Walery can restore or permanently delete.</div>
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
function LocDetailModal({loc,hqs,users,isAdmin,canArchive,canEdit,onClose,onEdit,onArchive,onUpdate}) {
  const hq=hqs.find(h=>h.id===loc.parentId);
  const sc=getSC()[loc.stage]||C.txt3;
  const uN=(id)=>users.find(u=>u.id===id)?.name||"—";
  const [showDanger,setShowDanger]=useState(false);
  return(
    <div className="modal" style={{zIndex:110}}>
      <div className="mh">
        <div style={{flex:1,minWidth:0,paddingRight:10}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
            <span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:16,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{loc.company}</span>
          </div>
          <div style={{fontSize:11,color:C.txt3}}>📍 {loc.location} · {loc.county}{hq?<span style={{color:C.indigo}}> · ↑ {hq.company}</span>:""}</div>
        </div>
        <button className="xb" onClick={onClose}>×</button>
      </div>
      <div className="ms">
        <div style={{display:"flex",gap:8}}>
          <select value={loc.stage} onChange={e=>onUpdate(loc.id,{stage:e.target.value})} className="fi" style={{flex:1,fontSize:13}}>{STAGES.map(s=><option key={s}>{s}</option>)}</select>
          <select value={loc.temp} onChange={e=>onUpdate(loc.id,{temp:e.target.value})} className="fi" style={{width:105,fontSize:13}}>{TEMPS.map(t=><option key={t}>{t}</option>)}</select>
        </div>
        <div style={{background:C.bg3,border:`1px solid ${C.border}`,borderLeft:`3px solid ${sc}`,borderRadius:10,padding:13}}>
          <div className="lbl">LOCAL CONTACT</div>
          <div style={{fontWeight:700,fontSize:15,color:C.txt}}>{loc.contact||"—"}</div>
          <div style={{fontSize:12,color:C.txt3,marginBottom:12}}>{loc.role||"—"}</div>
          {loc.phone&&<a href={"tel:"+loc.phone} style={{display:"block",background:`${C.blue}18`,border:`1px solid ${C.blue}44`,color:C.blue2,padding:"11px",fontSize:13,fontWeight:600,textAlign:"center",marginBottom:8,textDecoration:"none",borderRadius:8}}>📞 {loc.phone}</a>}
          {loc.email&&<a href={"mailto:"+loc.email} style={{display:"block",background:`${C.teal}18`,border:`1px solid ${C.teal}44`,color:C.teal,padding:"11px",fontSize:13,fontWeight:600,textAlign:"center",textDecoration:"none",borderRadius:8,marginBottom:8}}>✉ {loc.email}</a>}
          {loc.address&&<a href={mapsUrl(loc.address)} target="_blank" rel="noopener" style={{display:"block",background:`${C.green}18`,border:`1px solid ${C.green}44`,color:C.green,padding:"11px",fontSize:13,fontWeight:600,textAlign:"center",textDecoration:"none",borderRadius:8}}>📍 {loc.address}</a>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["SERVICE",loc.service||"—"],["ENTITY",loc.companyName||"—"],["WORKERS",loc.workers||"—"],["TYPE",loc.workerType||"—"],["EMPLOYEES",loc.employees||"—"],["SOURCE",loc.source||"—"],["NEXT ACTION",fmtDate(loc.nextAction)],["LAST CONTACT",fmtDate(loc.lastContact)],["SALESPERSON",uN(loc.salesId)],["INDUSTRY",loc.industry||"—"]].map(([l,v])=>(
            <div key={l} className="kv"><div className="lbl">{l}</div><div style={{fontSize:12,color:C.txt,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v}</div></div>
          ))}
        </div>
        {loc.address&&<a href={mapsUrl(loc.address)} target="_blank" rel="noopener" style={{display:"block",background:`${C.green}18`,border:`1px solid ${C.green}44`,color:C.green,padding:"10px",fontSize:12,fontWeight:600,textAlign:"center",textDecoration:"none",borderRadius:8}}>📍 {loc.address}</a>}
        {loc.notes&&<div style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}><div className="lbl">NOTES</div><div style={{fontSize:13,color:C.txt2,lineHeight:1.7}}>{loc.notes}</div></div>}
        {/* SPIN Notes */}
        {(loc.spin?.s||loc.spin?.p||loc.spin?.i||loc.spin?.n)&&(
          <div style={{background:C.bg3,border:`1px solid ${C.indigo}44`,borderRadius:10,padding:12}}>
            <div className="lbl" style={{color:C.indigo}}>SPIN DISCOVERY</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:6}}>
              {[["S",loc.spin?.s,"Situation"],["P",loc.spin?.p,"Problem"],["I",loc.spin?.i,"Implication"],["N",loc.spin?.n,"Need-Payoff"]].map(([l,v,desc])=>v?(
                <div key={l} style={{background:C.bg4,borderRadius:8,padding:"8px 10px"}}><div style={{fontSize:10,fontWeight:700,color:C.indigo,marginBottom:3}}>{l} — {desc}</div><div style={{fontSize:12,color:C.txt2,lineHeight:1.5}}>{v}</div></div>
              ):null)}
            </div>
          </div>
        )}
        {/* Activity Log */}
        <ActivityLog loc={loc} onUpdate={onUpdate}/>
        {hq&&<div style={{background:C.bg3,border:`1px solid ${C.indigo}44`,borderRadius:10,padding:12,cursor:"pointer"}} onClick={onClose}><div className="lbl">PARENT COMPANY</div><div style={{fontWeight:600,fontSize:13,color:C.indigo}}>🏢 {hq.company}</div><div style={{fontSize:11,color:C.txt3,marginTop:2}}>{hq.centralContact} · {hq.industry}</div></div>}
        {/* DANGER ZONE - archive */}
        {canArchive&&(
          <div>
            <button className="btn" onClick={()=>setShowDanger(!showDanger)} style={{width:"100%",background:"transparent",color:C.txt3,padding:"8px",fontSize:10,borderRadius:7,border:`1px dashed ${C.border2}`,letterSpacing:"0.05em"}}>{showDanger?"▲ Hide":"▼ More actions..."}</button>
            {showDanger&&(
              <div style={{marginTop:8,background:`${C.red}08`,border:`1px solid ${C.red}33`,borderRadius:10,padding:12}}>
                <div style={{fontSize:10,color:C.red,fontWeight:600,letterSpacing:"0.08em",marginBottom:8}}>ARCHIVE</div>
                <div style={{fontSize:11,color:C.txt3,marginBottom:10}}>Move this location to archive. Only Walery can restore or permanently delete.</div>
                <button className="btn" onClick={onArchive} style={{width:"100%",background:`${C.red}18`,color:C.red,padding:"10px",fontSize:12,borderRadius:8,border:`1px solid ${C.red}44`}}>📦 Archive this location</button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mf">
        {canEdit?<button className="btn" onClick={onEdit} style={{width:"100%",background:`linear-gradient(135deg,${C.blue},${C.indigo})`,color:"#fff",padding:"13px",fontSize:14,borderRadius:10}}>✎ Edit</button>
        :<div style={{padding:"13px",fontSize:12,color:C.txt3,textAlign:"center"}}>View only</div>}
      </div>
    </div>
  );
}

// ─── ACTIVITY LOG COMPONENT ─────────────────────────────────────
function ActivityLog({loc,onUpdate}) {
  const [show,setShow]=useState(false);
  const [note,setNote]=useState("");
  const [type,setType]=useState("Call");
  const TYPES=["Call","Email","Meeting","LinkedIn","SMS","Note"];
  const add=()=>{
    if(!note.trim())return;
    const act={id:Date.now(),type,note:note.trim(),date:new Date().toISOString().slice(0,10),time:new Date().toTimeString().slice(0,5)};
    const updated=[act,...(loc.activities||[])];
    onUpdate(loc.id,{activities:updated,lastContact:act.date});
    setNote("");
  };
  const acts=loc.activities||[];
  return(
    <div style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:show||acts.length>0?10:0}}>
        <div className="lbl" style={{marginBottom:0}}>ACTIVITY LOG ({acts.length})</div>
        <button className="btn" onClick={()=>setShow(!show)} style={{background:`${C.blue}22`,color:C.blue2,padding:"4px 10px",fontSize:10,borderRadius:6,border:`1px solid ${C.blue}44`}}>{show?"Cancel":"+ Add"}</button>
      </div>
      {show&&(
        <div style={{marginBottom:10}}>
          <div style={{display:"flex",gap:6,marginBottom:6}}>
            {TYPES.map(t=>(
              <button key={t} className="btn" onClick={()=>setType(t)} style={{padding:"4px 8px",fontSize:10,borderRadius:6,background:type===t?`${C.blue}22`:C.bg4,color:type===t?C.blue2:C.txt3,border:`1px solid ${type===t?C.blue+"44":C.border}`}}>{t}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:6}}>
            <input value={note} onChange={e=>setNote(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} className="fi" style={{flex:1,fontSize:12}} placeholder="What happened?"/>
            <button className="btn" onClick={add} style={{background:`linear-gradient(135deg,${C.blue},${C.indigo})`,color:"#fff",padding:"8px 14px",fontSize:11,borderRadius:8,flexShrink:0}}>Save</button>
          </div>
        </div>
      )}
      {acts.slice(0,10).map(a=>(
        <div key={a.id} style={{padding:"7px 0",borderTop:`1px solid ${C.border}`,display:"flex",gap:8,alignItems:"flex-start"}}>
          <div style={{fontSize:10,color:C.txt3,minWidth:55,flexShrink:0}}>{a.date?.slice(5)} {a.time}</div>
          <span className="pill" style={{background:`${C.blue}18`,color:C.blue2,border:`1px solid ${C.blue}33`,flexShrink:0}}>{a.type}</span>
          <div style={{fontSize:12,color:C.txt2,lineHeight:1.4}}>{a.note}</div>
        </div>
      ))}
      {acts.length>10&&<div style={{fontSize:11,color:C.txt3,padding:"6px 0",textAlign:"center"}}>+{acts.length-10} more</div>}
      {acts.length===0&&!show&&<div style={{fontSize:11,color:C.txt3,fontStyle:"italic",padding:"4px 0"}}>No activities recorded yet</div>}
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
        {/* Company selection */}
        {!editMode&&(
          <div style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
            <div className="lbl">COMPANY</div>
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              <button className="btn" onClick={()=>{setNewCo(false);}} style={{flex:1,padding:"8px",fontSize:12,borderRadius:7,background:!newCo?`${C.blue}22`:C.bg4,color:!newCo?C.blue2:C.txt3,border:`1.5px solid ${!newCo?C.blue:C.border}`}}>Existing Company</button>
              <button className="btn" onClick={()=>{setNewCo(true);setForm({...form,parentId:null,company:""});}} style={{flex:1,padding:"8px",fontSize:12,borderRadius:7,background:newCo?`${C.green}22`:C.bg4,color:newCo?C.green:C.txt3,border:`1.5px solid ${newCo?C.green:C.border}`}}>+ New Company</button>
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
                <div><div className="lbl">CENTRAL CONTACT (HQ)</div><input type="text" value={newHQ.centralContact} onChange={e=>setNewHQ({...newHQ,centralContact:e.target.value})} className="fi" placeholder="Main decision maker"/></div>
                <div><div className="lbl">HQ ADDRESS</div><input type="text" value={newHQ.address||""} onChange={e=>setNewHQ({...newHQ,address:e.target.value})} className="fi" placeholder="Street, City"/></div>
                <div><div className="lbl">WEBSITE</div><input type="text" value={newHQ.website||""} onChange={e=>setNewHQ({...newHQ,website:e.target.value})} className="fi" placeholder="www.company.com"/></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div><div className="lbl">HQ PHONE</div><input type="tel" value={newHQ.centralPhone} onChange={e=>setNewHQ({...newHQ,centralPhone:e.target.value})} className="fi"/></div>
                  <div><div className="lbl">HQ EMAIL</div><input type="email" value={newHQ.centralEmail} onChange={e=>setNewHQ({...newHQ,centralEmail:e.target.value})} className="fi"/></div>
                </div>
              </div>
            )}
          </div>
        )}
        <div style={{height:1,background:C.border}}/>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:11,fontWeight:600,color:C.txt3,letterSpacing:"0.08em"}}>LOCATION DETAILS</div>
        <div><div className="lbl">LOCATION NAME *</div><input type="text" value={form.location} onChange={e=>setForm({...form,location:e.target.value})} className="fi" placeholder="e.g. Plant Cluj, Warehouse North"/></div>
        <div><div className="lbl">ADDRESS</div><input type="text" value={form.address||""} onChange={e=>setForm({...form,address:e.target.value})} className="fi" placeholder="Street, City, County"/></div>
        <div><div className="lbl">LOCAL CONTACT</div><input type="text" value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} className="fi" placeholder="Name of person who orders"/></div>
        <div><div className="lbl">CONTACT ROLE</div><select value={form.role} onChange={e=>setForm({...form,role:e.target.value})} className="fi"><option value="">— select —</option>{["HR Director","HR Manager","Plant Manager","Production Manager","Operations Director","Operations Manager","General Manager","Owner","CEO","COO","Logistics Manager","Procurement Manager","Other"].map(r=><option key={r}>{r}</option>)}</select></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><div className="lbl">PHONE</div><input type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="fi"/></div>
          <div><div className="lbl">EMAIL</div><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="fi"/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><div className="lbl">COUNTY</div><select value={form.county} onChange={e=>setForm({...form,county:e.target.value})} className="fi"><option value="">— select —</option>{COUNTIES.map(o=><option key={o}>{o}</option>)}</select></div>
          <div><div className="lbl">EMPLOYEES (at location)</div><input type="number" value={form.employees} onChange={e=>setForm({...form,employees:e.target.value})} className="fi"/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><div className="lbl">WORKERS NEEDED</div><input type="number" value={form.workers} onChange={e=>setForm({...form,workers:e.target.value})} className="fi"/></div>
          <div><div className="lbl">WORKER TYPE</div><select value={form.workerType||""} onChange={e=>setForm({...form,workerType:e.target.value})} className="fi"><option value="">— select —</option>{WORKER_TYPES.map(w=><option key={w}>{w}</option>)}</select></div>
          <div><div className="lbl">INDUSTRY</div><select value={form.industry} onChange={e=>setForm({...form,industry:e.target.value})} className="fi"><option value="">— select —</option>{INDUSTRIES.map(o=><option key={o}>{o}</option>)}</select></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><div className="lbl">STAGE</div><select value={form.stage} onChange={e=>setForm({...form,stage:e.target.value})} className="fi">{STAGES.map(o=><option key={o}>{o}</option>)}</select></div>
          <div><div className="lbl">TEMPERATURE</div><select value={form.temp} onChange={e=>setForm({...form,temp:e.target.value})} className="fi">{TEMPS.map(o=><option key={o}>{o}</option>)}</select></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><div className="lbl">NEXT ACTION</div><input type="date" value={form.nextAction} onChange={e=>setForm({...form,nextAction:e.target.value})} className="fi"/></div>
          <div><div className="lbl">LAST CONTACT</div><input type="date" value={form.lastContact} onChange={e=>setForm({...form,lastContact:e.target.value})} className="fi"/></div>
        </div>
        {[["SOURCE","source",SOURCES],["SERVICE","service",services],["GREMI ENTITY","companyName",entities]].map(([l,k,opts])=>(
          <div key={k}><div className="lbl">{l}</div><select value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} className="fi"><option value="">— select —</option>{opts.map(o=><option key={o}>{o}</option>)}</select></div>
        ))}
        {isAdmin&&<div><div className="lbl">SALESPERSON</div><select value={form.salesId||""} onChange={e=>setForm({...form,salesId:Number(e.target.value)})} className="fi"><option value="">— select —</option>{users.filter(u=>u.active).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></div>}
        <div style={{background:C.bg3,border:`1px solid ${C.indigo}44`,borderRadius:10,padding:12}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:10,fontWeight:600,color:C.indigo,letterSpacing:"0.08em",marginBottom:8}}>SPIN DISCOVERY NOTES</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div><div className="lbl">S — SITUATION</div><textarea value={form.spin?.s||""} onChange={e=>setForm({...form,spin:{...form.spin,s:e.target.value}})} rows={2} className="fi" style={{resize:"vertical",fontSize:12}} placeholder="Current staffing, suppliers, headcount..."/></div>
            <div><div className="lbl">P — PROBLEM</div><textarea value={form.spin?.p||""} onChange={e=>setForm({...form,spin:{...form.spin,p:e.target.value}})} rows={2} className="fi" style={{resize:"vertical",fontSize:12}} placeholder="Turnover, delays, compliance issues..."/></div>
            <div><div className="lbl">I — IMPLICATION</div><textarea value={form.spin?.i||""} onChange={e=>setForm({...form,spin:{...form.spin,i:e.target.value}})} rows={2} className="fi" style={{resize:"vertical",fontSize:12}} placeholder="Cost of downtime, lost orders..."/></div>
            <div><div className="lbl">N — NEED-PAYOFF</div><textarea value={form.spin?.n||""} onChange={e=>setForm({...form,spin:{...form.spin,n:e.target.value}})} rows={2} className="fi" style={{resize:"vertical",fontSize:12}} placeholder="What solving this means for them..."/></div>
          </div>
        </div>
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
        <div><div className="lbl">CENTRAL CONTACT</div><input type="text" value={form.centralContact} onChange={e=>setForm({...form,centralContact:e.target.value})} className="fi"/></div>
        <div><div className="lbl">CENTRAL ROLE</div><select value={form.centralRole} onChange={e=>setForm({...form,centralRole:e.target.value})} className="fi"><option value="">— select —</option>{["HR Director","HR Manager","Plant Manager","Production Manager","Operations Director","Operations Manager","General Manager","Owner","CEO","COO","Logistics Manager","Procurement Manager","Other"].map(r=><option key={r}>{r}</option>)}</select></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><div className="lbl">HQ PHONE</div><input type="tel" value={form.centralPhone} onChange={e=>setForm({...form,centralPhone:e.target.value})} className="fi"/></div>
          <div><div className="lbl">HQ EMAIL</div><input type="email" value={form.centralEmail} onChange={e=>setForm({...form,centralEmail:e.target.value})} className="fi"/></div>
        </div>
        <div><div className="lbl">NOTES</div><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={3} className="fi" style={{resize:"vertical",lineHeight:1.7}}/></div>
      </div>
      <div className="mf"><button className="btn" onClick={onSave} style={{width:"100%",background:`linear-gradient(135deg,${C.blue},${C.indigo})`,color:"#fff",padding:"14px",fontSize:15,borderRadius:10}}>Save</button></div>
    </div>
  );
}

// ─── TEMPLATES TAB ──────────────────────────────────────────────
const TPL_DATA = {
  ro: [
    {cat:"Initiere Contact",title:"Email — Introducere Generala",text:`Stimate [NUME],\n\nSunt Walery, directorul operatiunilor Gremi Personal in Romania. Coordonez proiectele noastre de personal operational pe piata romaneasca.\n\nMotivul pentru care va scriu: lucram cu mai multi producatori din [INDUSTRIE] in [JUDET], iar profilul [COMPANIE] este foarte aproape de tipul de parteneriate pe care le dezvoltam.\n\nAs fi interesat sa aflu cum arata prioritatile dvs legate de resurse umane in aceasta perioada. Poate gasim un punct comun.\n\nSunt disponibil pentru o discutie, la un moment care va convine.\n\nCu stima,\n[SEMNATURA]`},
    {cat:"Initiere Contact",title:"Email — Lucratori Ucraineni",text:`Stimate [NUME],\n\nMa numesc Walery si conduc operatiunile Gremi Personal in Romania. Va contactez direct deoarece consider ca o discutie intre noi ar putea fi relevanta.\n\nIn acest moment gestionam plasarea de personal ucrainean in unitati de productie din Romania — sub protectia temporara UE, cu termene de 2-4 saptamani si fara proceduri de viza. Suntem angajatorul oficial.\n\nDaca tema resurselor umane este actuala pentru [COMPANIE], as aprecia posibilitatea unei discutii directe.\n\nCu stima,\n[SEMNATURA]`},
    {cat:"Initiere Contact",title:"Email — Personal din Asia",text:`Stimate [NUME],\n\nSunt Walery, directorul Gremi Personal Romania. Gestionez proiecte de personal international — in particular din India, Nepal si Sri Lanka — pentru companiile care au nevoie de stabilitate pe termen lung.\n\nContractele de 12-24 luni cu personal asiatic ofera o retentie de peste 95%, ceea ce pentru multe companii din [INDUSTRIE] reprezinta o alternativa concreta la rotatia continua.\n\nProcesul dureaza 4-6 luni, dar planificat din timp, rezultatele sunt excelente.\n\nDaca acest tip de resursa este de interes, as fi bucuros sa discutam.\n\nCu stima,\n[SEMNATURA]`},
    {cat:"Initiere Contact",title:"LinkedIn — Peer-to-Peer",text:`[NUME], buna ziua.\n\nSunt Walery, conduc operatiunile Gremi Personal in Romania. Am observat ca [COMPANIE] este activa in [JUDET] — lucram cu companii din acelasi sector.\n\nNu este un mesaj de vanzare — sunt interesat de un schimb de perspectiva referitor la piata fortei de munca din zona.\n\nSunteti deschis pentru o discutie?`},
    {cat:"Initiere Contact",title:"LinkedIn — Cu Referinta de Piata",text:`[NUME], buna ziua.\n\nConduc operatiunile de personal ale Gremi Personal in Romania. In ultimele luni, in discutiile cu producatorii din [INDUSTRIE], am observat o tema recurenta — dificultatea de a mentine echipele complete.\n\nDaca si [COMPANIE] intampina aceasta provocare, cred ca merita o discutie. Avem cateva solutii care functioneaza bine in practica.\n\nCe parere aveti?`},
    {cat:"Initiere Contact",title:"Apel Telefonic — Director",text:`DESCHIDERE:\nBuna ziua, sunt Walery de la Gremi Personal, sunt directorul operatiunilor noastre in Romania. As vrea sa vorbesc cu dl/dna [NUME], daca este disponibil.\n\n[Daca gatekeeper: Nu sun pentru o oferta comerciala. Am observat ca [COMPANIE] are operatiuni in [JUDET] si as vrea sa discut direct cu dl/dna [NUME] despre o posibila colaborare.]\n\nCAND CONECTAT:\nBuna ziua [NUME], sunt Walery, directorul Gremi Personal Romania. Va sun pentru ca lucram cu mai multi producatori din [JUDET] si am vrut sa vad daca are sens o discutie intre noi.\n\nNoi furnizam personal operational — ucraineni si asiatici — pentru productie si logistica. Dar inainte de orice, as vrea sa inteleg cum arata situatia la dvs. Aveti un minut?\n\n[ASCULTA. Nu intrerupe.]\n\nDACA EXISTA INTERES:\nPerfect. Cred ca merita sa discutam mai in detaliu. Cand ar fi convenabil — saptamana aceasta sau viitoare?\n\nDACA NU ACUM:\nInteleg perfect. Va las coordonatele mele. Cand tema devine actuala, ma puteti contacta direct.\n\nINCHEIERE:\nMultumesc pentru timp, [NUME]. O zi buna.`},
    {cat:"Follow-up",title:"Follow-up — Dupa 3 Zile",text:`Stimate [NUME],\n\nRevin cu un mesaj scurt. Am incercat sa va contactez zilele trecute referitor la o posibila colaborare pe zona de personal operational.\n\nPe scurt: Gremi Personal furnizeaza personal ucrainean (termen 2-4 saptamani) si asiatic (4-6 luni) pentru industria [INDUSTRIE] in Romania. Suntem angajatorul oficial.\n\nDaca tema este de interes, raman disponibil pentru o discutie.\n\nCu stima,\n[SEMNATURA]`},
    {cat:"Follow-up",title:"Follow-up — Dupa Intalnire",text:`Stimate [NUME],\n\nVa multumesc pentru discutia de azi. A fost un schimb valoros de informatii.\n\nConform celor convenite, atasez oferta orientativa si o prezentare scurta a modului nostru de lucru.\n\nUrmatorul pas, din punctul meu de vedere, ar fi o discutie de detaliu saptamana viitoare. Care zi ar fi potrivita pentru dvs?\n\nCu stima,\n[SEMNATURA]`},
    {cat:"Follow-up",title:"Follow-up — Ultima Incercare",text:`Stimate [NUME],\n\nAm revenit de cateva ori fara succes. Inteleg ca agenda dvs este plina si nu vreau sa fiu inoportun.\n\nO singura intrebare: anticipati vreo nevoie de personal operational in urmatoarele 6 luni?\n\nDaca da — sunt la dispozitie oricand. Daca nu — va multumesc pentru atentie si va doresc mult succes.\n\nCu stima,\n[SEMNATURA]`},
    {cat:"Propunere de Valoare",title:"Lucratori Ucraineni",text:`Personal ucrainean disponibil in 2-4 saptamani — sub protectie temporara UE, fara proceduri de viza.\n\nGremi Personal este angajatorul oficial. Gestionam integral: contracte de munca, salarizare, contributii, conformitate ITM. Clientul primeste personal operativ fara responsabilitati administrative.\n\nGarantii: inlocuire fara costuri suplimentare, monitorizare continua, un singur punct de contact.\n\nProtectie temporara extinsa pana in martie 2027.`},
    {cat:"Propunere de Valoare",title:"Personal din Asia",text:`Rotatia ridicata (30-40%) genereaza costuri repetate de recrutare, training si pierdere de productivitate.\n\nPersonal din India, Nepal, Sri Lanka pe contracte de 12-24 luni. Retentie: peste 95%.\n\nNoi gestionam totul: recrutare, documentatie, permis de sedere, transport, cazare, salarizare.\nTermen: 4-6 luni de la confirmare.\n\nCost total anual mai redus decat rotatia continua. Echipa stabila si previzibila.`},
    {cat:"Propunere de Valoare",title:"De Ce Gremi",text:`1. Continuitate — ne cunoasteti deja din Polonia. Nu incepem de la zero.\n2. Standarde europene — compliance, documentatie, raportare la nivel UE.\n3. Experienta — mii de lucratori ucraineni recrutati in Polonia.\n4. Un singur interlocutor — eu personal coordonez totul.\n5. Noi suntem angajatorul oficial — ITM se adreseaza noua, nu dvs.`},
    {cat:"SPIN Selling",title:"Intrebari SPIN — Staffing",text:`S — SITUATION:\n— Cati angajati aveti la aceasta locatie? Cate schimburi?\n— Colaborati cu un furnizor de personal temporar?\n— Cate pozitii sunt deschise in acest moment?\n\nP — PROBLEM:\n— Cat dureaza sa ocupati o pozitie vacanta?\n— Care este rata de rotatie?\n— Ati intampinat dificultati cu ITM?\n\nI — IMPLICATION:\n— Ce impact are lipsa de personal asupra termenelor de livrare?\n— Cat estimati ca va costa o zi de intarziere?\n— Ce se intampla cu comenzile cand nu aveti capacitate completa?\n\nN — NEED-PAYOFF:\n— Daca am putea asigura [X] lucratori in 3 saptamani, cum ar schimba situatia?\n— Ce ar insemna pentru operatiuni sa aveti echipa completa permanent?\n— Ar fi util un partener care gestioneaza tot — de la contract pana la salarizare?`},
    {cat:"Raspuns la Obiectii",title:"Avem Deja Furnizor",text:`Inteleg, si nu sugerez o inlocuire. Multi dintre partenerii nostri lucreaza cu mai multi furnizori — tocmai pentru siguranta operationala.\n\nIntrebarea pe care v-o adresez: ce se intampla cand furnizorul actual nu poate acoperi un volum neasteptat?\n\nDin experienta noastra, un proiect pilot de 5-10 lucratori, fara angajament pe termen lung, este cel mai simplu mod de a evalua calitatea colaborarii.`},
    {cat:"Raspuns la Obiectii",title:"Costul Este Ridicat",text:`Inteleg preocuparea si o respect. Permiteti-mi o comparatie obiectiva:\n\nAngajarea directa implica: salariu, contributii, costuri de recrutare, administrare HR, cazare, plus riscul de plecare si costurile de rotatie.\n\nTariful nostru all-inclusive include toate aceste elemente. Diferenta de pret acopera: conformitate 100%, inlocuire inclusa, si zero costuri administrative.\n\nSunt disponibil sa pregatim o simulare pe cifrele dvs concrete — asa putem compara obiectiv.`},
    {cat:"Raspuns la Obiectii",title:"Bariera Lingvistica",text:`Este o preocupare pe care o aud frecvent si este perfect justificata.\n\nIn practica: selectam candidati cu cunostinte de baza de romana sau engleza. Pentru grupe de 15+ lucratori asiguram un team leader bilingv. Instructiunile de securitate sunt intotdeauna traduse si vizualizate.\n\nExperienta noastra din Polonia, cu mii de lucratori plasati, confirma ca dupa prima luna comunicarea nu mai reprezinta o problema.`},
    {cat:"Raspuns la Obiectii",title:"Nu Acum",text:`Inteleg perfect. O singura observatie: procesul de pregatire dureaza 2-4 saptamani pentru ucraineni si 4-6 luni pentru asiatici. Companiile care planifica din timp au personal disponibil exact cand au nevoie.\n\nVa las coordonatele mele. Cand tema devine actuala, ma puteti contacta direct. Intre timp, va trimit un scurt material informativ.`},
    {cat:"Raspuns la Obiectii",title:"De Ce Nu Angajam Direct",text:`O intrebare foarte buna. Raspunsul depinde de context.\n\nAngajarea directa are sens pentru pozitii putine, pe termen nedeterminat, cu resurse HR interne.\n\nExternalizarea are sens cand: aveti nevoie rapida de volum, doriti flexibilitate, sau nu doriti sa gestionati riscul legal si administrativ.\n\nMulti dintre partenerii nostri au inceput cu externalizare si au trecut la angajare directa pentru performerii de top. Sustinem si acest model.`},
  ],
  en: [
    {cat:"Initial Contact",title:"Email — General Introduction",text:`Dear [NAME],\n\nMy name is Walery, I am the director of Gremi Personal operations in Romania. I oversee our operational staffing projects on the Romanian market.\n\nThe reason I am reaching out: we work with several manufacturers in [INDUSTRY] in [COUNTY], and the profile of [COMPANY] is very close to the type of partnerships we develop.\n\nI would be interested to learn about your current priorities regarding human resources. Perhaps we can find common ground.\n\nI am available for a conversation at a time that suits you.\n\nBest regards,\n[SIGNATURE]`},
    {cat:"Initial Contact",title:"Email — Ukrainian Workers",text:`Dear [NAME],\n\nMy name is Walery, I manage Gremi Personal operations in Romania. I am reaching out directly because I believe a conversation between us could be relevant.\n\nWe currently manage the placement of Ukrainian workers in production facilities across Romania — under EU temporary protection, with 2-4 week timelines and no visa procedures. We are the official employer.\n\nIf human resources is a current topic for [COMPANY], I would appreciate the opportunity for a direct discussion.\n\nBest regards,\n[SIGNATURE]`},
    {cat:"Initial Contact",title:"Email — Asian Workers",text:`Dear [NAME],\n\nMy name is Walery, director of Gremi Personal Romania. I manage international staffing projects — specifically from India, Nepal and Sri Lanka — for companies that need long-term workforce stability.\n\n12-24 month contracts with Asian workers offer over 95% retention, which for many companies in [INDUSTRY] represents a concrete alternative to continuous turnover.\n\nThe process takes 4-6 months, but when planned in advance, the results are excellent.\n\nIf this type of resource is of interest, I would be glad to discuss.\n\nBest regards,\n[SIGNATURE]`},
    {cat:"Initial Contact",title:"LinkedIn — Peer-to-Peer",text:`[NAME], good afternoon.\n\nI am Walery, I run Gremi Personal operations in Romania. I noticed [COMPANY] is active in [COUNTY] — we work with companies in the same sector.\n\nThis is not a sales message — I am interested in an exchange of perspective regarding the labor market in the area.\n\nWould you be open to a conversation?`},
    {cat:"Initial Contact",title:"LinkedIn — Market Context",text:`[NAME], good afternoon.\n\nI manage Gremi Personal staffing operations in Romania. In recent months, in conversations with manufacturers in [INDUSTRY], I have noticed a recurring theme — the difficulty of maintaining full teams.\n\nIf [COMPANY] faces this challenge as well, I believe a conversation would be worthwhile. We have some solutions that work well in practice.\n\nWhat do you think?`},
    {cat:"Initial Contact",title:"Phone Call — Director Level",text:`OPENING:\nGood afternoon, this is Walery from Gremi Personal, I am the director of our operations in Romania. I would like to speak with [NAME] if available.\n\n[If gatekeeper: I am not calling with a commercial offer. I noticed [COMPANY] has operations in [COUNTY] and I would like to discuss a potential collaboration directly with [NAME].]\n\nWHEN CONNECTED:\nGood afternoon [NAME], this is Walery, director of Gremi Personal Romania. I am calling because we work with several manufacturers in [COUNTY] and I wanted to see if a conversation between us makes sense.\n\nWe supply operational staff — Ukrainian and Asian — for production and logistics. But before anything, I would like to understand your situation. Do you have a minute?\n\n[LISTEN. Do not interrupt.]\n\nIF INTEREST:\nGood. I think it is worth discussing in more detail. When would be convenient — this week or next?\n\nIF NOT NOW:\nI completely understand. I will leave you my details. When the topic becomes relevant, you can contact me directly.\n\nCLOSING:\nThank you for your time, [NAME]. Have a good day.`},
    {cat:"Follow-up",title:"Follow-up — After 3 Days",text:`Dear [NAME],\n\nA brief follow-up. I tried to reach you recently regarding a potential collaboration in operational staffing.\n\nIn short: Gremi Personal supplies Ukrainian workers (2-4 weeks) and Asian workers (4-6 months) for [INDUSTRY] in Romania. We are the official employer.\n\nIf the topic is of interest, I remain available for a discussion.\n\nBest regards,\n[SIGNATURE]`},
    {cat:"Follow-up",title:"Follow-up — After Meeting",text:`Dear [NAME],\n\nThank you for the conversation today. It was a valuable exchange.\n\nAs agreed, I am attaching the indicative offer and a brief overview of our working model.\n\nThe next step, from my perspective, would be a detailed discussion next week. Which day would work best for you?\n\nBest regards,\n[SIGNATURE]`},
    {cat:"Follow-up",title:"Follow-up — Final Attempt",text:`Dear [NAME],\n\nI have reached out a few times without success. I understand your schedule is full and I do not wish to be intrusive.\n\nOne question: do you anticipate any need for operational staff in the next 6 months?\n\nIf yes — I am at your disposal anytime. If not — thank you for your attention and I wish you every success.\n\nBest regards,\n[SIGNATURE]`},
    {cat:"Value Proposition",title:"Ukrainian Workers",text:`Ukrainian staff available within 2-4 weeks — under EU temporary protection, no visa procedures.\n\nGremi Personal is the official employer. We manage everything: employment contracts, payroll, contributions, ITM compliance. The client receives operational staff with zero administrative responsibility.\n\nGuarantees: replacement at no additional cost, continuous monitoring, single point of contact.\n\nTemporary protection extended until March 2027.`},
    {cat:"Value Proposition",title:"Asian Workers",text:`High turnover (30-40%) generates repeated costs in recruitment, training and lost productivity.\n\nStaff from India, Nepal, Sri Lanka on 12-24 month contracts. Retention: above 95%.\n\nWe manage everything: recruitment, documentation, residence permits, transport, housing, payroll.\nTimeline: 4-6 months from confirmation.\n\nLower total annual cost than continuous turnover. A stable, predictable team.`},
    {cat:"Value Proposition",title:"Why Gremi",text:`1. Continuity — you already know us from Poland. No starting from scratch.\n2. European standards — compliance, documentation, reporting at EU level.\n3. Experience — thousands of Ukrainian workers recruited in Poland.\n4. Single point of contact — I personally oversee everything.\n5. We are the official employer — ITM comes to us, not to you.`},
    {cat:"SPIN Selling",title:"SPIN Questions — Staffing",text:`S — SITUATION:\n— How many employees at this location? How many shifts?\n— Do you work with a temporary staffing supplier?\n— How many positions are currently open?\n\nP — PROBLEM:\n— How long does it take to fill a vacancy?\n— What is the turnover rate?\n— Have you experienced ITM difficulties?\n\nI — IMPLICATION:\n— What impact does understaffing have on delivery timelines?\n— What would you estimate one day of delay costs?\n— What happens with orders when you are not at full capacity?\n\nN — NEED-PAYOFF:\n— If we could provide [X] workers within 3 weeks, how would that change things?\n— What would it mean for operations to have a full team permanently?\n— Would it help to have a partner managing everything — from contracts to payroll?`},
    {cat:"Objection Response",title:"We Have a Supplier",text:`I understand, and I am not suggesting a replacement. Many of our partners work with multiple suppliers — precisely for operational security.\n\nThe question I would ask: what happens when the current supplier cannot cover unexpected volume?\n\nFrom our experience, a pilot project of 5-10 workers, with no long-term commitment, is the simplest way to evaluate collaboration quality.`},
    {cat:"Objection Response",title:"Cost Is High",text:`I understand the concern and I respect it. Allow me an objective comparison:\n\nDirect hiring involves: salary, contributions, recruitment costs, HR administration, housing, plus departure risk and turnover costs.\n\nOur all-inclusive rate covers all these elements. The price difference covers: 100% compliance, replacement included, and zero administrative costs.\n\nI am available to prepare a simulation on your actual numbers — so we can compare objectively.`},
    {cat:"Objection Response",title:"Language Barrier",text:`This is a concern I hear frequently and it is perfectly justified.\n\nIn practice: we select candidates with basic Romanian or English. For groups of 15+ workers we provide a bilingual team leader. Safety instructions are always translated and visualized.\n\nOur experience in Poland, with thousands of workers placed, confirms that after the first month communication is no longer an issue.`},
    {cat:"Objection Response",title:"Not Now",text:`I completely understand. One observation: the preparation process takes 2-4 weeks for Ukrainians and 4-6 months for Asians. Companies that plan ahead have staff available exactly when needed.\n\nI will leave you my details. When the topic becomes current, you can contact me directly. In the meantime, I will send a brief informational document.`},
    {cat:"Objection Response",title:"Why Not Hire Directly",text:`A very good question. The answer depends on context.\n\nDirect hiring makes sense for few positions, indefinite term, with internal HR resources.\n\nOutsourcing makes sense when: you need volume quickly, want flexibility, or prefer not to manage legal and administrative risk.\n\nMany of our partners started with outsourcing and transitioned to direct hiring for top performers. We support this model as well.`},
  ],
  pl: [
    {cat:"Inicjacja Kontaktu",title:"Email — Wprowadzenie Ogolne",text:`Szanowny [IMIE],\n\nNazywam sie Walery, jestem dyrektorem operacji Gremi Personal w Rumunii. Koordynuje nasze projekty personalne na rynku rumunskim.\n\nPowod kontaktu: wspolpracujemy z kilkoma producentami z branzy [BRANZA] w [REGION], a profil [FIRMA] jest bardzo bliski typowi partnerstw, ktore rozwijamy.\n\nChcialbym poznac Panstwa obecne priorytety w zakresie zasobow ludzkich. Moze znajdziemy wspolny punkt.\n\nJestem dostepny na rozmowe w dogodnym dla Panstwa terminie.\n\nZ powazaniem,\n[PODPIS]`},
    {cat:"Inicjacja Kontaktu",title:"Email — Pracownicy Ukrainscy",text:`Szanowny [IMIE],\n\nNazywam sie Walery i kieruje operacjami Gremi Personal w Rumunii. Kontaktuje sie bezposrednio, poniewaz uwazam ze rozmowa miedzy nami moglaby byc istotna.\n\nObecnie zarzadzamy zatrudnianiem pracownikow ukrainskich w zakladach produkcyjnych w Rumunii — w ramach ochrony tymczasowej UE, z terminami 2-4 tygodnie i bez procedur wizowych. Jestesmy oficjalnym pracodawca.\n\nJesli temat zasobow ludzkich jest aktualny dla [FIRMA], bylbym wdzieczny za mozliwosc bezposredniej rozmowy.\n\nZ powazaniem,\n[PODPIS]`},
    {cat:"Inicjacja Kontaktu",title:"Email — Personal z Azji",text:`Szanowny [IMIE],\n\nNazywam sie Walery, jestem dyrektorem Gremi Personal Rumunia. Zarzadzam projektami personalnymi z Indii, Nepalu i Sri Lanki — dla firm potrzebujacych dlugoterminowej stabilnosci.\n\nKontrakty 12-24 miesiace z personalem azjatyckim oferuja retencje ponad 95%, co dla wielu firm z branzy [BRANZA] stanowi konkretna alternatywe dla ciaglej rotacji.\n\nProces trwa 4-6 miesiecy, ale zaplanowany z wyprzedzeniem daje doskonale rezultaty.\n\nJesli ten typ zasobu jest interesujacy, chetnie porozmawiam.\n\nZ powazaniem,\n[PODPIS]`},
    {cat:"Inicjacja Kontaktu",title:"LinkedIn — Peer-to-Peer",text:`[IMIE], dzien dobry.\n\nJestem Walery, kieruje operacjami Gremi Personal w Rumunii. Zauwazylismy, ze [FIRMA] dziala w [REGION] — wspolpracujemy z firmami z tego samego sektora.\n\nTo nie jest wiadomosc sprzedazowa — interesuje mnie wymiana perspektyw na temat rynku pracy w regionie.\n\nCzy bylby Pan otwarty na rozmowe?`},
    {cat:"Inicjacja Kontaktu",title:"LinkedIn — Kontekst Rynkowy",text:`[IMIE], dzien dobry.\n\nKieruje operacjami personalnymi Gremi Personal w Rumunii. W ostatnich miesiacach, w rozmowach z producentami z branzy [BRANZA], zauwazylismy powtarzajacy sie temat — trudnosc utrzymania kompletnych zespolow.\n\nJesli [FIRMA] rowniez napotyka to wyzwanie, uwazam ze rozmowa byloby wartosciowa.\n\nCo Pan sadzi?`},
    {cat:"Follow-up",title:"Follow-up — Po 3 Dniach",text:`Szanowny [IMIE],\n\nKrotki follow-up. Probowalem sie skontaktowac w sprawie mozliwej wspolpracy w zakresie personelu operacyjnego.\n\nW skrocie: Gremi Personal dostarcza pracownikow ukrainskich (2-4 tygodnie) i azjatyckich (4-6 miesiecy) dla branzy [BRANZA] w Rumunii. Jestesmy oficjalnym pracodawca.\n\nJesli temat jest interesujacy, pozostaje do dyspozycji.\n\nZ powazaniem,\n[PODPIS]`},
    {cat:"Follow-up",title:"Follow-up — Po Spotkaniu",text:`Szanowny [IMIE],\n\nDziekuje za dzisiejsza rozmowe. To byla wartosciowa wymiana.\n\nZgodnie z ustaleniami, przesylam orientacyjna oferte oraz krotka prezentacje naszego modelu pracy.\n\nKolejnym krokiem, z mojej perspektywy, byloby szczegolowe omowienie w przyszlym tygodniu. Ktory dzien Panstwu pasuje?\n\nZ powazaniem,\n[PODPIS]`},
    {cat:"Follow-up",title:"Follow-up — Ostatnia Proba",text:`Szanowny [IMIE],\n\nWralem kilka razy bez sukcesu. Rozumiem ze Panstwa kalendarz jest pelny i nie chce byc natretny.\n\nJedno pytanie: czy przewidujecie potrzebe personelu operacyjnego w najblizszych 6 miesiacach?\n\nJesli tak — jestem do dyspozycji. Jesli nie — dziekuje za uwage i zycze wszelkich sukcesow.\n\nZ powazaniem,\n[PODPIS]`},
    {cat:"Propozycja Wartosci",title:"Pracownicy Ukrainscy",text:`Personel ukrainski dostepny w 2-4 tygodnie — ochrona tymczasowa UE, bez procedur wizowych.\n\nGremi Personal jest oficjalnym pracodawca. Zarzadzamy caloscia: umowy, wynagrodzenia, skladki, zgodnosc ITM.\n\nGwarancje: zamiana bez kosztow, ciagly monitoring, jeden punkt kontaktowy.\n\nOchrona tymczasowa przedluzona do marca 2027.`},
    {cat:"Propozycja Wartosci",title:"Personal z Azji",text:`Rotacja 30-40% generuje powtarzajace sie koszty rekrutacji, szkolen i utraconej produktywnosci.\n\nPersonel z Indii, Nepalu, Sri Lanki na kontraktach 12-24 miesiace. Retencja: ponad 95%.\n\nZarzadzamy wszystkim: rekrutacja, dokumentacja, pozwolenia, transport, zakwaterowanie.\nTermin: 4-6 miesiecy od potwierdzenia.\n\nNizszy calkowity koszt roczny niz ciagla rotacja. Stabilny zespol.`},
    {cat:"Propozycja Wartosci",title:"Dlaczego Gremi",text:`1. Ciaglosc — znacie nas juz z Polski.\n2. Standardy europejskie — compliance, dokumentacja, raportowanie.\n3. Doswiadczenie — tysiace Ukraincow zrekrutowanych w Polsce.\n4. Jeden punkt kontaktowy — ja osobiscie koordynuje wszystko.\n5. Jestesmy oficjalnym pracodawca — ITM przychodzi do nas, nie do Was.`},
    {cat:"SPIN Selling",title:"Pytania SPIN — Staffing",text:`S — SITUATION:\n— Ilu pracownikow na tej lokalizacji? Ile zmian?\n— Wspolpracujecie z dostawca personelu tymczasowego?\n— Ile pozycji jest otwartych?\n\nP — PROBLEM:\n— Ile trwa obsadzenie wakatu?\n— Jaka jest rotacja?\n— Byly trudnosci z ITM?\n\nI — IMPLICATION:\n— Jaki wplyw ma niedobor na terminy dostaw?\n— Ile kosztuje dzien opoznienia?\n— Co z zamowieniami gdy nie ma pelnej obsady?\n\nN — NEED-PAYOFF:\n— Gdybysmy zapewnili [X] pracownikow w 3 tygodnie, jak to zmieni sytuacje?\n— Co by znaczylo miec kompletny zespol caly czas?\n— Byloby pomocne miec partnera do wszystkiego?`},
    {cat:"Odpowiedz na Obiekcje",title:"Mamy Dostawce",text:`Rozumiem i nie sugeruje zamiany. Wielu naszych partnerow wspolpracuje z kilkoma dostawcami — wlasnie dla bezpieczenstwa operacyjnego.\n\nPytanie: co sie dzieje gdy obecny dostawca nie moze pokryc niespodziewanego wolumenu?\n\nZ naszego doswiadczenia, pilotaz 5-10 pracownikow bez zobowiazania dlugoterminowego to najlepszy sposob na ocene jakosci wspolpracy.`},
    {cat:"Odpowiedz na Obiekcje",title:"Koszt Jest Wysoki",text:`Rozumiem obawe i szanuje ja. Pozwole sobie na obiektywne porownanie:\n\nZatrudnienie bezposrednie: pensja, skladki, koszty rekrutacji, administracja HR, zakwaterowanie, plus ryzyko odejscia i koszty rotacji.\n\nNasz tarif all-inclusive obejmuje wszystkie te elementy. Roznica cenowa pokrywa: 100% zgodnosc, zamiane w cenie, zero kosztow administracyjnych.\n\nJestem gotowy przygotowac symulacje na Panstwa konkretnych liczbach.`},
    {cat:"Odpowiedz na Obiekcje",title:"Bariera Jezykowa",text:`To obawa ktora slysze czesto i jest calkowicie uzasadniona.\n\nW praktyce: dobieramy kandydatow ze znajomoscia podstaw rumunskiego lub angielskiego. Dla grup 15+ zapewniamy dwujezycznego team leadera. Instrukcje bezpieczenstwa — zawsze przetlumaczone i zwizualizowane.\n\nNasze doswiadczenie z Polski, z tysiacami pracownikow, potwierdza ze po pierwszym miesiacu komunikacja nie stanowi problemu.`},
    {cat:"Odpowiedz na Obiekcje",title:"Nie Teraz",text:`Calkowicie rozumiem. Jedna obserwacja: proces trwa 2-4 tygodnie (UA) i 4-6 miesiecy (Azja). Firmy ktore planuja z wyprzedzeniem maja personel dokladnie wtedy gdy go potrzebuja.\n\nZostawiam moje dane. Gdy temat stanie sie aktualny, prosze o bezposredni kontakt.`},
    {cat:"Odpowiedz na Obiekcje",title:"Dlaczego Nie Bezposrednio",text:`Bardzo dobre pytanie. Odpowiedz zalezy od kontekstu.\n\nZatrudnienie bezposrednie ma sens dla kilku pozycji, na czas nieokreslony, z wewnetnymi zasobami HR.\n\nOutsourcing ma sens gdy: potrzebujecie szybko wolumenu, chcecie elastycznosci, lub wolicie nie zarzadzac ryzykiem prawnym.\n\nWielu naszych partnerow zaczelo od outsourcingu i przeszlo do bezposredniego zatrudnienia dla top performerow. Wspieramy ten model.`},
  ],
};

function TemplatesTab() {
  const [lang,setLang]=useState("ro");
  const [tpls,setTpls]=useState(JSON.parse(JSON.stringify(TPL_DATA)));
  const [sel,setSel]=useState(null); // index in current lang array
  const [editing,setEditing]=useState(false);
  const [editForm,setEditForm]=useState({cat:"",title:"",text:""});
  const [copied,setCopied]=useState(false);
  const [adding,setAdding]=useState(false);

  const list=tpls[lang]||[];
  const cats=[...new Set(list.map(t=>t.cat))];
  const doCopy=(text)=>{navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),2000);};

  const startEdit=(idx)=>{
    setEditing(true);setAdding(false);
    setSel(idx);
    setEditForm({...list[idx]});
  };
  const startAdd=()=>{
    setAdding(true);setEditing(true);
    setEditForm({cat:cats[0]||"Cold Outreach",title:"",text:""});
    setSel(null);
  };
  const saveEdit=()=>{
    if(!editForm.title.trim()||!editForm.text.trim())return;
    const updated={...tpls};
    if(adding){
      updated[lang]=[...list,{...editForm}];
    } else if(sel!==null){
      updated[lang]=list.map((t,i)=>i===sel?{...editForm}:t);
    }
    setTpls(updated);setEditing(false);setAdding(false);setSel(null);
  };
  const cancelEdit=()=>{setEditing(false);setAdding(false);setSel(null);};
  const deleteTpl=(idx)=>{
    if(!confirm("Delete this template?"))return;
    const updated={...tpls};
    updated[lang]=list.filter((_,i)=>i!==idx);
    setTpls(updated);setSel(null);setEditing(false);
  };
  const resetAll=()=>{
    if(!confirm("Reset all templates to defaults? Your edits will be lost."))return;
    setTpls(JSON.parse(JSON.stringify(TPL_DATA)));setSel(null);setEditing(false);
  };

  // Edit modal
  if(editing){
    return(
      <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:15,color:C.txt}}>{adding?"New Template":"Edit Template"}</div>
          <button className="btn" onClick={cancelEdit} style={{background:C.bg3,color:C.txt3,padding:"6px 14px",fontSize:11,borderRadius:7,border:`1px solid ${C.border}`}}>Cancel</button>
        </div>
        <div>
          <div className="lbl">CATEGORY</div>
          <select value={editForm.cat} onChange={e=>setEditForm({...editForm,cat:e.target.value})} className="fi">
            {["Cold Outreach","Follow-up","Value Proposition","Obiectii","Objections","Obiekcje"].map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <div className="lbl">TITLE</div>
          <input type="text" value={editForm.title} onChange={e=>setEditForm({...editForm,title:e.target.value})} className="fi" placeholder="Template title"/>
        </div>
        <div>
          <div className="lbl">CONTENT</div>
          <textarea value={editForm.text} onChange={e=>setEditForm({...editForm,text:e.target.value})} className="fi" rows={14} style={{resize:"vertical",lineHeight:1.8,fontFamily:"'Inter',sans-serif"}} placeholder="Template text..."/>
        </div>
        <button className="btn" onClick={saveEdit} style={{background:`linear-gradient(135deg,${C.green},${C.teal})`,color:"#fff",padding:"13px",fontSize:14,borderRadius:10}}>{adding?"Add Template":"Save Changes"}</button>
      </div>
    );
  }

  return(
    <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:15,color:C.txt}}>Sales Templates <span style={{fontSize:11,color:C.txt3,fontWeight:400}}>({list.length})</span></div>
        <div style={{display:"flex",gap:5}}>
          {[["ro","RO"],["en","EN"],["pl","PL"]].map(([id,l])=>(
            <button key={id} className="btn" onClick={()=>{setLang(id);setSel(null);}} style={{padding:"6px 14px",fontSize:11,borderRadius:7,background:lang===id?`${C.blue}22`:C.bg3,color:lang===id?C.blue2:C.txt3,border:`1.5px solid ${lang===id?C.blue:C.border}`}}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{display:"flex",gap:6}}>
        <button className="btn" onClick={startAdd} style={{background:`${C.green}18`,color:C.green,padding:"7px 14px",fontSize:11,borderRadius:7,border:`1px solid ${C.green}44`,flex:1}}>+ Add Template</button>
        <button className="btn" onClick={resetAll} style={{background:`${C.red}18`,color:C.red,padding:"7px 14px",fontSize:11,borderRadius:7,border:`1px solid ${C.red}44`}}>Reset</button>
      </div>
      {cats.map(cat=>(
        <div key={cat}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:10,fontWeight:600,color:C.txt3,letterSpacing:"0.1em",margin:"8px 0 4px",textTransform:"uppercase"}}>{cat}</div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {list.map((t,idx)=>{
              if(t.cat!==cat)return null;
              const isOpen=sel===idx&&!editing;
              return(
                <div key={idx} className="card" onClick={()=>setSel(isOpen?null:idx)} style={{padding:"10px 13px",cursor:"pointer",borderLeft:`3px solid ${isOpen?C.blue:C.border}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontWeight:600,fontSize:13,color:isOpen?C.blue2:C.txt}}>{t.title}</div>
                    {isOpen&&(
                      <div style={{display:"flex",gap:5}} onClick={e=>e.stopPropagation()}>
                        <button className="btn" onClick={()=>startEdit(idx)} style={{background:`${C.blue}22`,color:C.blue2,padding:"4px 10px",fontSize:10,borderRadius:6,border:`1px solid ${C.blue}44`}}>Edit</button>
                        <button className="btn" onClick={()=>deleteTpl(idx)} style={{background:`${C.red}18`,color:C.red,padding:"4px 8px",fontSize:10,borderRadius:6,border:`1px solid ${C.red}44`}}>✕</button>
                      </div>
                    )}
                  </div>
                  {isOpen&&(
                    <div style={{marginTop:10}}>
                      <div style={{background:C.bg0,border:`1px solid ${C.border}`,borderRadius:8,padding:12,fontSize:13,color:C.txt2,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{t.text}</div>
                      <button className="btn" onClick={(e)=>{e.stopPropagation();doCopy(t.text);}} style={{marginTop:8,background:copied?`${C.green}22`:`${C.blue}22`,color:copied?C.green:C.blue2,padding:"8px 14px",fontSize:11,borderRadius:7,border:`1px solid ${copied?C.green+"44":C.blue+"44"}`}}>{copied?"Copied!":"Copy"}</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{background:`${C.amber}18`,border:`1px solid ${C.amber}44`,borderRadius:8,padding:"11px 13px",fontSize:12,color:C.amber,lineHeight:1.8}}>Replace: [NUME] [COMPANIE] [INDUSTRIE] [JUDET] [NUMELE DVS] [SEMNATURA] [X] [Y] [LUNA]</div>
    </div>
  );
}

// ─── PLAYBOOK TAB ────────────────────────────────────────────
function PlaybookTab({playbook,setPlaybook,isAdmin}) {
  const [editId,setEditId]=useState(null);
  const [editForm,setEditForm]=useState({});
  const stageColors={"New":C.txt3,"Contacted":C.blue,"Interested":C.indigo,"Meeting Scheduled":C.amber,"Meeting Done":C.orange,"Proposal Sent":C.teal,"Negotiation":C.pink,"Closed Won":C.green};
  const extraColors={indigo:C.indigo,amber:C.amber,txt:C.txt};

  const startEdit=(item,type)=>{setEditId(type+"-"+item.id);setEditForm({...item});};
  const cancelEdit=()=>{setEditId(null);setEditForm({});};
  const saveStage=()=>{
    setPlaybook({...playbook,stages:playbook.stages.map(s=>s.id===editForm.id?{...editForm}:s)});
    setEditId(null);
  };
  const saveExtra=()=>{
    setPlaybook({...playbook,extras:playbook.extras.map(e=>e.id===editForm.id?{...editForm}:e)});
    setEditId(null);
  };
  const addExtra=()=>{
    const id="extra_"+Date.now();
    setPlaybook({...playbook,extras:[...playbook.extras,{id,title:"New Section",color:"txt",text:"Enter content here..."}]});
    setEditId("extra-"+id);
    setEditForm({id,title:"New Section",color:"txt",text:"Enter content here..."});
  };
  const removeExtra=(id)=>{if(confirm("Remove this section?"))setPlaybook({...playbook,extras:playbook.extras.filter(e=>e.id!==id)});};
  const resetAll=()=>{if(confirm("Reset playbook to defaults? All edits will be lost."))setPlaybook(JSON.parse(JSON.stringify(INIT_PLAYBOOK)));};

  return(
    <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:15,color:C.txt}}>Sales Playbook</div>
          <div style={{fontSize:11,color:C.txt3}}>Standard operating procedure. {isAdmin?"Click any card to edit.":"Read-only for your role."}</div>
        </div>
        {isAdmin&&<button className="btn" onClick={resetAll} style={{background:C.bg3,color:C.txt3,padding:"6px 10px",fontSize:10,borderRadius:6,border:`1px solid ${C.border}`}}>Reset</button>}
      </div>

      {playbook.stages.map(s=>{
        const sc=stageColors[s.stage]||C.txt3;
        const isEditing=editId==="stage-"+s.id;
        return(
          <div key={s.id} style={{background:C.bg2,border:`1px solid ${isEditing?C.blue:C.border}`,borderLeft:`4px solid ${sc}`,borderRadius:10,padding:14}}>
            {isEditing?(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"flex",gap:8}}>
                  <div style={{flex:1}}><div className="lbl">TITLE</div><input className="fi" value={editForm.title} onChange={e=>setEditForm({...editForm,title:e.target.value})}/></div>
                  <div style={{flex:1}}><div className="lbl">TARGET</div><input className="fi" value={editForm.target} onChange={e=>setEditForm({...editForm,target:e.target.value})}/></div>
                </div>
                <div><div className="lbl">TASKS & PROCEDURES</div><textarea className="fi" value={editForm.tasks} onChange={e=>setEditForm({...editForm,tasks:e.target.value})} rows={12} style={{resize:"vertical",lineHeight:1.7,fontSize:12}}/></div>
                <div style={{display:"flex",gap:6}}>
                  <button className="btn" onClick={saveStage} style={{background:`linear-gradient(135deg,${C.blue},${C.indigo})`,color:"#fff",padding:"8px 16px",fontSize:12,borderRadius:8}}>Save</button>
                  <button className="btn" onClick={cancelEdit} style={{background:C.bg4,color:C.txt3,padding:"8px 16px",fontSize:12,borderRadius:8,border:`1px solid ${C.border}`}}>Cancel</button>
                </div>
              </div>
            ):(
              <>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <div style={{width:28,height:28,borderRadius:8,background:`${sc}22`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:13,color:sc,flexShrink:0}}>{s.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:14,color:sc}}>{s.stage}</div>
                    <div style={{fontSize:11,color:C.txt,fontWeight:600}}>{s.title}</div>
                  </div>
                  {isAdmin&&<button className="btn" onClick={()=>startEdit(s,"stage")} style={{background:`${C.blue}18`,color:C.blue2,padding:"4px 10px",fontSize:10,borderRadius:6,border:`1px solid ${C.blue}44`}}>Edit</button>}
                </div>
                <div style={{background:`${sc}08`,borderRadius:8,padding:"8px 10px",marginBottom:10}}>
                  <div style={{fontSize:10,color:sc,fontWeight:600,letterSpacing:"0.05em"}}>TARGET: {s.target}</div>
                </div>
                <div style={{fontSize:12,color:C.txt2,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{s.tasks}</div>
              </>
            )}
          </div>
        );
      })}

      {playbook.extras.map(e=>{
        const ec=extraColors[e.color]||C.txt;
        const isEditing=editId==="extra-"+e.id;
        return(
          <div key={e.id} style={{background:C.bg2,border:`1px solid ${isEditing?C.blue:ec+"44"}`,borderRadius:10,padding:14}}>
            {isEditing?(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div><div className="lbl">TITLE</div><input className="fi" value={editForm.title} onChange={e=>setEditForm({...editForm,title:e.target.value})}/></div>
                <div><div className="lbl">CONTENT</div><textarea className="fi" value={editForm.text} onChange={e=>setEditForm({...editForm,text:e.target.value})} rows={10} style={{resize:"vertical",lineHeight:1.7,fontSize:12}}/></div>
                <div style={{display:"flex",gap:6}}>
                  <button className="btn" onClick={saveExtra} style={{background:`linear-gradient(135deg,${C.blue},${C.indigo})`,color:"#fff",padding:"8px 16px",fontSize:12,borderRadius:8}}>Save</button>
                  <button className="btn" onClick={cancelEdit} style={{background:C.bg4,color:C.txt3,padding:"8px 16px",fontSize:12,borderRadius:8,border:`1px solid ${C.border}`}}>Cancel</button>
                  <button className="btn" onClick={()=>{removeExtra(editForm.id);cancelEdit();}} style={{background:`${C.red}18`,color:C.red,padding:"8px 16px",fontSize:12,borderRadius:8,border:`1px solid ${C.red}44`,marginLeft:"auto"}}>Delete</button>
                </div>
              </div>
            ):(
              <>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:13,color:ec}}>{e.title}</div>
                  {isAdmin&&<button className="btn" onClick={()=>startEdit(e,"extra")} style={{background:`${C.blue}18`,color:C.blue2,padding:"4px 10px",fontSize:10,borderRadius:6,border:`1px solid ${C.blue}44`}}>Edit</button>}
                </div>
                <div style={{fontSize:12,color:C.txt2,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{e.text}</div>
              </>
            )}
          </div>
        );
      })}

      {isAdmin&&<button className="btn" onClick={addExtra} style={{width:"100%",background:"transparent",color:C.blue,padding:"12px",fontSize:12,border:`2px dashed ${C.border2}`,borderRadius:10}}>+ Add Section</button>}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────
export default function GremiCRM() {
  const [users,setUsers]         = useState([]);
  const [cur,setCur]             = useState(null);
  const [hqs,setHqs]             = useState([]);
  const [locs,setLocs]           = useState([]);
  const [archived,setArchived]   = useState([]);
  const [theme,setTheme]         = useState("navy");
  const [services,setServices]   = useState(DEF_SERVICES);
  const [playbook,setPlaybook]   = useState(JSON.parse(JSON.stringify(INIT_PLAYBOOK)));
  const [entities,setEntities]   = useState(DEF_ENTITIES);
  const [loading,setLoading]     = useState(true);
  const [dbError,setDbError]     = useState("");

  const [tab,setTab]             = useState("leads");
  const [selHQ,setSelHQ]         = useState(null);
  const [selLoc,setSelLoc]       = useState(null);
  const [showLocForm,setShowLocForm] = useState(false);
  const [showHQForm,setShowHQForm]   = useState(false);
  const [editLocMode,setEditLocMode] = useState(false);
  const [locForm,setLocForm]     = useState({...EMPTY_LOC});
  const [hqForm,setHqForm]       = useState({...EMPTY_HQ});
  const [search,setSearch]       = useState("");
  const [filters,setFilters]     = useState({stage:"All",temp:"All",service:"All",entity:"All",county:"All",industry:"All",salesId:"All",overdueOnly:false,myOnly:false,showLocs:false});
  const [showAdmin,setShowAdmin] = useState(false);
  const [showPwd,setShowPwd]     = useState(false);

  const loadAll = useCallback(async () => {
    try{
      const [u,h,l,arc]=await Promise.all([
        dbGet("crm_users","order=id.asc"),
        dbGet("crm_hqs","order=id.asc"),
        dbGet("crm_locs","order=id.asc"),
        dbGet("crm_archive","order=id.asc"),
      ]);
      setUsers(u);
      setHqs(h.map(hqFromDb));
      setLocs(l.map(locFromDb));
      setArchived(arc.map(r=>({type:r.type,data:r.type==="hq"?hqFromDb(r.data):locFromDb(r.data),archivedBy:r.archived_by,archivedAt:r.archived_at})));
      setDbError("");
    }catch(e){setDbError("Cannot connect to database.");}
    setLoading(false);
  },[]);

  useEffect(()=>{loadAll();},[loadAll]);

  useEffect(()=>{
    if(!cur)return;
    const iv=setInterval(async()=>{
      try{
        const [h,l]=await Promise.all([dbGet("crm_hqs","order=id.asc"),dbGet("crm_locs","order=id.asc")]);
        setHqs(h.map(hqFromDb));setLocs(l.map(locFromDb));
      }catch(e){}
    },20000);
    return()=>clearInterval(iv);
  },[cur]);

  // Set theme colors on every render
  C = THEMES[theme] || THEMES.navy;

  const isAdmin = cur?.role==="admin";
  const isTeamLead = cur?.role==="team_lead";
  const isWalery = cur?.id===1;
  const uN=(id)=>users.find(u=>u.id===id)?.name||"—";

  // Permissions
  const canEditLoc=(loc)=>isAdmin||isTeamLead||loc.salesId===cur?.id;
  const canArchiveLoc=(loc)=>{
    if(isAdmin) return true;
    if(isTeamLead) return loc.salesId!==1;
    return false;
  };
  const canArchiveHQ=(hq)=>isAdmin||isTeamLead;

  // Archive handlers
  const archiveLoc=async(loc)=>{
    if(!confirm("Move this location to archive?\n\n\""+loc.location+" — "+loc.company+"\"\n\nOnly Walery can permanently delete or restore.")) return;
    try{
      await dbPost("crm_archive",{type:"loc",data:locToDb(loc),archived_by:cur.name,archived_at:new Date().toISOString()});
      await dbDel("crm_locs",`id=eq.${loc.id}`);
      await reload();setSelLoc(null);
    }catch(e){alert("Error archiving: "+e.message);}
  };
  const archiveHQ=async(hq)=>{
    const hqLocs=locs.filter(l=>l.parentId===hq.id);
    if(!confirm("Move to archive?\n\n\""+hq.company+"\" + "+hqLocs.length+" location(s)\n\nOnly Walery can permanently delete or restore.")) return;
    try{
      await dbPost("crm_archive",{type:"hq",data:hqToDb(hq),archived_by:cur.name,archived_at:new Date().toISOString()});
      for(const l of hqLocs){
        await dbPost("crm_archive",{type:"loc",data:locToDb(l),archived_by:cur.name,archived_at:new Date().toISOString()});
        await dbDel("crm_locs",`id=eq.${l.id}`);
      }
      await dbDel("crm_hqs",`id=eq.${hq.id}`);
      await reload();setSelHQ(null);
    }catch(e){alert("Error archiving: "+e.message);}
  };
  const restoreFromArchive=async(idx)=>{
    const item=archived[idx];
    const arcRow=await dbGet("crm_archive","order=id.asc");
    // find matching db row by position
    const allArc=arcRow;
    // simpler: refetch and find
    try{
      if(item.type==="loc"){
        const body=locToDb(item.data);
        await dbPost("crm_locs",body);
      }else{
        await dbPost("crm_hqs",hqToDb(item.data));
      }
      // delete from archive — find by content match
      const arc2=await dbGet("crm_archive","order=id.asc");
      const match=arc2.find(r=>r.type===item.type&&r.archived_at===item.archivedAt);
      if(match)await dbDel("crm_archive",`id=eq.${match.id}`);
      await reload();
    }catch(e){alert("Error restoring: "+e.message);}
  };
  const permDeleteFromArchive=async(idx)=>{
    if(!confirm("PERMANENTLY delete? This cannot be undone.")) return;
    const item=archived[idx];
    try{
      const arc2=await dbGet("crm_archive","order=id.asc");
      const match=arc2.find(r=>r.type===item.type&&r.archived_at===item.archivedAt);
      if(match)await dbDel("crm_archive",`id=eq.${match.id}`);
      await reload();
    }catch(e){alert("Error: "+e.message);}
  };

  if(loading) return(
    <div style={{minHeight:"100vh",background:C.bg0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14}}>
      <style>{getCSS()}</style>
      <div style={{width:36,height:36,background:`linear-gradient(135deg,${C.blue},${C.indigo})`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:16,color:"#fff"}}>G</div>
      {dbError
        ?<div style={{color:C.red,fontSize:13,textAlign:"center",maxWidth:280,padding:"0 20px"}}>{dbError}<br/><button className="btn" onClick={loadAll} style={{marginTop:12,background:`${C.blue}22`,color:C.blue,padding:"8px 16px",borderRadius:8,border:`1px solid ${C.blue}44`,fontSize:12}}>Retry</button></div>
        :<div style={{color:C.txt3,fontSize:13}}>Loading CRM…</div>
      }
    </div>
  );

  if(!cur) return(<><style>{getCSS()}</style><LoginScreen onLogin={u=>{setCur(u);setLocForm({...EMPTY_LOC,salesId:u.id});}}/></>);

  // Build display pool: HQ cards or location rows
  const pool = filters.showLocs
    ? locs.map(l=>({...l,_type:"loc"}))
    : hqs.map(h=>({...h,_type:"hq"}));

  const filtered = pool.filter(item=>{
    if(item._type==="hq") {
      const hqLocs=locs.filter(l=>l.parentId===item.id);
      if(search){const q=search.toLowerCase();if(!item.company.toLowerCase().includes(q)&&!item.centralContact.toLowerCase().includes(q))return false;}
      if(filters.industry!=="All"&&item.industry!==filters.industry)return false;
      if(filters.stage!=="All"&&!hqLocs.some(l=>l.stage===filters.stage))return false;
      if(filters.temp!=="All"&&!hqLocs.some(l=>l.temp===filters.temp))return false;
      if(filters.service!=="All"&&!hqLocs.some(l=>l.service===filters.service))return false;
      if(filters.entity!=="All"&&!hqLocs.some(l=>l.companyName===filters.entity))return false;
      if(filters.county!=="All"&&!hqLocs.some(l=>l.county===filters.county))return false;
      if(filters.salesId!=="All"&&!hqLocs.some(l=>String(l.salesId)===filters.salesId))return false;
      if(filters.overdueOnly&&!hqLocs.some(l=>isOD(l.nextAction,l.stage)))return false;
      if(filters.myOnly&&!hqLocs.some(l=>l.salesId===cur.id))return false;
      return true;
    } else {
      if(search){const q=search.toLowerCase();if(!item.company.toLowerCase().includes(q)&&!item.location.toLowerCase().includes(q)&&!item.contact.toLowerCase().includes(q)&&!item.county.toLowerCase().includes(q))return false;}
      if(filters.stage!=="All"&&item.stage!==filters.stage)return false;
      if(filters.temp!=="All"&&item.temp!==filters.temp)return false;
      if(filters.service!=="All"&&item.service!==filters.service)return false;
      if(filters.entity!=="All"&&item.companyName!==filters.entity)return false;
      if(filters.county!=="All"&&item.county!==filters.county)return false;
      if(filters.industry!=="All"&&item.industry!==filters.industry)return false;
      if(filters.salesId!=="All"&&String(item.salesId)!==filters.salesId)return false;
      if(filters.overdueOnly&&!isOD(item.nextAction,item.stage))return false;
      if(filters.myOnly&&item.salesId!==cur.id)return false;
      return true;
    }
  });

  const kpi=(()=>{
    const won=locs.filter(l=>l.stage==="Closed Won");
    const act=locs.filter(l=>l.stage!=="Closed Won"&&l.stage!=="Closed Lost");
    return{
      total:hqs.length,locs:locs.length,
      hot:locs.filter(l=>l.temp==="🔥 Hot").length,
      placed:won.reduce((s,l)=>s+(parseInt(l.workers)||0),0),
      pipe:act.reduce((s,l)=>s+(parseInt(l.workers)||0),0),
      conv:locs.length?Math.round(won.length/locs.length*100):0,
      late:locs.filter(l=>isOD(l.nextAction,l.stage)).length,
      byStage:Object.fromEntries(STAGES.map(s=>[s,locs.filter(l=>l.stage===s).length])),
    };
  })();

  const reload=async()=>{
    try{
      const [h,l,arc]=await Promise.all([
        dbGet("crm_hqs","order=id.asc"),dbGet("crm_locs","order=id.asc"),dbGet("crm_archive","order=id.asc"),
      ]);
      setHqs(h.map(hqFromDb));setLocs(l.map(locFromDb));
      setArchived(arc.map(r=>({type:r.type,data:r.type==="hq"?hqFromDb(r.data):locFromDb(r.data),archivedBy:r.archived_by,archivedAt:r.archived_at})));
    }catch(e){}
  };

  const saveLoc=async(newHQData)=>{
    if(!locForm.location)return;
    let parentId=locForm.parentId;
    try{
      if(newHQData&&newHQData.company){
        const created=await dbPost("crm_hqs",hqToDb(newHQData));
        parentId=created[0].id;
      }
      const company=parentId?(hqs.find(h=>h.id===parentId)||{company:locForm.company}).company:locForm.company;
      const rec={...locForm,parentId,company,salesId:locForm.salesId||cur.id};
      if(editLocMode){
        await dbPatch("crm_locs",`id=eq.${locForm.id}`,locToDb(rec));
      }else{
        await dbPost("crm_locs",locToDb(rec));
      }
      await reload();
      setShowLocForm(false);setEditLocMode(false);setSelLoc(null);
    }catch(e){alert("Error saving: "+e.message);}
  };

  const saveHQ=async()=>{
    try{
      await dbPatch("crm_hqs",`id=eq.${hqForm.id}`,hqToDb(hqForm));
      await reload();
      setShowHQForm(false);setSelHQ(null);
    }catch(e){alert("Error saving: "+e.message);}
  };

  const updLoc=async(id,p)=>{
    try{
      // Convert any camelCase keys to snake_case for the patch
      const dbPatch2={};
      if(p.stage!==undefined)dbPatch2.stage=p.stage;
      if(p.temp!==undefined)dbPatch2.temp=p.temp;
      if(p.nextAction!==undefined)dbPatch2.next_action=p.nextAction;
      if(p.lastContact!==undefined)dbPatch2.last_contact=p.lastContact;
      if(p.workers!==undefined)dbPatch2.workers=p.workers;
      if(p.notes!==undefined)dbPatch2.notes=p.notes;
      if(p.activities!==undefined)dbPatch2.activities=JSON.stringify(p.activities);
      if(p.spin!==undefined)dbPatch2.spin=JSON.stringify(p.spin);
      await dbPatch("crm_locs",`id=eq.${id}`,dbPatch2);
      setLocs(prev=>prev.map(l=>l.id===id?{...l,...p}:l));
      if(selLoc?.id===id)setSelLoc(prev=>({...prev,...p}));
    }catch(e){alert("Error updating: "+e.message);}
  };

  const exportXLSX=()=>{
    const ld=locs.map(l=>({"Company":l.company,"Location":l.location,"Contact":l.contact,"Role":l.role,"Phone":l.phone,"Email":l.email,"County":l.county,"Industry":l.industry,"Employees":l.employees,"Stage":l.stage,"Temp":l.temp,"Workers":l.workers,"Worker Type":l.workerType,"Service":l.service,"Entity":l.companyName,"Salesperson":uN(l.salesId),"Next Action":l.nextAction,"Last Contact":l.lastContact,"Source":l.source,"Notes":l.notes}));
    const hd=hqs.map(h=>({"Company":h.company,"Industry":h.industry,"Central Contact":h.centralContact,"Role":h.centralRole,"Phone":h.centralPhone,"Email":h.centralEmail,"Locations":locs.filter(l=>l.parentId===h.id).length,"Notes":h.notes}));
    const kd=users.filter(u=>u.active).map(u=>{const ul=locs.filter(l=>l.salesId===u.id);const uw=ul.filter(l=>l.stage==="Closed Won");return{"Name":u.name,"Locations":ul.length,"Won":uw.length,"Pipeline":ul.filter(l=>l.stage!=="Closed Won"&&l.stage!=="Closed Lost").length,"Placed":uw.reduce((s,l)=>s+(parseInt(l.workers)||0),0),"Conv%":ul.length?Math.round(uw.length/ul.length*100):0};});
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(ld),"Locations (Deals)");
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(hd),"Companies (HQ)");
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(kd),"Team KPI");
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(STAGES.map(s=>({"Stage":s,"Count":locs.filter(l=>l.stage===s).length,"Workers":locs.filter(l=>l.stage===s).reduce((x,l)=>x+(parseInt(l.workers)||0),0)}))),"Funnel");
    XLSX.writeFile(wb,`SalesTeamCRM_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const TABS=[["leads","LEADS"],["kpi","KPI"],["tpl","TEMPLATES"],["playbook","PLAYBOOK"],["team","TEAM"],...(isAdmin?[["settings","SETTINGS"]]:[]),...(archived.length>0||isAdmin||isTeamLead?[["archive","ARCHIVE"+(archived.length?" ("+archived.length+")":"")]]:[])];

  return(
    <div style={{fontFamily:"'Inter',sans-serif",background:C.bg1,height:"100vh",display:"flex",flexDirection:"column",overflow:"hidden",color:C.txt}}>
      <style>{getCSS()}</style>

      {/* HEADER */}
      <div style={{background:C.bg0,borderBottom:`1px solid ${C.border}`,padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{width:30,height:30,background:`linear-gradient(135deg,${C.blue},${C.indigo})`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:13,color:"#fff"}}>G</div>
          <div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:14,color:C.txt,lineHeight:1}}>Sales Team CRM</div><div style={{fontSize:9,color:C.txt3,letterSpacing:"0.1em"}}>GREMI · ROMANIA</div></div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          {isAdmin&&<button className="btn" onClick={()=>setShowAdmin(true)} style={{background:`${C.purple}18`,color:C.purple,padding:"6px 10px",fontSize:11,borderRadius:7,border:`1px solid ${C.purple}44`}}>Admin</button>}
          {(isAdmin||isTeamLead)&&<button className="btn" onClick={exportXLSX} style={{background:`${C.green}18`,color:C.green,padding:"6px 10px",fontSize:11,borderRadius:7,border:`1px solid ${C.green}44`}}>Excel</button>}
          <button className="btn" onClick={loadAll} style={{background:C.bg3,color:C.txt3,padding:"6px 9px",fontSize:11,borderRadius:7,border:`1px solid ${C.border}`}} title="Refresh">↻</button>
          <div style={{cursor:"pointer",textAlign:"right"}} onClick={()=>setShowPwd(true)}>
            <div style={{fontSize:12,fontWeight:600,color:C.txt}}>{cur.name}</div>
            <div style={{fontSize:9,color:isAdmin?C.purple:isTeamLead?C.amber:C.blue}}>{isAdmin?"ADMIN":isTeamLead?"TEAM LEAD":"USER"} 🔑</div>
          </div>
          <button className="btn" onClick={()=>setCur(null)} style={{background:C.bg3,color:C.txt3,padding:"6px 10px",fontSize:11,borderRadius:7,border:`1px solid ${C.border}`}}>Exit</button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div style={{background:C.bg0,borderBottom:`1px solid ${C.border}`,display:"flex",overflowX:"auto",flexShrink:0}}>
        {[["COS",kpi.total,C.blue],["LOCS",kpi.locs,C.indigo],["🔥HOT",kpi.hot,C.red],["PLACED",kpi.placed,C.green],["PIPE",kpi.pipe,C.amber],["⚠LATE",kpi.late,C.orange]].map(([l,v,c])=>(
          <div key={l} style={{flex:"1 0 50px",padding:"9px 5px",borderRight:`1px solid ${C.border}`,textAlign:"center"}}>
            <div style={{fontSize:17,fontWeight:700,color:c,fontFamily:"'Space Grotesk',sans-serif"}}>{v}</div>
            <div style={{fontSize:8,color:C.txt3,letterSpacing:"0.06em",marginTop:1}}>{l}</div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,flexShrink:0,background:C.bg0}}>
        {TABS.map(([v,l])=>(
          <button key={v} className="tab" onClick={()=>setTab(v)} style={{background:tab===v?`${C.blue}12`:"transparent",color:tab===v?C.blue2:C.txt3,borderBottom:`2px solid ${tab===v?C.blue:"transparent"}`}}>{l}</button>
        ))}
      </div>

      {/* ── LEADS ── */}
      {tab==="leads"&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"9px 12px",borderBottom:`1px solid ${C.border}`,background:C.bg1,display:"flex",gap:8,flexShrink:0}}>
            <input dir="ltr" placeholder="Search company, location, contact..." value={search} onChange={e=>setSearch(e.target.value)} className="fi" style={{flex:1,padding:"9px 11px",fontSize:13}}/>
            <button className="btn" onClick={()=>{setLocForm({...EMPTY_LOC,salesId:cur.id});setEditLocMode(false);setShowLocForm(true);}} style={{background:`linear-gradient(135deg,${C.blue},${C.indigo})`,color:"#fff",padding:"9px 14px",fontSize:12,borderRadius:8,flexShrink:0}}>+ New Deal</button>
          </div>
          <FilterBar filters={filters} setFilters={setFilters} users={users} isAdmin={isAdmin} isTeamLead={isTeamLead} curId={cur.id} services={services} entities={entities}/>
          <div style={{padding:"6px 12px",borderBottom:`1px solid ${C.border}`,flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:11,color:C.txt3}}>{filtered.length} {filters.showLocs?"locations":"companies"}</span>
            <button className="btn" onClick={()=>setFilters({...filters,showLocs:!filters.showLocs})} style={{background:filters.showLocs?`${C.indigo}22`:C.bg3,color:filters.showLocs?C.purple:C.txt3,padding:"4px 10px",fontSize:10,borderRadius:6,border:`1px solid ${filters.showLocs?C.indigo+"44":C.border}`}}>
              {filters.showLocs?"📍 All locations":"🏢 By company"}
            </button>
          </div>

          <div style={{flex:1,overflowY:"auto",padding:"10px 12px",display:"flex",flexDirection:"column",gap:8}}>
            {filtered.length===0&&<div style={{padding:48,textAlign:"center",color:C.txt3,fontSize:14}}>No results found</div>}

            {filtered.map(item=>{
              if(item._type==="hq") {
                const hqLocs=locs.filter(l=>l.parentId===item.id);
                const totalW=hqLocs.reduce((s,l)=>s+(parseInt(l.workers)||0),0);
                const won=hqLocs.filter(l=>l.stage==="Closed Won").length;
                const stages=[...new Set(hqLocs.map(l=>l.stage))].slice(0,3);
                const hasLate=hqLocs.some(l=>isOD(l.nextAction,l.stage));
                return(
                  <div key={item.id} className="card" onClick={()=>setSelHQ(item)} style={{padding:"13px 14px",borderLeft:`3px solid ${C.indigo}`,cursor:"pointer"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <div style={{flex:1,minWidth:0,paddingRight:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                          <span style={{fontSize:11,color:C.indigo}}>🏢</span>
                          <span style={{fontWeight:700,fontSize:15,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.company}</span>
                        </div>
                        <div style={{fontSize:11,color:C.txt3}}>{item.centralContact}{item.centralRole?` · ${item.centralRole}`:""}</div>
                      </div>
                      {hasLate&&<span className="pill" style={{background:`${C.red}18`,color:C.red,border:`1px solid ${C.red}44`,flexShrink:0}}>⚠</span>}
                    </div>
                    {/* Summary row */}
                    <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                      <span className="pill" style={{background:`${C.blue}18`,color:C.blue2,border:`1px solid ${C.blue}33`}}>📍 {hqLocs.length} loc.</span>
                      {totalW>0&&<span className="pill" style={{background:`${C.amber}18`,color:C.amber,border:`1px solid ${C.amber}33`}}>👷 {totalW} workers</span>}
                      {won>0&&<span className="pill" style={{background:`${C.green}18`,color:C.green,border:`1px solid ${C.green}33`}}>✓ {won} won</span>}
                    </div>
                    {/* Stage pills */}
                    <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                      {stages.map(s=>{const c=getSC()[s]||C.txt3;return <span key={s} className="pill" style={{background:c+"18",color:c,border:`1px solid ${c}33`,fontSize:9}}>{s}</span>;})}
                      {hqLocs.length===0&&<span style={{fontSize:11,color:C.txt3,fontStyle:"italic"}}>No locations yet</span>}
                    </div>
                  </div>
                );
              } else {
                // Location row
                const sc=getSC()[item.stage]||C.txt3;
                const od=isOD(item.nextAction,item.stage);
                const dl=daysLeft(item.nextAction);
                const parentHQ=hqs.find(h=>h.id===item.parentId);
                return(
                  <div key={item.id} className="card" onClick={()=>setSelLoc(item)} style={{padding:"12px 14px",borderLeft:`3px solid ${sc}`,cursor:"pointer"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                      <div style={{flex:1,minWidth:0,paddingRight:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:1}}>
                          <span style={{fontSize:10,color:C.purple}}>📍</span>
                          <span style={{fontWeight:600,fontSize:14,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.location}</span>
                        </div>
                        <div style={{fontSize:11,color:C.txt3}}>{parentHQ?<span style={{color:C.indigo}}>{parentHQ.company} · </span>:""}{item.contact} · <span style={{color:C.blue}}>{uN(item.salesId)}</span></div>
                      </div>
                      <span style={{fontSize:16,flexShrink:0}}>{item.temp}</span>
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
                      <span className="pill" style={{background:sc+"22",color:sc,border:`1px solid ${sc}44`}}>{item.stage}</span>
                      {item.service&&<span className="pill" style={{background:`${C.blue}18`,color:C.blue2,border:`1px solid ${C.blue}33`}}>{item.service}</span>}
                      {item.companyName&&<span className="pill" style={{background:`${C.teal}18`,color:C.teal,border:`1px solid ${C.teal}33`}}>{item.companyName}</span>}
                      {item.workers&&<span className="pill" style={{background:`${C.amber}18`,color:C.amber,border:`1px solid ${C.amber}33`}}>👷 {item.workers}</span>}
                      {item.workerType&&<span className="pill" style={{background:`${C.teal}18`,color:C.teal,border:`1px solid ${C.teal}33`}}>{item.workerType}</span>}
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.txt3}}>
                      <span>{item.county} · {item.industry}</span>
                      <span style={{color:od?C.red:(dl!==null&&dl<=3)?C.amber:C.txt3,fontWeight:(od||(dl!==null&&dl<=3))?600:400}}>{od?"⚠ ":""}{fmtDate(item.nextAction)}{(!od&&dl!==null&&dl<=3)?" ("+dl+"d)":""}</span>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        </div>
      )}

      {/* ── KPI ── */}
      {tab==="kpi"&&(
        <div style={{flex:1,overflowY:"auto",padding:12,display:"flex",flexDirection:"column",gap:10}}>
          {/* Top stats */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {[
              ["Companies",kpi.total,C.blue],["Locations",kpi.locs,C.indigo],["🔥 Hot",kpi.hot,C.red],
              ["Placed",kpi.placed,C.green],["Pipeline",kpi.pipe,C.amber],["⚠ Overdue",kpi.late,kpi.late>0?C.orange:C.green],
            ].map(([l,v,c])=>(
              <div key={l} style={{background:C.bg2,border:`1px solid ${C.border}`,borderTop:`3px solid ${c}`,padding:11,textAlign:"center",borderRadius:10}}>
                <div style={{fontSize:22,fontWeight:700,color:c,fontFamily:"'Space Grotesk',sans-serif"}}>{v}</div>
                <div style={{fontSize:9,color:C.txt3,marginTop:3}}>{l}</div>
              </div>
            ))}
          </div>

          {/* Deal funnel */}
          <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:14}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:11,color:C.txt3,letterSpacing:"0.08em",marginBottom:12}}>DEAL FUNNEL</div>
            {STAGES.map(s=>{const n=kpi.byStage[s]||0;const p=kpi.locs?Math.round(n/kpi.locs*100):0;const c=getSC()[s]||C.txt3;return(<div key={s} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}><span style={{color:c,fontWeight:500}}>{s}</span><span style={{color:C.txt3}}>{n}</span></div><div style={{background:C.bg4,height:5,borderRadius:3}}><div style={{background:c,height:5,borderRadius:3,width:p+"%",transition:"width 0.5s"}}/></div></div>);})}
          </div>

          {/* By salesperson */}
          <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:14}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:11,color:C.txt3,letterSpacing:"0.08em",marginBottom:10}}>TEAM PERFORMANCE</div>
            {users.filter(u=>u.active).map(u=>{
              const ul=locs.filter(l=>l.salesId===u.id);const uw=ul.filter(l=>l.stage==="Closed Won");
              const placed=uw.reduce((s,l)=>s+(parseInt(l.workers)||0),0);
              const pipe=ul.filter(l=>!["Closed Won","Closed Lost"].includes(l.stage));
              const conv=ul.length?Math.round(uw.length/ul.length*100):0;
              const late=ul.filter(l=>isOD(l.nextAction,l.stage)).length;
              return(
                <div key={u.id} style={{padding:"9px 0",borderBottom:`1px solid ${C.border}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <div style={{fontWeight:600,fontSize:13,color:C.txt}}>{u.name} <span style={{fontSize:10,color:u.role==="admin"?C.purple:u.role==="team_lead"?C.amber:C.txt3}}>{u.role==="admin"?"ADMIN":u.role==="team_lead"?"TL":""}</span></div>
                    <span className="pill" style={{background:`${conv>40?C.green:conv>15?C.amber:C.red}22`,color:conv>40?C.green:conv>15?C.amber:C.red,border:`1px solid ${conv>40?C.green:conv>15?C.amber:C.red}44`}}>{conv}%</span>
                  </div>
                  <div style={{display:"flex",gap:10,fontSize:11,color:C.txt3}}>
                    <span>{ul.length} deals</span><span style={{color:C.green}}>{uw.length} won</span><span style={{color:C.amber}}>{pipe.length} pipe</span><span style={{color:C.teal}}>👷{placed}</span>{late>0&&<span style={{color:C.red}}>⚠{late}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── ADMIN-ONLY ANALYTICS below ── */}
          {isAdmin&&(()=>{
            const staleDeals=locs.filter(l=>{if(!l.lastContact||["Closed Won","Closed Lost"].includes(l.stage))return false;return Math.ceil((new Date()-new Date(l.lastContact))/86400000)>14;});
            return(
              <>
                {/* Source effectiveness */}
                <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:14}}>
                  <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:11,color:C.txt3,letterSpacing:"0.08em",marginBottom:10}}>SOURCE EFFECTIVENESS</div>
                  {SOURCES.map(src=>{
                    const sl=locs.filter(l=>l.source===src);if(sl.length===0)return null;
                    const sw=sl.filter(l=>l.stage==="Closed Won");const conv=Math.round(sw.length/sl.length*100);
                    const w=sw.reduce((s,l)=>s+(parseInt(l.workers)||0),0);
                    return(
                      <div key={src} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
                        <div style={{flex:1}}><div style={{fontSize:12,color:C.txt,fontWeight:500}}>{src}</div><div style={{fontSize:10,color:C.txt3}}>{sl.length} deals · {sw.length} won</div></div>
                        <div style={{display:"flex",gap:6,alignItems:"center"}}>
                          <span className="pill" style={{background:`${conv>30?C.green:conv>10?C.amber:C.red}22`,color:conv>30?C.green:conv>10?C.amber:C.red,border:`1px solid ${conv>30?C.green:conv>10?C.amber:C.red}44`}}>{conv}%</span>
                          {w>0&&<span style={{fontSize:11,color:C.amber}}>👷{w}</span>}
                        </div>
                      </div>
                    );
                  }).filter(Boolean)}
                </div>

                {/* By county */}
                <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:14}}>
                  <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:11,color:C.txt3,letterSpacing:"0.08em",marginBottom:10}}>DEMAND BY COUNTY</div>
                  {[...new Set(locs.map(l=>l.county))].filter(Boolean).map(co=>{
                    const cl=locs.filter(l=>l.county===co);return{co,n:cl.length,w:cl.reduce((s,l)=>s+(parseInt(l.workers)||0),0)};
                  }).sort((a,b)=>b.w-a.w).slice(0,12).map(({co,n,w})=>(
                    <div key={co} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
                      <span style={{fontSize:12,color:C.txt,fontWeight:500}}>{co}</span>
                      <div style={{display:"flex",gap:8}}><span style={{fontSize:11,color:C.txt3}}>{n} deals</span><span style={{fontSize:12,fontWeight:700,color:C.amber,fontFamily:"'Space Grotesk',sans-serif"}}>👷{w}</span></div>
                    </div>
                  ))}
                </div>

                {/* By service + entity */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:14}}>
                    <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:11,color:C.txt3,letterSpacing:"0.08em",marginBottom:10}}>BY SERVICE</div>
                    {services.map(svc=>{const sl=locs.filter(l=>l.service===svc);if(sl.length===0)return null;const sw=sl.filter(l=>l.stage==="Closed Won");return(
                      <div key={svc} style={{padding:"6px 0",borderBottom:`1px solid ${C.border}`}}><div style={{fontSize:12,color:C.txt,fontWeight:500}}>{svc}</div><div style={{fontSize:10,color:C.txt3}}>{sl.length} deals · {sw.length} won · 👷{sl.reduce((s,l)=>s+(parseInt(l.workers)||0),0)}</div></div>
                    );}).filter(Boolean)}
                  </div>
                  <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:14}}>
                    <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:11,color:C.txt3,letterSpacing:"0.08em",marginBottom:10}}>BY WORKER TYPE</div>
                    {WORKER_TYPES.map(wt=>{const wl=locs.filter(l=>l.workerType===wt);if(wl.length===0)return null;const ww=wl.filter(l=>l.stage==="Closed Won");return(
                      <div key={wt} style={{padding:"6px 0",borderBottom:`1px solid ${C.border}`}}><div style={{fontSize:12,color:C.txt,fontWeight:500}}>{wt}</div><div style={{fontSize:10,color:C.txt3}}>{wl.length} deals · {ww.length} won · 👷{wl.reduce((s,l)=>s+(parseInt(l.workers)||0),0)}</div></div>
                    );}).filter(Boolean)}
                  </div>
                  <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:14}}>
                    <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:11,color:C.txt3,letterSpacing:"0.08em",marginBottom:10}}>BY ENTITY</div>
                    {entities.map(ent=>{const el=locs.filter(l=>l.companyName===ent);if(el.length===0)return null;const ew=el.filter(l=>l.stage==="Closed Won");return(
                      <div key={ent} style={{padding:"6px 0",borderBottom:`1px solid ${C.border}`}}><div style={{fontSize:12,color:C.txt,fontWeight:500}}>{ent}</div><div style={{fontSize:10,color:C.txt3}}>{el.length} deals · {ew.length} won · 👷{el.reduce((s,l)=>s+(parseInt(l.workers)||0),0)}</div></div>
                    );}).filter(Boolean)}
                  </div>
                </div>

                {/* Stale deals */}
                {staleDeals.length>0&&(
                  <div style={{background:C.bg2,border:`1px solid ${C.orange}44`,borderRadius:10,padding:14}}>
                    <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:11,color:C.orange,letterSpacing:"0.08em",marginBottom:10}}>⚠ STALE DEALS (no contact 14+ days)</div>
                    {staleDeals.map(l=>{const days=Math.ceil((new Date()-new Date(l.lastContact))/86400000);return(
                      <div key={l.id} style={{padding:"7px 0",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div><div style={{fontSize:12,color:C.txt,fontWeight:500}}>{l.company} — {l.location}</div><div style={{fontSize:10,color:C.txt3}}>{uN(l.salesId)} · {l.stage}</div></div>
                        <span className="pill" style={{background:`${C.red}22`,color:C.red,border:`1px solid ${C.red}44`}}>{days}d</span>
                      </div>
                    );})}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ── TEMPLATES ── */}
      {tab==="tpl"&&<TemplatesTab />}

      {/* ── PLAYBOOK ── */}
      {tab==="playbook"&&<PlaybookTab playbook={playbook} setPlaybook={setPlaybook} isAdmin={isAdmin}/>}

            {/* ── TEAM ── */}
      {tab==="team"&&<TeamTab users={users} locs={locs} onSelect={l=>{setSelLoc(l);}}/>}

      {/* ── SETTINGS (Admin) ── */}
      {tab==="settings"&&isAdmin&&(
        <div style={{flex:1,overflowY:"auto",padding:12,display:"flex",flexDirection:"column",gap:12}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:11,color:C.txt3,letterSpacing:"0.1em"}}>SETTINGS</div>

          <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:14}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:12,color:C.txt,marginBottom:12}}>Services</div>
            <div style={{fontSize:11,color:C.txt3,marginBottom:10}}>Manage the service types available in deal forms.</div>
            <EditableList label="SERVICES" items={services} setItems={setServices} color={C.blue}/>
          </div>

          <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:14}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:12,color:C.txt,marginBottom:12}}>Legal Entities</div>
            <div style={{fontSize:11,color:C.txt3,marginBottom:10}}>Manage the Gremi entities available in deal forms.</div>
            <EditableList label="ENTITIES" items={entities} setItems={setEntities} color={C.teal}/>
          </div>

          <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:14}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:12,color:C.txt,marginBottom:12}}>Theme</div>
            <div style={{fontSize:11,color:C.txt3,marginBottom:10}}>Choose the visual theme for the CRM.</div>
            <div>
              {Object.entries(THEME_GROUPS).map(([group,keys])=>(
                <div key={group} style={{marginBottom:14}}>
                  <div style={{fontSize:10,fontWeight:600,color:C.txt3,letterSpacing:"0.08em",marginBottom:6}}>{group.toUpperCase()}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {keys.map(k=>{const t=THEMES[k];if(!t)return null;return(
                      <button key={k} className="btn" onClick={()=>setTheme(k)}
                        style={{padding:"10px",borderRadius:10,border:`2px solid ${theme===k?C.blue:C.border}`,background:t.bg2,color:t.txt,fontSize:12,fontWeight:theme===k?700:400,textAlign:"left"}}>
                        <div style={{fontWeight:600,fontSize:11}}>{t.name}</div>
                        <div style={{display:"flex",gap:3,marginTop:5}}>
                          {[t.bg0,t.bg2,t.blue,t.green,t.amber,t.red].map((cl,i)=>(
                            <div key={i} style={{width:12,height:12,borderRadius:2,background:cl,border:`1px solid ${t.border}`}}/>
                          ))}
                        </div>
                      </button>
                    );})}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ARCHIVE ── */}
      {tab==="archive"&&(
        <div style={{flex:1,overflowY:"auto",padding:12,display:"flex",flexDirection:"column",gap:10}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:11,color:C.txt3,letterSpacing:"0.1em",marginBottom:2}}>ARCHIVE ({archived.length} items)</div>
          {archived.length===0&&<div style={{padding:40,textAlign:"center",color:C.txt3,fontSize:13}}>Archive is empty</div>}
          {archived.map((item,idx)=>(
            <div key={idx} style={{background:C.bg2,border:`1px solid ${C.border}`,borderLeft:`3px solid ${item.type==="hq"?C.indigo:C.amber}`,borderRadius:10,padding:13}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div>
                  <div style={{fontWeight:600,fontSize:14,color:C.txt}}>{item.type==="hq"?"🏢 ":"📍 "}{item.type==="hq"?item.data.company:item.data.location}</div>
                  <div style={{fontSize:11,color:C.txt3,marginTop:2}}>{item.type==="hq"?item.data.industry:(item.data.company+" · "+item.data.county)}</div>
                  <div style={{fontSize:10,color:C.txt3,marginTop:4}}>Archived by {item.archivedBy} · {fmtDate(item.archivedAt)}</div>
                </div>
                <span className="pill" style={{background:item.type==="hq"?`${C.indigo}22`:`${C.amber}22`,color:item.type==="hq"?C.indigo:C.amber,border:`1px solid ${item.type==="hq"?C.indigo+"44":C.amber+"44"}`}}>{item.type==="hq"?"HQ":"LOC"}</span>
              </div>
              {item.type==="loc"&&(
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                  {item.data.stage&&<span className="pill" style={{background:C.bg4,color:C.txt2,border:`1px solid ${C.border}`}}>{item.data.stage}</span>}
                  {item.data.workers&&<span className="pill" style={{background:`${C.amber}18`,color:C.amber,border:`1px solid ${C.amber}44`}}>👷 {item.data.workers}</span>}
                  {item.data.contact&&<span style={{fontSize:11,color:C.txt3}}>{item.data.contact}</span>}
                </div>
              )}
              {isWalery?(
                <div style={{display:"flex",gap:8}}>
                  <button className="btn" onClick={()=>restoreFromArchive(idx)} style={{flex:1,background:`${C.green}18`,color:C.green,padding:"9px",fontSize:12,borderRadius:8,border:`1px solid ${C.green}44`}}>↩ Restore</button>
                  <button className="btn" onClick={()=>permDeleteFromArchive(idx)} style={{background:`${C.red}18`,color:C.red,padding:"9px 14px",fontSize:12,borderRadius:8,border:`1px solid ${C.red}44`}}>✕ Delete forever</button>
                </div>
              ):(
                <div style={{fontSize:11,color:C.txt3,fontStyle:"italic",padding:"6px 0"}}>Only Walery can restore or permanently delete</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* HQ DETAIL */}
      {selHQ&&!showLocForm&&!showHQForm&&(
        <HQDetailModal hq={selHQ} locs={locs} users={users} isAdmin={isAdmin}
          onClose={()=>setSelHQ(null)}
          onEditHQ={()=>{setHqForm(selHQ);setShowHQForm(true);}}
          onDeleteHQ={()=>archiveHQ(selHQ)}
          onAddLoc={()=>{setLocForm({...EMPTY_LOC,parentId:selHQ.id,company:selHQ.company,salesId:cur.id});setEditLocMode(false);setShowLocForm(true);}}
          onSelectLoc={l=>setSelLoc(l)}
        />
      )}

      {/* LOC DETAIL */}
      {selLoc&&!showLocForm&&(
        <LocDetailModal loc={selLoc} hqs={hqs} users={users} isAdmin={isAdmin} canArchive={canArchiveLoc(selLoc)} canEdit={canEditLoc(selLoc)}
          onClose={()=>setSelLoc(null)}
          onEdit={()=>{if(!canEditLoc(selLoc))return;setLocForm(selLoc);setEditLocMode(true);setShowLocForm(true);}}
          onArchive={()=>archiveLoc(selLoc)}
          onUpdate={updLoc}
        />
      )}

      {/* LOC FORM */}
      {showLocForm&&(
        <LocFormModal form={locForm} setForm={setLocForm} onSave={saveLoc}
          onClose={()=>{setShowLocForm(false);setEditLocMode(false);}}
          editMode={editLocMode} users={users} isAdmin={isAdmin} hqs={hqs} services={services} entities={entities}/>
      )}

      {/* HQ FORM */}
      {showHQForm&&(
        <HQFormModal form={hqForm} setForm={setHqForm} onSave={saveHQ} onClose={()=>setShowHQForm(false)}/>
      )}

      {showAdmin&&isAdmin&&<AdminPanel users={users} setUsers={setUsers} cur={cur} onClose={()=>setShowAdmin(false)} services={services} setServices={setServices} entities={entities} setEntities={setEntities}/>}
      {showPwd&&<ChangePwdModal cur={cur} users={users} setUsers={setUsers} setCur={setCur} isAdmin={isAdmin} onClose={()=>setShowPwd(false)}/>}
    </div>
  );
}
