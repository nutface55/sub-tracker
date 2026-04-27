// SubTrack — Data Layer
// shared globals: SUBS, RATES, BUDGET, TODAY, STATE, CATEGORIES, PALETTE

window.PALETTE = [
  "#5E6AD2","#F24E1E","#1a1a1a","#6e7761","#D4A27F","#0572EC",
  "#1aa3ff","#1DB954","#37352F","#FF0000","#F36020","#296DC1",
  "#FF6363","#3a3a3a","#E60023","#cf3232","#10A37F","#a76bfa"
];

window.CATEGORIES = [
  { id:"dev",           label:"dev",           bg:"#EEEEFF", fg:"#3D45C5" },
  { id:"work",          label:"work",          bg:"#EFF6FF", fg:"#1D67C7" },
  { id:"personal",      label:"personal",      bg:"#F0FDF4", fg:"#166534" },
  { id:"entertainment", label:"entertainment", bg:"#FFF7ED", fg:"#C2410C" },
  { id:"finance",       label:"finance",       bg:"#FFFBEB", fg:"#92400E" },
  { id:"health",        label:"health",        bg:"#FDF2F6", fg:"#9D174D" },
  { id:"other",         label:"other",         bg:"#F5F5F3", fg:"#57574F" },
];

window.CURRENCY_BASE = { THB:1, USD:36.2, EUR:39.1, GBP:45.6, SGD:26.9, JPY:0.24 };

window.TODAY = new Date();

window.SUBS   = [];
window.RATES  = { ...CURRENCY_BASE };
window.BUDGET = 0;
window.STATE  = { filter:"all", query:"", catFilter:"", view:"list", dark:false, sortCol:"monthly", sortDir:"desc" };

// ── helpers ───────────────────────────────────────────────────────────
window.uid        = () => "s"+Math.random().toString(36).slice(2,9);
window.escapeHTML = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
window.parseDate  = str => { const [y,m,d]=str.split("-").map(Number); return new Date(y,m-1,d); };
window.toISO      = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
window.daysBetween= (a,b) => Math.round((b-a)/66400000);
window.fmtDate    = d => { const M=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"]; return `${M[d.getMonth()]} ${String(d.getDate()).padStart(2,"0")}`; };
window.relDate    = d => { const n=daysBetween(TODAY,d); if(n<0)return`${-n}d ago`; if(n===0)return"today"; if(n===1)return"tomorrow"; if(n<30)return`in ${n}d`; if(n<365)return`in ${Math.round(n/30)}mo`; return`in ${Math.round(n/365)}y`; };
window.fmtRaw     = n => { const v=Math.round(n*100)/100; return (v%1===0?v.toFixed(0):v.toFixed(2)); };
window.fmt        = n => "฿"+fmtRaw(n);
window.toTHB      = (cost,cur) => cost*(RATES[cur]||1);
window.monthlyTHB = s => toTHB(s.cycle==="monthly"?s.cost:s.cost/12, s.currency||"THB")/(s.splitWith||1);
window.annualTHB  = s => toTHB(s.cycle==="annual"?s.cost:s.cost*12, s.currency||"THB")/(s.splitWith||1);
window.catById    = id => CATEGORIES.find(c=>c.id===id)||null;
// returns true if card expiry (MM/YY) is before the renewal date
window.cardExpiresBefore = (expiry, renewsISO) => {
  if (!expiry || !renewsISO) return false;
  const m = expiry.match(/^(\d{1,2})\/(\d{2,4})$/);
  if (!m) return false;
  const month = parseInt(m[1],10)-1;
  const year  = parseInt(m[2],10) + (m[2].length===2 ? 2000 : 0);
  // card is valid through the last day of the expiry month
  const cardEnd = new Date(year, month+1, 0); // last day of month
  return cardEnd < parseDate(renewsISO);
};
window.visibleSubs = () => {
  let list = SUBS.slice();
  if(STATE.filter==="active") list=list.filter(s=>s.status==="active");
  if(STATE.filter==="paused") list=list.filter(s=>s.status==="paused");
  if(STATE.catFilter) list=list.filter(s=>s.category===STATE.catFilter);
  if(STATE.query.trim()){const q=STATE.query.trim().toLowerCase();list=list.filter(s=>s.name.toLowerCase().includes(q)||(s.plan||"").toLowerCase().includes(q));}
  const dir = STATE.sortDir==="asc" ? 1 : -1;
  list.sort((a,b)=>{
    switch(STATE.sortCol){
      case "name":    return dir*(a.name.localeCompare(b.name));
      case "cycle":   return dir*(a.cycle.localeCompare(b.cycle));
      case "annual":  return dir*(annualTHB(a)-annualTHB(b));
      case "renew":   return dir*(parseDate(a.renews)-parseDate(b.renews));
      case "card":    return dir*((a.cardExpiry||"").localeCompare(b.cardExpiry||""));
      default:        return dir*(monthlyTHB(a)-monthlyTHB(b)); // "monthly"
    }
  });
  return list;
};

// ── user key (sync identity) ──────────────────────────────────────────
// Returns the stored passcode, or null if not set yet.
window.getUserKey = () => {
  const k = localStorage.getItem("subtrack.userkey") || "";
  // treat UUIDs (old format) as "not set" so passcode screen appears
  return (k && !k.includes("-")) ? k : null;
};

window.showPasscodeScreen = () => {
  const screen = document.getElementById("passcode-screen");
  if (!screen) return;
  screen.classList.remove("hidden");
  setTimeout(() => document.getElementById("pc-input").focus(), 60);

  document.getElementById("pc-submit").onclick = submitPasscode;
  document.getElementById("pc-input").addEventListener("keydown", e => {
    if (e.key === "Enter") submitPasscode();
    // block non-numeric keys (allow backspace, tab, arrows)
    if (!/^\d$/.test(e.key) && !["Backspace","Delete","Tab","ArrowLeft","ArrowRight"].includes(e.key) && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
    }
  });
  document.getElementById("pc-input").addEventListener("input", e => {
    // clamp to 6 digits
    if (e.target.value.length > 6) e.target.value = e.target.value.slice(0, 6);
    e.target.classList.remove("invalid");
    document.getElementById("pc-err").textContent = "";
  });
};

function submitPasscode() {
  const raw = document.getElementById("pc-input").value.replace(/\D/g,"");
  if (raw.length !== 6) {
    document.getElementById("pc-input").classList.add("invalid");
    document.getElementById("pc-err").textContent = "enter exactly 6 digits";
    return;
  }
  localStorage.setItem("subtrack.userkey", raw);
  document.getElementById("passcode-screen").classList.add("hidden");
  loadState();
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
  card:s.card||"",
  cardExpiry:s.cardExpiry||"",
  priceHistory:s.priceHistory||[],
});

// ── auto-advance renewals ─────────────────────────────────────────────
// For active subs whose renewal date has passed, bump forward by the
// billing cycle until it's in the future. Returns true if anything changed.
window.autoAdvanceRenewals = () => {
  let changed = false;
  SUBS.forEach(s => {
    if (s.status !== "active" || !s.renews) return;
    let d = parseDate(s.renews);
    if (d >= TODAY) return;
    while (d < TODAY) {
      if (s.cycle === "annual") {
        d = new Date(d.getFullYear() + 1, d.getMonth(), d.getDate());
      } else {
        d = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
      }
    }
    s.renews = toISO(d);
    changed = true;
  });
  return changed;
};

// write to localStorage immediately, push to server debounced
let _syncTimer;
window.persist = () => {
  const payload = { subs:SUBS, rates:RATES, budget:BUDGET, dark:STATE.dark };
  try { localStorage.setItem("subtrack.v2", JSON.stringify(payload)); } catch {}
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => {
    fetch("/api/data?key=" + getUserKey(), {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(payload),
    }).catch(() => {}); // silent — localStorage already saved
  }, 600);
};

// load from server; fall back to localStorage then seed
window.loadState = async () => {
  const key = getUserKey();
  if (!key) { showPasscodeScreen(); return; }

  // apply localStorage immediately so UI isn't blank while fetching
  const v2 = localStorage.getItem("subtrack.v2");
  if (v2) {
    try {
      const d = JSON.parse(v2);
      SUBS = d.subs.map(normSub); RATES = {...CURRENCY_BASE,...d.rates};
      BUDGET = d.budget||0; STATE.dark = !!d.dark;
    } catch {}
  }
  if (STATE.dark) document.getElementById("root").setAttribute("data-dark","1");
  renderAll();

  // fetch from server and re-render with latest data
  try {
    const res = await fetch("/api/data?key=" + key);
    if (!res.ok) throw new Error();
    const d = await res.json();
    if (d.fresh && !v2) {
      SUBS = SEED_DATA.map(normSub);
    } else if (!d.fresh) {
      SUBS   = (d.subs||[]).map(normSub);
      RATES  = {...CURRENCY_BASE,...(d.rates||{})};
      BUDGET = d.budget||0;
      STATE.dark = !!d.dark;
      try { localStorage.setItem("subtrack.v2", JSON.stringify({subs:SUBS,rates:RATES,budget:BUDGET,dark:STATE.dark})); } catch {}
    }
  } catch {
    if (!v2) SUBS = SEED_DATA.map(normSub);
  }

  if (autoAdvanceRenewals()) persist(); // save bumped dates immediately

  if (STATE.dark) document.getElementById("root").setAttribute("data-dark","1");
  else document.getElementById("root").removeAttribute("data-dark");
  renderAll();
  renderSyncKey();
};

// show passcode (masked) in footer; click to change
window.renderSyncKey = () => {
  const el = document.getElementById("sync-key-display");
  if (!el) return;
  el.textContent = "passcode: ••••••••";
  el.title = "click to change passcode";
  el.style.cursor = "pointer";
  el.onclick = () => {
    const input = prompt("Enter a new 6-digit passcode:\n(changing this will switch you to a different data set)");
    if (input === null) return;
    const raw = input.replace(/\D/g,"");
    if (raw.length !== 6) { alert("Please enter exactly 6 digits."); return; }
    localStorage.setItem("subtrack.userkey", raw);
    localStorage.removeItem("subtrack.v2");
    flashMsg("passcode changed — reloading…");
    setTimeout(() => location.reload(), 600);
  };
};

// ── seed ──────────────────────────────────────────────────────────────
window.SEED_DATA = [
  {name:"Linear",       plan:"standard",     cycle:"monthly",cost:10,   color:"#5E6AD2",status:"active",renews:"2026-04-29",category:"dev",          currency:"USD"},
  {name:"Figma",        plan:"professional", cycle:"annual", cost:160,  color:"#F24E1E",status:"active",renews:"2026-04-30",category:"dev",          currency:"USD"},
  {name:"Vercel",       plan:"pro",          cycle:"monthly",cost:20,   color:"#111111",status:"active",renews:"2026-05-01",category:"dev",          currency:"USD"},
  {name:"GitHub",       plan:"team",         cycle:"annual", cost:46,   color:"#6e7761",status:"active",renews:"2026-09-12",category:"dev",          currency:"USD"},
  {name:"Anthropic",    plan:"max",          cycle:"monthly",cost:100,  color:"#D4A27F",status:"active",renews:"2026-05-06",category:"dev",          currency:"USD"},
  {name:"1Password",    plan:"families",     cycle:"annual", cost:60,   color:"#0572EC",status:"active",renews:"2026-11-02",category:"personal",     currency:"USD"},
  {name:"iCloud+",      plan:"200gb",        cycle:"monthly",cost:2.99, color:"#1aa3ff",status:"active",renews:"2026-05-14",category:"personal",     currency:"USD"},
  {name:"Spotify",      plan:"duo",          cycle:"monthly",cost:14.99,color:"#1DB954",status:"active",renews:"2026-05-03",category:"entertainment",currency:"USD"},
  {name:"Notion",       plan:"plus",         cycle:"annual", cost:96,   color:"#37352F",status:"paused",renews:"2026-06-01",category:"work",         currency:"USD"},
  {name:"Adobe CC",     plan:"photo",        cycle:"monthly",cost:11.99,color:"#FF0000",status:"active",renews:"2026-05-19",category:"work",         currency:"USD"},
  {name:"Cloudflare",   plan:"pro",          cycle:"monthly",cost:25,   color:"#F36020",status:"active",renews:"2026-05-22",category:"dev",          currency:"USD"},
  {name:"Fastmail",     plan:"standard",     cycle:"annual", cost:50,   color:"#296DC1",status:"active",renews:"2026-07-04",category:"personal",     currency:"USD"},
  {name:"Raycast",      plan:"pro",          cycle:"monthly",cost:6,    color:"#FF6363",status:"active",renews:"2026-04-30",category:"dev",          currency:"USD"},
  {name:"NYT",          plan:"all-access",   cycle:"annual", cost:220,  color:"#3a3a3a",status:"paused",renews:"2026-12-19",category:"entertainment",currency:"USD"},
  {name:"Backblaze",    plan:"personal",     cycle:"annual", cost:99,   color:"#E60023",status:"active",renews:"2026-06-30",category:"personal",     currency:"USD"},
  {name:"Hetzner VPS",  plan:"cx22",         cycle:"monthly",cost:4.59, color:"#cf3232",status:"active",renews:"2026-05-11",category:"dev",          currency:"EUR"},
  {name:"ChatGPT",      plan:"plus",         cycle:"monthly",cost:20,   color:"#10A37F",status:"paused",renews:"2026-05-15",category:"dev",          currency:"USD"},
  {name:"Domain·oat.sh",plan:"registrar",    cycle:"annual", cost:13,   color:"#a76bfa",status:"active",renews:"2026-10-06",category:"dev",          currency:"USD",splitWith:2},
];
