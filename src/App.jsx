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
const dbGet   = (t, q="")    => sbFetch(`${t}?${q}`,             { method:"GET", prefer:"" });
const dbPost  = (t, b)       => sbFetch(t,                        { method:"POST", body:JSON.stringify(b) });
const dbPatch = (t, match, b)=> sbFetch(`${t}?${match}`,         { method:"PATCH", body:JSON.stringify(b) });
const dbDel   = (t, match)   => sbFetch(`${t}?${match}`,         { method:"DELETE", prefer:"return=minimal", headers:{} });

// ─── THEMES ──────────────────────────────────────────────────────
const THEMES = {
  navy: {
    name:"Navy Dark", dot:"#2f7fd4",
    bg0:"#060d18",bg1:"#0b1525",bg2:"#101e30",bg3:"#152540",bg4:"#1a2d4a",
    border:"#1e3554",border2:"#2a4a6e",
    txt:"#dce8f8",txt2:"#7a9fc4",txt3:"#435e7a",
    blue:"#2f7fd4",blue2:"#5299e8",indigo:"#5b5fef",teal:"#0fa896",
    green:"#0ea572",amber:"#e8960a",orange:"#f07020",
    red:"#e03c3c",purple:"#9b7cf8",pink:"#e86ca0",
  },
  charcoal: {
    name:"Charcoal", dot:"#64748b",
    bg0:"#0a0a0f",bg1:"#111318",bg2:"#181b22",bg3:"#1e2230",bg4:"#252a38",
    border:"#2a2f3e",border2:"#363d52",
    txt:"#e2e4ee",txt2:"#8892aa",txt3:"#4a5168",
    blue:"#3b82f6",blue2:"#60a5fa",indigo:"#6366f1",teal:"#14b8a6",
    green:"#10b981",amber:"#f59e0b",orange:"#f97316",
    red:"#ef4444",purple:"#a78bfa",pink:"#f472b6",
  },
  forest: {
    name:"Forest Dark", dot:"#16a34a",
    bg0:"#030f07",bg1:"#071510",bg2:"#0c1e14",bg3:"#11271a",bg4:"#162e20",
    border:"#1a3824",border2:"#234d30",
    txt:"#d4eed9",txt2:"#6aaa7c",txt3:"#3a6648",
    blue:"#3b82f6",blue2:"#60a5fa",indigo:"#818cf8",teal:"#2dd4bf",
    green:"#22c55e",amber:"#eab308",orange:"#f97316",
    red:"#f87171",purple:"#c084fc",pink:"#f472b6",
  },
  bordeaux: {
    name:"Bordeaux", dot:"#be123c",
    bg0:"#0f0508",bg1:"#180a0e",bg2:"#200e14",bg3:"#2a121a",bg4:"#341620",
    border:"#3f1a26",border2:"#562232",
    txt:"#f0d8de",txt2:"#b07080",txt3:"#6b3f4a",
    blue:"#60a5fa",blue2:"#93c5fd",indigo:"#a78bfa",teal:"#2dd4bf",
    green:"#4ade80",amber:"#fbbf24",orange:"#fb923c",
    red:"#fb7185",purple:"#e879f9",pink:"#f9a8d4",
  },
  purple: {
    name:"Midnight Purple", dot:"#7c3aed",
    bg0:"#07030f",bg1:"#0e0818",bg2:"#130c22",bg3:"#19102e",bg4:"#1f143a",
    border:"#261848",border2:"#32205e",
    txt:"#ede0ff",txt2:"#9b7fc4",txt3:"#5a3f7a",
    blue:"#60a5fa",blue2:"#93c5fd",indigo:"#818cf8",teal:"#2dd4bf",
    green:"#34d399",amber:"#fbbf24",orange:"#fb923c",
    red:"#f87171",purple:"#c084fc",pink:"#f472b6",
  },
};

let C = THEMES.navy;

// ─── CONSTANTS ───────────────────────────────────────────────────
const STAGES    = ["New","Contacted","Interested","Meeting Scheduled","Meeting Done","Proposal Sent","Negotiation","Closed Won","Closed Lost","No Answer"];
const TEMPS     = ["🔥 Hot","🟡 Warm","❄️ Cold"];
const SOURCES   = ["ANOFM","LinkedIn","Cold Call","Referral","Our Website / Marketing","Trade Fair / Event","Email Campaign","Client Referral","Polish Sales Team"];
const INDUSTRIES= ["Auto Parts","Textile","Food Production","Metal Fabrication","Electronics","Logistics","Construction","Other"];
const COUNTIES  = ["Ilfov","Prahova","Cluj","Timiș","Argeș","Brașov","Sibiu","Bacău","Galați","Other"];
const SERVICES  = ["Outsourcing","Direct Sale","Temporary Staffing"];
const ENTITIES  = ["Gremi Personal RO","Antforce SRL"];

const SC = {
  "New":C.txt3,"Contacted":C.blue,"Interested":C.indigo,
  "Meeting Scheduled":C.amber,"Meeting Done":C.orange,"Proposal Sent":C.teal,
  "Negotiation":C.pink,"Closed Won":C.green,"Closed Lost":C.red,"No Answer":C.txt3,
};

const EMPTY_LOC = {id:null,parent_id:null,company:"",location:"",address:"",contact:"",role:"",phone:"",email:"",county:"",industry:"",employees:"",stage:"New",temp:"❄️ Cold",workers:"",next_action:"",last_contact:"",source:"",service:"Outsourcing",company_name:"Gremi Personal RO",sales_id:null,notes:""};
const EMPTY_HQ  = {id:null,company:"",industry:"",central_contact:"",central_role:"",central_phone:"",central_email:"",website:"",notes:""};

// ─── HELPERS ─────────────────────────────────────────────────────
const fmtDate  = d => { if(!d) return "—"; try { return new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short"}); } catch(e){ return "—"; }};
const isOD     = (d,s) => { if(!d||s==="Closed Won"||s==="Closed Lost") return false; try { return new Date(d)<new Date(); } catch(e){ return false; }};
const daysLeft = d => { if(!d) return null; try { return Math.ceil((new Date(d)-new Date())/86400000); } catch(e){ return null; }};

// ─── CSS ─────────────────────────────────────────────────────────
const makeCSS = (C) => `
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
    }catch(e){setErr("Connection error — check your internet.");}
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
  const save=async()=>{
    const tgt=users.find(u=>u.id===tid); if(!tgt)return;
    if(tid===cur.id&&tgt.password!==old_){setMsg({t:"Current password incorrect.",ok:false});return;}
    if(nw.length<4){setMsg({t:"Min 4 characters.",ok:false});return;}
    if(nw!==cf){setMsg({t:"Passwords don't match.",ok:false});return;}
    try{
      await dbPatch("crm_users",`id=eq.${tid}`,{password:nw});
      setUsers(users.map(u=>u.id===tid?{...u,password:nw}:u));
      if(tid===cur.id)setCur({...cur,password:nw});
      setMsg({t:"Password updated!",ok:true});setTimeout(onClose,1200);
    }catch(e){setMsg({t:"Error saving.",ok:false});}
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
function AdminPanel({users,setUsers,cur,onClose}) {
  const [showAdd,setShowAdd]=useState(false);
  const [nu,setNu]=useState({name:"",username:"",password:"",role:"user"});
  const [err,setErr]=useState("");
  const add=async()=>{
    if(!nu.name||!nu.username||!nu.password){setErr("All fields required.");return;}
    if(users.find(u=>u.username===nu.username.toLowerCase())){setErr("Username exists.");return;}
    try{
      const created=await dbPost("crm_users",{...nu,username:nu.username.toLowerCase(),active:true});
      setUsers([...users,created[0]]);
      setNu({name:"",username:"",password:"",role:"user"});setShowAdd(false);setErr("");
    }catch(e){setErr("Error creating user.");}
  };
  const toggleActive=async(u)=>{
    await dbPatch("crm_users",`id=eq.${u.id}`,{active:!u.active});
    setUsers(users.map(x=>x.id===u.id?{...x,active:!x.active}:x));
  };
  const toggleRole=async(u)=>{
    const r=u.role==="admin"?"user":"admin";
    await dbPatch("crm_users",`id=eq.${u.id}`,{role:r});
    setUsers(users.map(x=>x.id===u.id?{...x,role:r}:x));
  };
  const deleteUser=async(u)=>{
    // Only deletes the login — all their CRM data stays in the database
    await dbDel("crm_users",`id=eq.${u.id}`);
    setUsers(users.filter(x=>x.id!==u.id));
  };
  return(
    <div className="modal" style={{zIndex:200}}>
      <div className="mh"><div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:16,color:C.txt}}>Admin Panel</div><div style={{fontSize:11,color:C.txt3}}>User Management</div></div><button className="xb" onClick={onClose}>×</button></div>
      <div className="ms">
        <div style={{background:`${C.amber}18`,border:`1px solid ${C.amber}44`,borderRadius:8,padding:"10px 12px",fontSize:11,color:C.amber}}>
          ℹ️ Deleting a user removes their login only. All CRM data they entered stays in the system.
        </div>
        {users.map(u=>(
          <div key={u.id} style={{background:C.bg3,border:`1px solid ${u.active?C.border:C.red+"55"}`,borderLeft:`3px solid ${u.active?C.green:C.red}`,borderRadius:10,padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <div><div style={{fontWeight:600,fontSize:14,color:C.txt}}>{u.name}</div><div style={{fontSize:11,color:C.txt3}}>@{u.username}</div></div>
              <div style={{display:"flex",gap:5}}>
                <span className="pill" style={{background:u.role==="admin"?`${C.purple}22`:C.bg4,color:u.role==="admin"?C.purple:C.blue,border:`1px solid ${u.role==="admin"?C.purple+"55":C.border}`}}>{u.role.toUpperCase()}</span>
                <span className="pill" style={{background:u.active?`${C.green}18`:`${C.red}18`,color:u.active?C.green:C.red,border:`1px solid ${u.active?C.green+"44":C.red+"44"}`}}>{u.active?"ACTIVE":"BLOCKED"}</span>
              </div>
            </div>
            {u.id!==cur.id?(
              <div style={{display:"flex",gap:6}}>
                <button className="btn" onClick={()=>toggleActive(u)} style={{flex:1,padding:"8px",fontSize:11,borderRadius:7,background:u.active?`${C.red}18`:`${C.green}18`,color:u.active?C.red:C.green,border:`1px solid ${u.active?C.red+"44":C.green+"44"}`}}>{u.active?"Block":"Unblock"}</button>
                <button className="btn" onClick={()=>toggleRole(u)} style={{flex:1,padding:"8px",fontSize:11,borderRadius:7,background:C.bg4,color:C.txt2,border:`1px solid ${C.border}`}}>{u.role==="admin"?"→ User":"→ Admin"}</button>
                <button className="btn" onClick={()=>deleteUser(u)} style={{padding:"8px 12px",fontSize:13,borderRadius:7,background:`${C.red}18`,color:C.red,border:`1px solid ${C.red}44`}}>✕</button>
              </div>
            ):<div style={{fontSize:11,color:C.txt3,fontStyle:"italic"}}>Your account</div>}
          </div>
        ))}
        {showAdd?(
          <div style={{background:C.bg3,border:`1px solid ${C.blue}55`,borderRadius:10,padding:14,display:"flex",flexDirection:"column",gap:10}}>
            <div style={{fontWeight:600,fontSize:13,color:C.blue}}>NEW USER</div>
            {[["FULL NAME","name","text"],["USERNAME","username","text"],["PASSWORD","password","password"]].map(([l,k,t])=>(
              <div key={k}><div className="lbl">{l}</div><input type={t} value={nu[k]} onChange={e=>setNu({...nu,[k]:e.target.value})} className="fi"/></div>
            ))}
            <div><div className="lbl">ROLE</div><select value={nu.role} onChange={e=>setNu({...nu,role:e.target.value})} className="fi"><option value="user">User (Salesperson)</option><option value="admin">Admin</option></select></div>
            {err&&<div style={{padding:"9px",borderRadius:7,fontSize:12,background:`${C.red}18`,border:`1px solid ${C.red}44`,color:C.red}}>{err}</div>}
            <div style={{display:"flex",gap:8}}>
              <button className="btn" onClick={add} style={{flex:1,background:`linear-gradient(135deg,${C.green},${C.teal})`,color:"#fff",borderRadius:8,padding:"10px",fontSize:12}}>Add User</button>
              <button className="btn" onClick={()=>{setShowAdd(false);setErr("");}} style={{flex:1,background:C.bg4,color:C.txt2,borderRadius:8,padding:"10px",fontSize:12,border:`1px solid ${C.border}`}}>Cancel</button>
            </div>
          </div>
        ):(
          <button className="btn" onClick={()=>setShowAdd(true)} style={{width:"100%",background:"transparent",color:C.blue,padding:"13px",fontSize:12,border:`2px dashed ${C.border2}`,borderRadius:10}}>+ Add New User</button>
        )}
      </div>
    </div>
  );
}

// ─── FILTER BAR ──────────────────────────────────────────────────
function FilterBar({filters,setFilters,users,isAdmin}) {
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
    filters.stage!=="All"&&{k:"stage",v:filters.stage,c:C.indigo},
    filters.temp!=="All"&&{k:"temp",v:filters.temp,c:C.amber},
    filters.service!=="All"&&{k:"service",v:filters.service,c:C.blue},
    filters.entity!=="All"&&{k:"entity",v:filters.entity,c:C.teal},
    filters.county!=="All"&&{k:"county",v:filters.county,c:C.green},
    filters.industry!=="All"&&{k:"industry",v:filters.industry,c:C.orange},
    filters.salesId!=="All"&&{k:"salesId",v:users.find(u=>String(u.id)===filters.salesId)?.name,c:C.purple},
    filters.overdueOnly&&{k:"overdueOnly",v:"⚠ Overdue",c:C.red},
  ].filter(Boolean);
  return(
    <div style={{background:C.bg0,borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
      <div style={{padding:"8px 12px",display:"flex",gap:7,alignItems:"center",overflowX:"auto"}}>
        <button className="btn" onClick={()=>setOpen(!open)} style={{background:open||active>0?`${C.blue}22`:C.bg3,color:open||active>0?C.blue2:C.txt3,padding:"6px 11px",fontSize:11,borderRadius:7,border:`1.5px solid ${open||active>0?C.blue:C.border}`,flexShrink:0}}>
          ⚙ Filters{active>0?` (${active})`:""}
        </button>
        {chips.map(ch=>(
          <span key={ch.k} className="chip" style={{background:`${ch.c}18`,color:ch.c,borderColor:`${ch.c}44`}} onClick={()=>setFilters({...filters,[ch.k]:ch.k==="overdueOnly"?false:"All"})}>
            {ch.v} ×
          </span>
        ))}
        {active>0&&<button className="btn" onClick={()=>setFilters({stage:"All",temp:"All",service:"All",entity:"All",county:"All",industry:"All",salesId:"All",overdueOnly:false,showLocs:filters.showLocs})} style={{background:"transparent",color:C.red,padding:"6px 10px",fontSize:11,borderRadius:7,border:`1px solid ${C.red}44`,flexShrink:0}}>Clear all</button>}
      </div>
      {open&&(
        <div style={{padding:"12px",borderTop:`1px solid ${C.border}`,display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Sel label="STAGE" k="stage" opts={STAGES}/>
            <Sel label="TEMPERATURE" k="temp" opts={TEMPS}/>
            <Sel label="SERVICE" k="service" opts={SERVICES}/>
            <Sel label="ENTITY" k="entity" opts={ENTITIES}/>
            <Sel label="COUNTY" k="county" opts={COUNTIES}/>
            <Sel label="INDUSTRY" k="industry" opts={INDUSTRIES}/>
            {isAdmin&&<Sel label="SALESPERSON" k="salesId" opts={users.filter(u=>u.active).map(u=>({v:String(u.id),l:u.name}))}/>}
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
        const ul=locs.filter(l=>l.sales_id===u.id);
        const won=ul.filter(l=>l.stage==="Closed Won");
        const pipe=ul.filter(l=>l.stage!=="Closed Won"&&l.stage!=="Closed Lost");
        const late=ul.filter(l=>isOD(l.next_action,l.stage));
        const placed=won.reduce((s,l)=>s+(parseInt(l.workers)||0),0);
        const isE=exp===u.id;
        return(
          <div key={u.id} style={{background:C.bg2,border:`1px solid ${isE?C.blue:C.border}`,borderRadius:12,overflow:"hidden"}}>
            <div onClick={()=>setExp(isE?null:u.id)} style={{padding:"13px 14px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:34,height:34,borderRadius:10,background:`linear-gradient(135deg,${C.blue},${C.indigo})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,color:"#fff",flexShrink:0}}>{u.name[0]}</div>
                <div><div style={{fontWeight:600,fontSize:14,color:C.txt}}>{u.name}</div><div style={{fontSize:11,color:C.txt3}}>{ul.length} locations · {placed} workers placed</div></div>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {late.length>0&&<span className="pill" style={{background:`${C.red}18`,color:C.red,border:`1px solid ${C.red}44`}}>⚠{late.length}</span>}
                <span className="pill" style={{background:`${C.green}18`,color:C.green,border:`1px solid ${C.green}44`}}>{ul.length?Math.round(won.length/ul.length*100):0}%</span>
                <span style={{color:C.txt3}}>{isE?"▲":"▼"}</span>
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
              <div style={{borderTop:`1px solid ${C.border}`}}>
                {ul.length===0&&<div style={{padding:"18px",textAlign:"center",color:C.txt3,fontSize:12}}>No locations assigned</div>}
                {ul.map(l=>{
                  const sc=SC[l.stage]||C.txt3;const od=isOD(l.next_action,l.stage);
                  return(
                    <div key={l.id} className="row-hover" onClick={()=>onSelect(l)} style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{flex:1,minWidth:0}}><div style={{fontWeight:500,fontSize:13,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.company}</div><div style={{fontSize:11,color:C.txt3}}>📍 {l.location} · {l.county}</div></div>
                      <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0,marginLeft:8}}>
                        <span className="pill" style={{background:sc+"22",color:sc,border:`1px solid ${sc}44`}}>{l.stage}</span>
                        {od&&<span className="pill" style={{background:`${C.red}18`,color:C.red,border:`1px solid ${C.red}44`}}>⚠OD</span>}
                        {l.workers&&<span style={{fontSize:11,color:C.amber}}>👷{l.workers}</span>}
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
  const hqLocs=locs.filter(l=>l.parent_id===hq.id);
  const totalW=hqLocs.reduce((s,l)=>s+(parseInt(l.workers)||0),0);
  const stages=[...new Set(hqLocs.map(l=>l.stage))];
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
          <div style={{fontWeight:700,fontSize:15,color:C.txt}}>{hq.central_contact||"—"}</div>
          <div style={{fontSize:12,color:C.txt3,marginBottom:10}}>{hq.central_role||"—"}</div>
          {hq.central_phone&&<a href={"tel:"+hq.central_phone} style={{display:"block",background:`${C.blue}18`,border:`1px solid ${C.blue}44`,color:C.blue2,padding:"10px",fontSize:13,fontWeight:600,textAlign:"center",marginBottom:8,textDecoration:"none",borderRadius:8}}>📞 {hq.central_phone}</a>}
          {hq.central_email&&<a href={"mailto:"+hq.central_email} style={{display:"block",background:`${C.teal}18`,border:`1px solid ${C.teal}44`,color:C.teal,padding:"10px",fontSize:13,fontWeight:600,textAlign:"center",marginBottom:8,textDecoration:"none",borderRadius:8}}>✉ {hq.central_email}</a>}
          {hq.website&&<a href={hq.website.startsWith("http")?hq.website:"https://"+hq.website} target="_blank" rel="noreferrer" style={{display:"block",background:`${C.indigo}18`,border:`1px solid ${C.indigo}44`,color:C.purple,padding:"10px",fontSize:13,fontWeight:600,textAlign:"center",textDecoration:"none",borderRadius:8}}>🌐 {hq.website}</a>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          <div className="kv" style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:700,color:C.blue,fontFamily:"'Space Grotesk',sans-serif"}}>{hqLocs.length}</div><div className="lbl" style={{marginBottom:0}}>Locations</div></div>
          <div className="kv" style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:700,color:C.amber,fontFamily:"'Space Grotesk',sans-serif"}}>{totalW}</div><div className="lbl" style={{marginBottom:0}}>Workers</div></div>
          <div className="kv" style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:700,color:C.green,fontFamily:"'Space Grotesk',sans-serif"}}>{hqLocs.filter(l=>l.stage==="Closed Won").length}</div><div className="lbl" style={{marginBottom:0}}>Won</div></div>
        </div>
        {stages.length>0&&(
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {stages.map(s=>{const cnt=hqLocs.filter(l=>l.stage===s).length;const c=SC[s]||C.txt3;return <span key={s} className="pill" style={{background:c+"22",color:c,border:`1px solid ${c}44`,fontSize:11,padding:"4px 10px"}}>{s} ({cnt})</span>;})}
          </div>
        )}
        {hq.notes&&<div style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}><div className="lbl">NOTES</div><div style={{fontSize:13,color:C.txt2,lineHeight:1.7}}>{hq.notes}</div></div>}
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:11,fontWeight:600,color:C.txt3,letterSpacing:"0.08em"}}>LOCATIONS / DEALS ({hqLocs.length})</div>
            <button className="btn" onClick={onAddLoc} style={{background:`linear-gradient(135deg,${C.blue},${C.indigo})`,color:"#fff",padding:"6px 12px",fontSize:11,borderRadius:7}}>+ Add Location</button>
          </div>
          {hqLocs.length===0&&<div style={{fontSize:12,color:C.txt3,padding:"14px",background:C.bg3,borderRadius:8,border:`1px dashed ${C.border2}`,textAlign:"center"}}>No locations yet — add the first deal</div>}
          {hqLocs.map(l=>{
            const sc=SC[l.stage]||C.txt3;const od=isOD(l.next_action,l.stage);const dl=daysLeft(l.next_action);
            const uName=users.find(u=>u.id===l.sales_id)?.name||"—";
            const sameLocOrders=hqLocs.filter(x=>x.location===l.location);
            const orderIdx=sameLocOrders.indexOf(l);
            return(
              <div key={l.id} className="row-hover" onClick={()=>onSelectLoc(l)} style={{background:C.bg3,border:`1px solid ${C.border}`,borderLeft:`3px solid ${sc}`,borderRadius:10,padding:"12px 14px",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <div style={{fontWeight:600,fontSize:13,color:C.txt}}>📍 {l.location}</div>
                      {sameLocOrders.length>1&&<span className="pill" style={{background:`${C.orange}18`,color:C.orange,border:`1px solid ${C.orange}44`,fontSize:9}}>Order {orderIdx+1}/{sameLocOrders.length}</span>}
                    </div>
                    <div style={{fontSize:11,color:C.txt3,marginTop:2}}>{l.address?<span>{l.address} · </span>:""}{l.contact} · {l.county} · <span style={{color:C.blue}}>{uName}</span></div>
                  </div>
                  <span style={{fontSize:16,flexShrink:0}}>{l.temp}</span>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
                  <span className="pill" style={{background:sc+"22",color:sc,border:`1px solid ${sc}44`}}>{l.stage}</span>
                  {l.service&&<span className="pill" style={{background:`${C.blue}18`,color:C.blue2,border:`1px solid ${C.blue}33`}}>{l.service}</span>}
                  <span className="pill" style={{background:`${C.amber}18`,color:C.amber,border:`1px solid ${C.amber}33`}}>👷 {l.workers||"TBD"}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.txt3}}>
                  <span>{l.county}</span>
                  <span style={{color:od?C.red:(dl!==null&&dl<=3)?C.amber:C.txt3,fontWeight:(od||(dl!==null&&dl<=3))?600:400}}>{od?"⚠ ":""}{fmtDate(l.next_action)}{(!od&&dl!==null&&dl<=3)?" ("+dl+"d)":""}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mf" style={{display:"flex",gap:10}}>
        <button className="btn" onClick={onEditHQ} style={{flex:1,background:C.bg3,color:C.txt2,padding:"13px",fontSize:13,borderRadius:10,border:`1px solid ${C.border}`}}>✎ Edit HQ Info</button>
        {isAdmin&&<button className="btn" onClick={onDeleteHQ} style={{background:`${C.red}18`,color:C.red,padding:"13px 18px",fontSize:16,border:`1px solid ${C.red}44`,borderRadius:10}}>✕</button>}
      </div>
    </div>
  );
}

// ─── LOCATION DETAIL MODAL ───────────────────────────────────────
function LocDetailModal({loc,hqs,users,isAdmin,onClose,onEdit,onDelete,onUpdate,onNewOrder}) {
  const hq=hqs.find(h=>h.id===loc.parent_id);
  const sc=SC[loc.stage]||C.txt3;
  const uN=(id)=>users.find(u=>u.id===id)?.name||"—";
  return(
    <div className="modal" style={{zIndex:110}}>
      <div className="mh">
        <div style={{flex:1,minWidth:0,paddingRight:10}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
            <span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:16,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{loc.company}</span>
          </div>
          <div style={{fontSize:11,color:C.txt3}}>📍 {loc.location}{loc.address?" · "+loc.address:""} · {loc.county}{hq?<span style={{color:C.indigo}}> · ↑ {hq.company}</span>:""}</div>
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
          {loc.email&&<a href={"mailto:"+loc.email} style={{display:"block",background:`${C.teal}18`,border:`1px solid ${C.teal}44`,color:C.teal,padding:"11px",fontSize:13,fontWeight:600,textAlign:"center",textDecoration:"none",borderRadius:8}}>✉ {loc.email}</a>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["SERVICE",loc.service||"—"],["ENTITY",loc.company_name||"—"],["WORKERS NEEDED",loc.workers||"—"],["EMPLOYEES",loc.employees||"—"],["SOURCE",loc.source||"—"],["NEXT ACTION",fmtDate(loc.next_action)],["LAST CONTACT",fmtDate(loc.last_contact)],["SALESPERSON",uN(loc.sales_id)],["INDUSTRY",loc.industry||"—"]].map(([l,v])=>(
            <div key={l} className="kv"><div className="lbl">{l}</div><div style={{fontSize:12,color:C.txt,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v}</div></div>
          ))}
        </div>
        {loc.address&&<a href={"https://maps.google.com/?q="+encodeURIComponent(loc.address)} target="_blank" rel="noreferrer" style={{display:"block",background:`${C.purple}18`,border:`1px solid ${C.purple}44`,color:C.purple,padding:"11px 13px",fontSize:13,fontWeight:500,textDecoration:"none",borderRadius:8}}>📍 {loc.address}</a>}
        {loc.notes&&<div style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}><div className="lbl">NOTES</div><div style={{fontSize:13,color:C.txt2,lineHeight:1.7}}>{loc.notes}</div></div>}
        {hq&&<div style={{background:C.bg3,border:`1px solid ${C.indigo}44`,borderRadius:10,padding:12,cursor:"pointer"}} onClick={onClose}><div className="lbl">PARENT COMPANY</div><div style={{fontWeight:600,fontSize:13,color:C.indigo}}>🏢 {hq.company}</div><div style={{fontSize:11,color:C.txt3,marginTop:2}}>{hq.central_contact} · {hq.industry}</div></div>}
      </div>
      <div className="mf" style={{display:"flex",gap:10}}>
        <button className="btn" onClick={onEdit} style={{flex:1,background:`linear-gradient(135deg,${C.blue},${C.indigo})`,color:"#fff",padding:"13px",fontSize:14,borderRadius:10}}>✎ Edit</button>
        <button className="btn" onClick={onNewOrder} style={{flex:1,background:`linear-gradient(135deg,${C.green},${C.teal})`,color:"#fff",padding:"13px",fontSize:13,borderRadius:10}}>+ New Order</button>
        {isAdmin&&<button className="btn" onClick={onDelete} style={{background:`${C.red}18`,color:C.red,padding:"13px 16px",fontSize:16,border:`1px solid ${C.red}44`,borderRadius:10}}>✕</button>}
      </div>
    </div>
  );
}

// ─── LOCATION FORM ────────────────────────────────────────────────
function LocFormModal({form,setForm,onSave,onClose,editMode,users,isAdmin,hqs}) {
  const [newCo,setNewCo]=useState(!form.parent_id&&!editMode);
  const [newHQ,setNewHQ]=useState({company:"",industry:"",central_contact:"",central_role:"",central_phone:"",central_email:"",website:"",notes:""});
  return(
    <div className="modal" style={{zIndex:150}}>
      <div className="mh"><div style={{fontWeight:700,fontSize:16,color:C.txt}}>{editMode?"Edit Location":"New Location / Deal"}</div><button className="xb" onClick={onClose}>×</button></div>
      <div className="ms">
        {!editMode&&(
          <div style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
            <div className="lbl">COMPANY</div>
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              <button className="btn" onClick={()=>setNewCo(false)} style={{flex:1,padding:"8px",fontSize:12,borderRadius:7,background:!newCo?`${C.blue}22`:C.bg4,color:!newCo?C.blue2:C.txt3,border:`1.5px solid ${!newCo?C.blue:C.border}`}}>Existing Company</button>
              <button className="btn" onClick={()=>{setNewCo(true);setForm({...form,parent_id:null,company:""}); }} style={{flex:1,padding:"8px",fontSize:12,borderRadius:7,background:newCo?`${C.green}22`:C.bg4,color:newCo?C.green:C.txt3,border:`1.5px solid ${newCo?C.green:C.border}`}}>+ New Company</button>
            </div>
            {!newCo?(
              <select value={form.parent_id||""} onChange={e=>{const id=Number(e.target.value);const h=hqs.find(x=>x.id===id);setForm({...form,parent_id:id||null,company:h?.company||form.company,industry:h?.industry||form.industry});}} className="fi">
                <option value="">— select company —</option>
                {hqs.map(h=><option key={h.id} value={h.id}>{h.company}</option>)}
              </select>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div><div className="lbl">COMPANY NAME *</div><input type="text" value={newHQ.company} onChange={e=>{setNewHQ({...newHQ,company:e.target.value});setForm({...form,company:e.target.value});}} className="fi" placeholder="e.g. Autoliv Romania"/></div>
                <div><div className="lbl">INDUSTRY</div><select value={newHQ.industry} onChange={e=>setNewHQ({...newHQ,industry:e.target.value})} className="fi"><option value="">— select —</option>{INDUSTRIES.map(i=><option key={i}>{i}</option>)}</select></div>
                <div><div className="lbl">CENTRAL CONTACT (HQ)</div><input type="text" value={newHQ.central_contact} onChange={e=>setNewHQ({...newHQ,central_contact:e.target.value})} className="fi" placeholder="Main decision maker"/></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div><div className="lbl">HQ PHONE</div><input type="tel" value={newHQ.central_phone} onChange={e=>setNewHQ({...newHQ,central_phone:e.target.value})} className="fi"/></div>
                  <div><div className="lbl">HQ EMAIL</div><input type="email" value={newHQ.central_email} onChange={e=>setNewHQ({...newHQ,central_email:e.target.value})} className="fi"/></div>
                </div>
                <div><div className="lbl">WEBSITE</div><input type="url" value={newHQ.website||""} onChange={e=>setNewHQ({...newHQ,website:e.target.value})} className="fi" placeholder="https://www.company.ro"/></div>
              </div>
            )}
          </div>
        )}
        <div style={{height:1,background:C.border}}/>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:11,fontWeight:600,color:C.txt3,letterSpacing:"0.08em"}}>LOCATION DETAILS</div>
        <div><div className="lbl">LOCATION NAME *</div><input type="text" value={form.location} onChange={e=>setForm({...form,location:e.target.value})} className="fi" placeholder="e.g. Plant Cluj, Warehouse North"/></div>
        <div><div className="lbl">ADDRESS</div><input type="text" value={form.address||""} onChange={e=>setForm({...form,address:e.target.value})} className="fi" placeholder="e.g. Str. Industriilor 14, Cluj-Napoca"/></div>
        <div><div className="lbl">LOCAL CONTACT</div><input type="text" value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} className="fi" placeholder="Name of person who orders"/></div>
        <div><div className="lbl">CONTACT ROLE</div><input type="text" value={form.role} onChange={e=>setForm({...form,role:e.target.value})} className="fi" placeholder="e.g. Plant Manager"/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><div className="lbl">PHONE</div><input type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="fi"/></div>
          <div><div className="lbl">EMAIL</div><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="fi"/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><div className="lbl">COUNTY</div><select value={form.county} onChange={e=>setForm({...form,county:e.target.value})} className="fi"><option value="">— select —</option>{COUNTIES.map(o=><option key={o}>{o}</option>)}</select></div>
          <div><div className="lbl">EMPLOYEES (at location)</div><input type="number" value={form.employees} onChange={e=>setForm({...form,employees:e.target.value})} className="fi"/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><div className="lbl">WORKERS NEEDED</div><input type="number" value={form.workers} onChange={e=>setForm({...form,workers:e.target.value})} className="fi" placeholder="Leave blank if unknown"/></div>
          <div><div className="lbl">INDUSTRY</div><select value={form.industry} onChange={e=>setForm({...form,industry:e.target.value})} className="fi"><option value="">— select —</option>{INDUSTRIES.map(o=><option key={o}>{o}</option>)}</select></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><div className="lbl">STAGE</div><select value={form.stage} onChange={e=>setForm({...form,stage:e.target.value})} className="fi">{STAGES.map(o=><option key={o}>{o}</option>)}</select></div>
          <div><div className="lbl">TEMPERATURE</div><select value={form.temp} onChange={e=>setForm({...form,temp:e.target.value})} className="fi">{TEMPS.map(o=><option key={o}>{o}</option>)}</select></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><div className="lbl">NEXT ACTION</div><input type="date" value={form.next_action} onChange={e=>setForm({...form,next_action:e.target.value})} className="fi"/></div>
          <div><div className="lbl">LAST CONTACT</div><input type="date" value={form.last_contact} onChange={e=>setForm({...form,last_contact:e.target.value})} className="fi"/></div>
        </div>
        {[["SOURCE","source",SOURCES],["SERVICE","service",SERVICES],["GREMI ENTITY","company_name",ENTITIES]].map(([l,k,opts])=>(
          <div key={k}><div className="lbl">{l}</div><select value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} className="fi"><option value="">— select —</option>{opts.map(o=><option key={o}>{o}</option>)}</select></div>
        ))}
        {isAdmin&&<div><div className="lbl">SALESPERSON</div><select value={form.sales_id||""} onChange={e=>setForm({...form,sales_id:Number(e.target.value)})} className="fi"><option value="">— select —</option>{users.filter(u=>u.active).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></div>}
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
        <div><div className="lbl">CENTRAL CONTACT</div><input type="text" value={form.central_contact} onChange={e=>setForm({...form,central_contact:e.target.value})} className="fi"/></div>
        <div><div className="lbl">CENTRAL ROLE</div><input type="text" value={form.central_role} onChange={e=>setForm({...form,central_role:e.target.value})} className="fi"/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><div className="lbl">HQ PHONE</div><input type="tel" value={form.central_phone} onChange={e=>setForm({...form,central_phone:e.target.value})} className="fi"/></div>
          <div><div className="lbl">HQ EMAIL</div><input type="email" value={form.central_email} onChange={e=>setForm({...form,central_email:e.target.value})} className="fi"/></div>
        </div>
        <div><div className="lbl">WEBSITE</div><input type="url" value={form.website||""} onChange={e=>setForm({...form,website:e.target.value})} className="fi" placeholder="https://www.company.ro"/></div>
        <div><div className="lbl">NOTES</div><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={3} className="fi" style={{resize:"vertical",lineHeight:1.7}}/></div>
      </div>
      <div className="mf"><button className="btn" onClick={onSave} style={{width:"100%",background:`linear-gradient(135deg,${C.blue},${C.indigo})`,color:"#fff",padding:"14px",fontSize:15,borderRadius:10}}>Save</button></div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────
export default function GremiCRM() {
  const [users,setUsers]   = useState([]);
  const [cur,setCur]       = useState(null);
  const [hqs,setHqs]       = useState([]);
  const [locs,setLocs]     = useState([]);
  const [loading,setLoading] = useState(true);
  const [dbError,setDbError] = useState("");

  const [tab,setTab]             = useState("leads");
  const [selHQ,setSelHQ]         = useState(null);
  const [selLoc,setSelLoc]       = useState(null);
  const [showLocForm,setShowLocForm] = useState(false);
  const [showHQForm,setShowHQForm]   = useState(false);
  const [editLocMode,setEditLocMode] = useState(false);
  const [locForm,setLocForm]     = useState({...EMPTY_LOC});
  const [hqForm,setHqForm]       = useState({...EMPTY_HQ});
  const [search,setSearch]       = useState("");
  const [filters,setFilters]     = useState({stage:"All",temp:"All",service:"All",entity:"All",county:"All",industry:"All",salesId:"All",overdueOnly:false,showLocs:false});
  const [showAdmin,setShowAdmin] = useState(false);
  const [showPwd,setShowPwd]     = useState(false);
  const [themeKey,setThemeKey]   = useState("navy");
  const [showTheme,setShowTheme] = useState(false);

  C = THEMES[themeKey];
  const CSS = makeCSS(C);
  const isAdmin = cur?.role==="admin";
  const uN=(id)=>users.find(u=>u.id===id)?.name||"—";

  // ── Load all data ──
  const loadAll = useCallback(async () => {
    try {
      const [u,h,l] = await Promise.all([
        dbGet("crm_users","order=id.asc"),
        dbGet("crm_hqs","order=id.asc"),
        dbGet("crm_locs","order=id.asc"),
      ]);
      setUsers(u); setHqs(h); setLocs(l); setDbError("");
    } catch(e) {
      setDbError("Cannot connect to database. Check your internet connection.");
    }
    setLoading(false);
  }, []);

  useEffect(()=>{loadAll();},[loadAll]);

  // ── Auto-refresh every 20s for real-time sync ──
  useEffect(()=>{
    if(!cur)return;
    const iv=setInterval(async()=>{
      try{
        const [h,l]=await Promise.all([dbGet("crm_hqs","order=id.asc"),dbGet("crm_locs","order=id.asc")]);
        setHqs(h);setLocs(l);
      }catch(e){}
    },20000);
    return()=>clearInterval(iv);
  },[cur]);

  if(loading) return(
    <div style={{minHeight:"100vh",background:C.bg0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14}}>
      <style>{CSS}</style>
      <div style={{width:44,height:44,background:`linear-gradient(135deg,${C.blue},${C.indigo})`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:20,color:"#fff"}}>G</div>
      {dbError
        ? <div style={{color:C.red,fontSize:13,textAlign:"center",maxWidth:300,padding:"0 20px"}}>{dbError}<br/><button className="btn" onClick={loadAll} style={{marginTop:12,background:`${C.blue}22`,color:C.blue,padding:"8px 16px",borderRadius:8,border:`1px solid ${C.blue}44`,fontSize:12}}>Retry</button></div>
        : <div style={{color:C.txt3,fontSize:13}}>Loading CRM…</div>
      }
    </div>
  );

  if(!cur) return <><style>{CSS}</style><LoginScreen onLogin={u=>{setCur(u);setLocForm({...EMPTY_LOC,sales_id:u.id});}}/></>;

  // ── Build display pool ──
  const pool=filters.showLocs?locs.map(l=>({...l,_type:"loc"})):hqs.map(h=>({...h,_type:"hq"}));
  const filtered=pool.filter(item=>{
    if(item._type==="hq"){
      const hl=locs.filter(l=>l.parent_id===item.id);
      if(search){const q=search.toLowerCase();if(!item.company.toLowerCase().includes(q)&&!(item.central_contact||"").toLowerCase().includes(q))return false;}
      if(filters.industry!=="All"&&item.industry!==filters.industry)return false;
      if(filters.stage!=="All"&&!hl.some(l=>l.stage===filters.stage))return false;
      if(filters.temp!=="All"&&!hl.some(l=>l.temp===filters.temp))return false;
      if(filters.service!=="All"&&!hl.some(l=>l.service===filters.service))return false;
      if(filters.entity!=="All"&&!hl.some(l=>l.company_name===filters.entity))return false;
      if(filters.county!=="All"&&!hl.some(l=>l.county===filters.county))return false;
      if(filters.salesId!=="All"&&!hl.some(l=>String(l.sales_id)===filters.salesId))return false;
      if(filters.overdueOnly&&!hl.some(l=>isOD(l.next_action,l.stage)))return false;
      return true;
    }else{
      if(search){const q=search.toLowerCase();if(!item.company.toLowerCase().includes(q)&&!(item.location||"").toLowerCase().includes(q)&&!(item.contact||"").toLowerCase().includes(q)&&!(item.county||"").toLowerCase().includes(q))return false;}
      if(filters.stage!=="All"&&item.stage!==filters.stage)return false;
      if(filters.temp!=="All"&&item.temp!==filters.temp)return false;
      if(filters.service!=="All"&&item.service!==filters.service)return false;
      if(filters.entity!=="All"&&item.company_name!==filters.entity)return false;
      if(filters.county!=="All"&&item.county!==filters.county)return false;
      if(filters.industry!=="All"&&item.industry!==filters.industry)return false;
      if(filters.salesId!=="All"&&String(item.sales_id)!==filters.salesId)return false;
      if(filters.overdueOnly&&!isOD(item.next_action,item.stage))return false;
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
      late:locs.filter(l=>isOD(l.next_action,l.stage)).length,
      byStage:Object.fromEntries(STAGES.map(s=>[s,locs.filter(l=>l.stage===s).length])),
    };
  })();

  // ── Save / Update / Delete ──
  const saveLoc=async(newHQData)=>{
    if(!locForm.location)return;
    let parent_id=locForm.parent_id;
    try{
      if(newHQData&&newHQData.company){
        const created=await dbPost("crm_hqs",newHQData);
        parent_id=created[0].id;
        setHqs(prev=>[...prev,created[0]]);
      }
      const company=parent_id?(hqs.find(h=>h.id===parent_id)||{company:locForm.company}).company:locForm.company;
      const {id,_type,...body}={...locForm,parent_id,company,sales_id:locForm.sales_id||cur.id};
      if(editLocMode){
        const upd=await dbPatch("crm_locs",`id=eq.${locForm.id}`,body);
        setLocs(locs.map(l=>l.id===locForm.id?upd[0]:l));setSelLoc(upd[0]);
      }else{
        const created=await dbPost("crm_locs",body);
        setLocs(prev=>[...prev,created[0]]);
      }
      setShowLocForm(false);setEditLocMode(false);
    }catch(e){alert("Error saving: "+e.message);}
  };

  const saveHQ=async()=>{
    try{
      const{id,_type,...body}=hqForm;
      await dbPatch("crm_hqs",`id=eq.${id}`,body);
      setHqs(hqs.map(h=>h.id===id?hqForm:h));
      setLocs(locs.map(l=>l.parent_id===id?{...l,company:hqForm.company}:l));
      if(selLoc?.parent_id===id)setSelLoc({...selLoc,company:hqForm.company});
      setShowHQForm(false);
    }catch(e){alert("Error saving.");}
  };

  const updLoc=async(id,p)=>{
    try{
      await dbPatch("crm_locs",`id=eq.${id}`,p);
      setLocs(locs.map(l=>l.id===id?{...l,...p}:l));
      if(selLoc?.id===id)setSelLoc({...selLoc,...p});
    }catch(e){alert("Error updating.");}
  };

  const deleteLoc=async(id)=>{
    try{await dbDel("crm_locs",`id=eq.${id}`);setLocs(locs.filter(l=>l.id!==id));setSelLoc(null);}
    catch(e){alert("Error deleting.");}
  };

  const deleteHQ=async(id)=>{
    try{await dbDel("crm_hqs",`id=eq.${id}`);setHqs(hqs.filter(h=>h.id!==id));setLocs(locs.filter(l=>l.parent_id!==id));setSelHQ(null);}
    catch(e){alert("Error deleting.");}
  };

  const exportXLSX=()=>{
    const ld=locs.map(l=>({"Company":l.company,"Location":l.location,"Address":l.address,"Contact":l.contact,"Role":l.role,"Phone":l.phone,"Email":l.email,"County":l.county,"Industry":l.industry,"Employees":l.employees,"Stage":l.stage,"Temp":l.temp,"Workers":l.workers,"Service":l.service,"Entity":l.company_name,"Salesperson":uN(l.sales_id),"Next Action":l.next_action,"Last Contact":l.last_contact,"Source":l.source,"Notes":l.notes}));
    const hd=hqs.map(h=>({"Company":h.company,"Industry":h.industry,"Central Contact":h.central_contact,"Role":h.central_role,"Phone":h.central_phone,"Email":h.central_email,"Website":h.website,"Locations":locs.filter(l=>l.parent_id===h.id).length,"Notes":h.notes}));
    const kd=users.filter(u=>u.active).map(u=>{const ul=locs.filter(l=>l.sales_id===u.id);const uw=ul.filter(l=>l.stage==="Closed Won");return{"Name":u.name,"Locations":ul.length,"Won":uw.length,"Pipeline":ul.filter(l=>l.stage!=="Closed Won"&&l.stage!=="Closed Lost").length,"Placed":uw.reduce((s,l)=>s+(parseInt(l.workers)||0),0),"Conv%":ul.length?Math.round(uw.length/ul.length*100):0};});
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(ld),"Locations (Deals)");
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(hd),"Companies (HQ)");
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(kd),"Team KPI");
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(STAGES.map(s=>({"Stage":s,"Count":locs.filter(l=>l.stage===s).length,"Workers":locs.filter(l=>l.stage===s).reduce((x,l)=>x+(parseInt(l.workers)||0),0)}))),"Funnel");
    XLSX.writeFile(wb,`SalesTeamCRM_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const TABS=[["leads","LEADS"],["kpi","KPI"],["tpl","TEMPLATES"],...(isAdmin?[["team","TEAM"]]:[])]

  return(
    <div style={{fontFamily:"'Inter',sans-serif",background:C.bg1,height:"100vh",display:"flex",flexDirection:"column",overflow:"hidden",color:C.txt}}>
      <style>{CSS}</style>

      {/* HEADER */}
      <div style={{background:C.bg0,borderBottom:`1px solid ${C.border}`,padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{width:30,height:30,background:`linear-gradient(135deg,${C.blue},${C.indigo})`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:13,color:"#fff"}}>G</div>
          <div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:14,color:C.txt,lineHeight:1}}>Sales Team CRM</div><div style={{fontSize:9,color:C.txt3,letterSpacing:"0.1em"}}>GREMI · ROMANIA</div></div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          {isAdmin&&<button className="btn" onClick={()=>setShowAdmin(true)} style={{background:`${C.purple}18`,color:C.purple,padding:"6px 10px",fontSize:11,borderRadius:7,border:`1px solid ${C.purple}44`}}>⚙ Admin</button>}
          {isAdmin&&<button className="btn" onClick={exportXLSX} style={{background:`${C.green}18`,color:C.green,padding:"6px 10px",fontSize:11,borderRadius:7,border:`1px solid ${C.green}44`}}>↓ Excel</button>}
          <button className="btn" onClick={loadAll} style={{background:C.bg3,color:C.txt3,padding:"6px 9px",fontSize:11,borderRadius:7,border:`1px solid ${C.border}`}} title="Refresh">↻</button>
          <div style={{cursor:"pointer",textAlign:"right"}} onClick={()=>setShowPwd(true)}>
            <div style={{fontSize:12,fontWeight:600,color:C.txt}}>{cur.name}</div>
            <div style={{fontSize:9,color:isAdmin?C.purple:C.blue}}>{isAdmin?"ADMIN":"USER"} 🔑</div>
          </div>
          {/* Theme picker */}
          <div style={{position:"relative"}}>
            <button className="btn" onClick={()=>setShowTheme(v=>!v)} style={{background:C.bg3,border:`1px solid ${C.border}`,padding:"6px 10px",borderRadius:7,display:"flex",alignItems:"center",gap:6}}>
              <span style={{width:10,height:10,borderRadius:"50%",background:C.blue,display:"inline-block",boxShadow:`0 0 6px ${C.blue}88`}}/>
              <span style={{fontSize:10,color:C.txt2,fontWeight:600,letterSpacing:"0.05em"}}>THEME</span>
            </button>
            {showTheme&&<div onClick={()=>setShowTheme(false)} style={{position:"fixed",inset:0,zIndex:499}}/>}
            {showTheme&&(
              <div style={{position:"absolute",top:"calc(100% + 6px)",right:0,background:C.bg0,border:`1px solid ${C.border2}`,borderRadius:12,padding:8,zIndex:500,display:"flex",flexDirection:"column",gap:4,minWidth:160,boxShadow:`0 8px 32px ${C.bg0}`}}>
                <div style={{fontSize:9,color:C.txt3,letterSpacing:"0.12em",fontWeight:700,padding:"2px 8px 6px"}}>SELECT THEME</div>
                {Object.entries(THEMES).map(([k,t])=>(
                  <button key={k} onClick={()=>{setThemeKey(k);setShowTheme(false);}} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:8,border:`1.5px solid ${themeKey===k?t.dot:"transparent"}`,background:themeKey===k?t.dot+"22":"transparent",cursor:"pointer",width:"100%",textAlign:"left"}}>
                    <span style={{width:16,height:16,borderRadius:"50%",background:t.dot,flexShrink:0,boxShadow:themeKey===k?`0 0 8px ${t.dot}99`:"none"}}/>
                    <span style={{fontSize:12,fontWeight:themeKey===k?700:500,color:themeKey===k?t.dot:C.txt2}}>{t.name}</span>
                    {themeKey===k&&<span style={{marginLeft:"auto",fontSize:11,color:t.dot}}>✓</span>}
                  </button>
                ))}
              </div>
            )}
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
            <button className="btn" onClick={()=>{setLocForm({...EMPTY_LOC,sales_id:cur.id});setEditLocMode(false);setShowLocForm(true);}} style={{background:`linear-gradient(135deg,${C.blue},${C.indigo})`,color:"#fff",padding:"9px 14px",fontSize:12,borderRadius:8,flexShrink:0}}>+ New Deal</button>
          </div>
          <FilterBar filters={filters} setFilters={setFilters} users={users} isAdmin={isAdmin}/>
          <div style={{padding:"6px 12px",borderBottom:`1px solid ${C.border}`,flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:11,color:C.txt3}}>{filtered.length} {filters.showLocs?"locations":"companies"}</span>
            <button className="btn" onClick={()=>setFilters({...filters,showLocs:!filters.showLocs})} style={{background:filters.showLocs?`${C.indigo}22`:C.bg3,color:filters.showLocs?C.purple:C.txt3,padding:"4px 10px",fontSize:10,borderRadius:6,border:`1px solid ${filters.showLocs?C.indigo+"44":C.border}`}}>
              {filters.showLocs?"📍 All locations":"🏢 By company"}
            </button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"10px 12px",display:"flex",flexDirection:"column",gap:8}}>
            {filtered.length===0&&<div style={{padding:48,textAlign:"center",color:C.txt3,fontSize:14}}>No results found</div>}
            {filtered.map(item=>{
              if(item._type==="hq"){
                const hqLocs=locs.filter(l=>l.parent_id===item.id);
                const totalW=hqLocs.reduce((s,l)=>s+(parseInt(l.workers)||0),0);
                const won=hqLocs.filter(l=>l.stage==="Closed Won").length;
                const stages=[...new Set(hqLocs.map(l=>l.stage))].slice(0,3);
                const hasLate=hqLocs.some(l=>isOD(l.next_action,l.stage));
                return(
                  <div key={item.id} className="card" onClick={()=>setSelHQ(item)} style={{padding:"13px 14px",borderLeft:`3px solid ${C.indigo}`,cursor:"pointer"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <div style={{flex:1,minWidth:0,paddingRight:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                          <span style={{fontSize:11,color:C.indigo}}>🏢</span>
                          <span style={{fontWeight:700,fontSize:15,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.company}</span>
                        </div>
                        <div style={{fontSize:11,color:C.txt3}}>{item.central_contact}{item.central_role?` · ${item.central_role}`:""}</div>
                      </div>
                      {hasLate&&<span className="pill" style={{background:`${C.red}18`,color:C.red,border:`1px solid ${C.red}44`,flexShrink:0}}>⚠</span>}
                    </div>
                    <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                      <span className="pill" style={{background:`${C.blue}18`,color:C.blue2,border:`1px solid ${C.blue}33`}}>📍 {hqLocs.length} loc.</span>
                      {totalW>0&&<span className="pill" style={{background:`${C.amber}18`,color:C.amber,border:`1px solid ${C.amber}33`}}>👷 {totalW} workers</span>}
                      {won>0&&<span className="pill" style={{background:`${C.green}18`,color:C.green,border:`1px solid ${C.green}33`}}>✓ {won} won</span>}
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                      {stages.map(s=>{const c=SC[s]||C.txt3;return <span key={s} className="pill" style={{background:c+"18",color:c,border:`1px solid ${c}33`,fontSize:9}}>{s}</span>;})}
                      {hqLocs.length===0&&<span style={{fontSize:11,color:C.txt3,fontStyle:"italic"}}>No locations yet</span>}
                    </div>
                  </div>
                );
              }else{
                const sc=SC[item.stage]||C.txt3;const od=isOD(item.next_action,item.stage);const dl=daysLeft(item.next_action);
                const parentHQ=hqs.find(h=>h.id===item.parent_id);
                return(
                  <div key={item.id} className="card" onClick={()=>setSelLoc(item)} style={{padding:"12px 14px",borderLeft:`3px solid ${sc}`,cursor:"pointer"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                      <div style={{flex:1,minWidth:0,paddingRight:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:1}}>
                          <span style={{fontSize:10,color:C.purple}}>📍</span>
                          <span style={{fontWeight:600,fontSize:14,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.location}</span>
                        </div>
                        <div style={{fontSize:11,color:C.txt3}}>{parentHQ?<span style={{color:C.indigo}}>{parentHQ.company} · </span>:""}{item.contact} · <span style={{color:C.blue}}>{uN(item.sales_id)}</span></div>
                      </div>
                      <span style={{fontSize:16,flexShrink:0}}>{item.temp}</span>
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
                      <span className="pill" style={{background:sc+"22",color:sc,border:`1px solid ${sc}44`}}>{item.stage}</span>
                      {item.service&&<span className="pill" style={{background:`${C.blue}18`,color:C.blue2,border:`1px solid ${C.blue}33`}}>{item.service}</span>}
                      {item.company_name&&<span className="pill" style={{background:`${C.teal}18`,color:C.teal,border:`1px solid ${C.teal}33`}}>{item.company_name}</span>}
                      <span className="pill" style={{background:item.workers?`${C.amber}18`:`${C.txt3}18`,color:item.workers?C.amber:C.txt3,border:`1px solid ${item.workers?C.amber:C.txt3}33`}}>👷 {item.workers||"TBD"}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.txt3}}>
                      <span>{item.county} · {item.industry}</span>
                      <span style={{color:od?C.red:(dl!==null&&dl<=3)?C.amber:C.txt3,fontWeight:(od||(dl!==null&&dl<=3))?600:400}}>{od?"⚠ ":""}{fmtDate(item.next_action)}{(!od&&dl!==null&&dl<=3)?" ("+dl+"d)":""}</span>
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
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["Companies",kpi.total,C.blue],["Locations",kpi.locs,C.indigo],["Workers Placed",kpi.placed,C.green],["Pipeline Workers",kpi.pipe,C.amber],["Conversion %",kpi.conv+"%",C.teal],["Overdue ⚠",kpi.late,C.red]].map(([l,v,c])=>(
              <div key={l} style={{background:C.bg2,border:`1px solid ${C.border}`,borderTop:`3px solid ${c}`,padding:13,textAlign:"center",borderRadius:10}}>
                <div style={{fontSize:26,fontWeight:700,color:c,fontFamily:"'Space Grotesk',sans-serif"}}>{v}</div>
                <div style={{fontSize:10,color:C.txt3,marginTop:4}}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:14}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:11,color:C.txt3,letterSpacing:"0.08em",marginBottom:12}}>DEAL FUNNEL (locations)</div>
            {STAGES.map(s=>{const n=kpi.byStage[s]||0;const p=kpi.locs?Math.round(n/kpi.locs*100):0;const c=SC[s]||C.txt3;return(<div key={s} style={{marginBottom:9}}><div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}><span style={{color:c,fontWeight:500}}>{s}</span><span style={{color:C.txt3}}>{n}</span></div><div style={{background:C.bg4,height:5,borderRadius:3}}><div style={{background:c,height:5,borderRadius:3,width:p+"%",transition:"width 0.5s"}}/></div></div>);})}
          </div>
          <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:14}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:11,color:C.txt3,letterSpacing:"0.08em",marginBottom:12}}>BY SALESPERSON</div>
            {users.filter(u=>u.active).map(u=>{const ul=locs.filter(l=>l.sales_id===u.id);const uw=ul.filter(l=>l.stage==="Closed Won");return(<div key={u.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${C.border}`}}><div><div style={{fontWeight:600,fontSize:13,color:C.txt}}>{u.name}</div><div style={{fontSize:11,color:C.txt3}}>{ul.length} deals · {uw.length} won</div></div><div style={{textAlign:"right"}}><div style={{fontSize:18,fontWeight:700,color:C.green,fontFamily:"'Space Grotesk',sans-serif"}}>{uw.reduce((s,l)=>s+(parseInt(l.workers)||0),0)}</div><div style={{fontSize:10,color:C.txt3}}>placed</div></div></div>);})}
          </div>
        </div>
      )}

      {/* ── TEMPLATES ── */}
      {tab==="tpl"&&(
        <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:15,color:C.txt}}>Day 1 — Cold Email</div>
          <div><div className="lbl">SUBJECT</div><div style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:"11px 13px",fontSize:13,color:C.txt2,fontWeight:500}}>Workforce solution for [COMPANY] — fast & complete</div></div>
          <div><div className="lbl">CONTENT</div><div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:8,padding:13,fontSize:13,color:C.txt2,lineHeight:1.9,whiteSpace:"pre-wrap"}}>{"Dear [NAME],\n\nMy name is [YOUR NAME] and I represent Gremi Personal / Antforce SRL, specialists in recruiting Ukrainian blue-collar workers for Romanian manufacturers.\n\nWhat we offer:\n→ Skilled and unskilled Ukrainian workers\n→ Full management: visas, contracts, accommodation, transport\n→ Zero admin headaches on your side\n\nI'd love 15 minutes to discuss your needs.\n\nBest regards,\n[YOUR NAME] | [PHONE]"}</div></div>
          <div style={{background:`${C.amber}18`,border:`1px solid ${C.amber}44`,borderRadius:8,padding:"11px 13px",fontSize:12,color:C.amber,lineHeight:1.9}}><strong>Replace:</strong> [COMPANY] [NAME] [YOUR NAME] [PHONE]</div>
        </div>
      )}

      {/* ── TEAM ── */}
      {tab==="team"&&isAdmin&&<TeamTab users={users} locs={locs} onSelect={l=>{setSelLoc(l);}}/>}

      {/* HQ DETAIL */}
      {selHQ&&!showLocForm&&!showHQForm&&(
        <HQDetailModal hq={selHQ} locs={locs} users={users} isAdmin={isAdmin}
          onClose={()=>setSelHQ(null)}
          onEditHQ={()=>{setHqForm(selHQ);setShowHQForm(true);}}
          onDeleteHQ={()=>deleteHQ(selHQ.id)}
          onAddLoc={()=>{setLocForm({...EMPTY_LOC,parent_id:selHQ.id,company:selHQ.company,sales_id:cur.id});setEditLocMode(false);setShowLocForm(true);}}
          onSelectLoc={l=>setSelLoc(l)}
        />
      )}

      {/* LOC DETAIL */}
      {selLoc&&!showLocForm&&(
        <LocDetailModal loc={selLoc} hqs={hqs} users={users} isAdmin={isAdmin}
          onClose={()=>setSelLoc(null)}
          onEdit={()=>{setLocForm(selLoc);setEditLocMode(true);setShowLocForm(true);}}
          onDelete={()=>deleteLoc(selLoc.id)}
          onUpdate={updLoc}
          onNewOrder={()=>{
            setLocForm({
              ...EMPTY_LOC,
              parent_id:selLoc.parent_id,
              company:selLoc.company,
              location:selLoc.location,
              address:selLoc.address||"",
              contact:selLoc.contact,
              role:selLoc.role,
              phone:selLoc.phone,
              email:selLoc.email,
              county:selLoc.county,
              industry:selLoc.industry,
              employees:selLoc.employees,
              service:selLoc.service,
              company_name:selLoc.company_name,
              sales_id:selLoc.sales_id||cur.id,
              stage:"New",
              temp:"❄️ Cold",
            });
            setEditLocMode(false);setShowLocForm(true);
          }}
        />
      )}

      {/* LOC FORM */}
      {showLocForm&&(
        <LocFormModal form={locForm} setForm={setLocForm} onSave={saveLoc}
          onClose={()=>{setShowLocForm(false);setEditLocMode(false);}}
          editMode={editLocMode} users={users} isAdmin={isAdmin} hqs={hqs}/>
      )}

      {/* HQ FORM */}
      {showHQForm&&(
        <HQFormModal form={hqForm} setForm={setHqForm} onSave={saveHQ} onClose={()=>setShowHQForm(false)}/>
      )}

      {showAdmin&&isAdmin&&<AdminPanel users={users} setUsers={setUsers} cur={cur} onClose={()=>setShowAdmin(false)}/>}
      {showPwd&&<ChangePwdModal cur={cur} users={users} setUsers={setUsers} setCur={setCur} isAdmin={isAdmin} onClose={()=>setShowPwd(false)}/>}
    </div>
  );
}
