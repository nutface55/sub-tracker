// SubTrack — Data Layer
// shared globals: SUBS, RATES, BUDGET, TODAY, STATE, CATEGORIES, PALETTE

window.PALETTE = [
  "#5E6AD2","#F24E1E","#1a1a1a","#6e7781","#D4A27F","#0572EC",
  "#1aa3ff","#1DB954","#37352F","#FF0000","#F38020","#296DC1",
  "#FF6363","#3a3a3a","#E60023","#cf3232","#10A37F","#a78bfa"
];

window.CATEGORIES = [
  { id:"dev",           label:"dev",           bg:"#EEEEFF", fg:"#3D45C5" },
  { id:"work",          label:"work",          bg:"#EFF6FF", fg:"#1D67C7" },
  { id:"personal",      label:"personal",      bg:"#F0FDF4", fg:"#166534" },
  { id:"entertainment", label:"entertainment", bg:"#FFF7ED", fg:"#C2410C" },
  { id:"finance",       label:"finance",       bg:"#FFFBEB", fg:"#92400E" },
  { id:"health",        label:"health",        bg:"#FDF2F8", fg:"#9D174D" },
  { id:"other",         label:"other",         bg:"#F5F5F3", fg:"#57574F" },
];

window.CURRENCY_BASE = { THB:1, USD:36.2, EUR:39.1, GBP:45.8, SGD:26.9, JPY:0.24 };

window.TODAY = new Date();

window.SUBS   = [];
window.RATES  = { ...CURRENCY_BASE };
window.BUDGET = 0;
window.STATE  = { filter:"all", query:"", catFilter:"", view:"list", dark:false };

// ── helpers ───────────────────────────────────────────────────────────
window.uid        = () => "s"+Math.random().toString(36).slice(2,9);
window.escapeHTML = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
window.parseDate  = str => { const [y,m,d]=str.split("-").map(Number); return new Date(y,m-1,d); };
window.toISO      = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
window.daysBetween= (a,b) => Math.round((b-a)/86400000);
window.fmtDate    = d => { const M=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"]; return `${M[d.getMonth()]} ${String(d.getDate()).padStart(2,"0")}`; };
window.relDate    = d => { const n=daysBetween(TODAY,d); if(n<0)return`${-n}d ago`; if(n===0)return"today"; if(n===1)return"tomorrow"; if(n<30)return`in ${n}d`; if(n<365)return`in ${Math.round(n/30)}mo`; return`in ${Math.round(n/365)}y`; };
window.fmtRaw     = n => { const v=Math.round(n*100)/100; return (v%1===0?v.toFixed(0):v.toFixed(2)); };
window.fmt        = n => "฿"+fmtRaw(n);
window.toTHB      = (cost,cur) => cost*(RATES[cur]||1);
window.monthlyTHB = s => toTHB(s.cycle==="monthly"?s.cost:s.cost/12, s.currency||"THB")/(s.splitWith||1);
window.annualTHB  = s => toTHB(s.cycle==="annual"?s.cost:s.cost*12, s.currency||"THB")/(s.splitWith||1);
window.catById    = id => CATEGORIES.find(c=>c.id===id)||null;
window.visibleSubs = () => {
  let list = SUBS.slice();
  if(STATE.filter==="active") list=list.filter(s=>s.status==="active");
  if(STATE.filter==="paused") list=list.filter(s=>s.status==="paused");
  if(STATE.catFilter) list=list.filter(s=>s.category===STATE.catFilter);
  if(STATE.query.trim()){const q=STATE.query.trim().toLowerCase();list=list.filter(s=>s.name.toLowerCase().includes(q)||(s.plan||"").toLowerCase().includes(q));}
  list.sort((a,b)=>monthlyTHB(b)-monthlyTHB(a));
  return list;
};

// ── persistence ───────────────────────────────────────────────────────
window.normSub = s => ({
  id:s.id||uid(), name:s.name||"", plan:s.plan||"",
  cycle:s.cycle||"monthly", cost:Number(s.cost)||0,
  color:s.color||PALETTE[0], status:s.status||"active",
  renews:s.renews||toISO(new Date()),
  category:s.category||"", notes:s.notes||"",
  trial:!!s.trial, trialEnds:s.trialEnds||"",
  reminder:Number(s.reminder)||0,
  splitWith:Number(s.splitWith)||1,
  currency:s.currency||"THB",
  priceHistory:s.priceHistory||[],
});

window.persist = () => {
  try { localStorage.setItem("subtrack.v2",JSON.stringify({subs:SUBS,rates:RATES,budget:BUDGET,dark:STATE.dark})); } catch {}
};

window.loadState = () => {
  const v2=localStorage.getItem("subtrack.v2"), v1=localStorage.getItem("subtrack.v1");
  try {
    if(v2){ const d=JSON.parse(v2); SUBS=d.subs.map(normSub); RATES={...CURRENCY_BASE,...d.rates}; BUDGET=d.budget||0; STATE.dark=!!d.dark; }
    else if(v1){ SUBS=JSON.parse(v1).map(s=>normSub({...s,currency:"USD"})); }
    else { SUBS=SEED_DATA.map(normSub); }
  } catch { SUBS=SEED_DATA.map(normSub); }
  if(STATE.dark) document.getElementById("root").dataset.dark="1";
};

// ── seed ──────────────────────────────────────────────────────────────
window.SEED_DATA = [
  {name:"Linear",       plan:"standard",     cycle:"monthly",cost:10,   color:"#5E6AD2",status:"active",renews:"2026-04-29",category:"dev",          currency:"USD"},
  {name:"Figma",        plan:"professional", cycle:"annual", cost:180,  color:"#F24E1E",status:"active",renews:"2026-04-30",category:"dev",          currency:"USD"},
  {name:"Vercel",       plan:"pro",          cycle:"monthly",cost:20,   color:"#111111",status:"active",renews:"2026-05-01",category:"dev",          currency:"USD"},
  {name:"GitHub",       plan:"team",         cycle:"annual", cost:48,   color:"#6e7781",status:"active",renews:"2026-09-12",category:"dev",          currency:"USD"},
  {name:"Anthropic",    plan:"max",          cycle:"monthly",cost:100,  color:"#D4A27F",status:"active",renews:"2026-05-08",category:"dev",          currency:"USD"},
  {name:"1Password",    plan:"families",     cycle:"annual", cost:60,   color:"#0572EC",status:"active",renews:"2026-11-02",category:"personal",     currency:"USD"},
  {name:"iCloud+",      plan:"200gb",        cycle:"monthly",cost:2.99, color:"#1aa3ff",status:"active",renews:"2026-05-14",category:"personal",     currency:"USD"},
  {name:"Spotify",      plan:"duo",          cycle:"monthly",cost:14.99,color:"#1DB954",status:"active",renews:"2026-05-03",category:"entertainment",currency:"USD"},
  {name:"Notion",       plan:"plus",         cycle:"annual", cost:96,   color:"#37352F",status:"paused",renews:"2026-08-01",category:"work",         currency:"USD"},
  {name:"Adobe CC",     plan:"photo",        cycle:"monthly",cost:11.99,color:"#FF0000",status:"active",renews:"2026-05-19",category:"work",         currency:"USD"},
  {name:"Cloudflare",   plan:"pro",          cycle:"monthly",cost:25,   color:"#F38020",status:"active",renews:"2026-05-22",category:"dev",          currency:"USD"},
  {name:"Fastmail",     plan:"standard",     cycle:"annual", cost:50,   color:"#296DC1",status:"active",renews:"2026-07-04",category:"personal",     currency:"USD"},
  {name:"Raycast",      plan:"pro",          cycle:"monthly",cost:8,    color:"#FF6363",status:"active",renews:"2026-04-30",category:"dev",          currency:"USD"},
  {name:"NYT",          plan:"all-access",   cycle:"annual", cost:220,  color:"#3a3a3a",status:"paused",renews:"2026-12-19",category:"entertainment",currency:"USD"},
  {name:"Backblaze",    plan:"personal",     cycle:"annual", cost:99,   color:"#E60023",status:"active",renews:"2026-06-30",category:"personal",     currency:"USD"},
  {name:"Hetzner VPS",  plan:"cx22",         cycle:"monthly",cost:4.59, color:"#cf3232",status:"active",renews:"2026-05-11",category:"dev",          currency:"EUR"},
  {name:"ChatGPT",      plan:"plus",         cycle:"monthly",cost:20,   color:"#10A37F",status:"paused",renews:"2026-05-15",category:"dev",          currency:"USD"},
  {name:"Domain·oat.sh",plan:"registrar",    cycle:"annual", cost:13,   color:"#a78bfa",status:"active",renews:"2026-10-08",category:"dev",          currency:"USD",splitWith:2},
];
